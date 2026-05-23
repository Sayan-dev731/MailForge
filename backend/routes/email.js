import express from "express";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EventEmitter } from "events";
import { authenticateToken, authenticateSSE } from "../middleware/auth.js";
import { getDecryptedSMTP } from "./auth.js";
import { readDB, updateInDB } from "../utils/database.js";
import {
    validateEmail,
    generateId,
    sanitizeFilename,
} from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CERTIFICATES_DIR = path.join(__dirname, "..", "certificates");

// Ensure certificates directory exists
if (!fs.existsSync(CERTIFICATES_DIR)) {
    fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });
}

const router = express.Router();

// In-memory store for campaign sending progress (avoids DB writes that trigger nodemon restarts)
const sendingProgress = new Map();

// Real-time event bus for live progress / log streaming via SSE.
// One emitter, one channel per campaign id: `campaign:<id>`.
const campaignEvents = new EventEmitter();
campaignEvents.setMaxListeners(0);

// Push a structured log entry into the campaign's rolling log buffer and
// broadcast it to any connected SSE clients. Also mirrors to stdout.
function pushLog(campaignId, level, message) {
    const entry = {
        ts: new Date().toISOString(),
        level, // 'info' | 'success' | 'warn' | 'error'
        message,
    };
    const progress = sendingProgress.get(campaignId);
    if (progress) {
        if (!progress.logs) progress.logs = [];
        progress.logs.push(entry);
        // Keep buffer bounded
        if (progress.logs.length > 500)
            progress.logs.splice(0, progress.logs.length - 500);
    }
    const tag =
        level === "error"
            ? "✗"
            : level === "success"
              ? "✓"
              : level === "warn"
                ? "!"
                : "·";
    console.log(`[Campaign ${campaignId}] ${tag} ${message}`);
    campaignEvents.emit(`campaign:${campaignId}`, { type: "log", entry });
}

// Broadcast a progress snapshot (totals + last few results) to SSE clients.
function broadcastProgress(campaignId) {
    const snapshot = sendingProgress.get(campaignId);
    if (!snapshot) return;
    campaignEvents.emit(`campaign:${campaignId}`, {
        type: "progress",
        status: snapshot.status,
        stats: snapshot.stats,
        // Send only the tail of results to keep the SSE frame small.
        recent: (snapshot.results || []).slice(-20),
    });
}

// Build nodemailer transport config from a saved SMTP record.
// Works for any provider: Gmail, Outlook/Office 365, Zoho, Yahoo, iCloud,
// SendGrid, Mailgun, Brevo, AWS SES, custom self-hosted SMTP, etc.
function buildTransportConfig(smtp) {
    return {
        host: smtp.host,
        port: smtp.port,
        // true = implicit TLS (port 465); false = STARTTLS (port 587/25)
        secure: !!smtp.secure,
        auth: {
            user: smtp.username || smtp.email,
            pass: smtp.password,
        },
        // Some providers (Office365, custom) advertise STARTTLS on 587
        requireTLS: !smtp.secure && smtp.port !== 25,
        tls: {
            // Reject self-signed certs by default for security
            rejectUnauthorized: true,
        },
    };
}

// Provider-aware throttle config to respect each provider's published limits.
// Tuned for the Outlook/Office365 "432 4.3.2 Concurrent connections limit exceeded"
// error reported in production (Microsoft caps shared-tenant SMTP AUTH at ~3 concurrent
// connections and ~30 messages/minute).
function getThrottleConfig(smtp) {
    const host = (smtp.host || "").toLowerCase();

    // Outlook / Microsoft 365 / Hotmail — very restrictive
    if (
        host.includes("office365") ||
        host.includes("outlook") ||
        host.includes("hotmail")
    ) {
        return {
            label: "Outlook/Microsoft 365",
            maxConnections: 1,
            maxMessages: 50,
            rateLimit: 1, // 1 message per rateDelta window
            rateDelta: 2500, // → ~24 msg/min, safely under the 30/min cap
            batchSize: 1,
            batchDelayMs: 1500,
        };
    }

    if (host.includes("gmail") || host.includes("googlemail")) {
        return {
            label: "Gmail",
            maxConnections: 3,
            maxMessages: 100,
            rateLimit: 5,
            rateDelta: 1000,
            batchSize: 3,
            batchDelayMs: 1500,
        };
    }

    if (host.includes("yahoo") || host.includes("aol")) {
        return {
            label: "Yahoo/AOL",
            maxConnections: 2,
            maxMessages: 50,
            rateLimit: 3,
            rateDelta: 1000,
            batchSize: 2,
            batchDelayMs: 2000,
        };
    }

    if (host.includes("zoho")) {
        return {
            label: "Zoho",
            maxConnections: 2,
            maxMessages: 100,
            rateLimit: 5,
            rateDelta: 1000,
            batchSize: 2,
            batchDelayMs: 1500,
        };
    }

    if (host.includes("icloud") || host.includes("mail.me.com")) {
        return {
            label: "iCloud",
            maxConnections: 1,
            maxMessages: 50,
            rateLimit: 2,
            rateDelta: 1500,
            batchSize: 1,
            batchDelayMs: 2000,
        };
    }

    // Transactional providers — much higher limits
    if (
        host.includes("sendgrid") ||
        host.includes("mailgun") ||
        host.includes("brevo") ||
        host.includes("sendinblue") ||
        host.includes("amazonaws") ||
        host.includes("postmark")
    ) {
        return {
            label: "Transactional",
            maxConnections: 10,
            maxMessages: 200,
            rateLimit: 20,
            rateDelta: 1000,
            batchSize: 10,
            batchDelayMs: 250,
        };
    }

    // Unknown / custom — conservative default
    return {
        label: "Custom",
        maxConnections: 2,
        maxMessages: 100,
        rateLimit: 5,
        rateDelta: 1000,
        batchSize: 2,
        batchDelayMs: 1500,
    };
}

// SMTP error codes that are worth retrying with backoff (transient).
// 4xx codes mean "try again later". 432 = concurrency limit, 421 = service unavailable,
// 450/451/452 = mailbox/system busy. Also includes common transport-level errors.
function isTransientSmtpError(error) {
    if (!error) return false;
    const code = error.responseCode;
    if (code && code >= 400 && code < 500) return true;
    return [
        "ETIMEDOUT",
        "ECONNRESET",
        "ECONNECTION",
        "ESOCKET",
        "EAI_AGAIN",
    ].includes(error.code);
}

// Helper to get live progress
function getLiveProgress(campaignId) {
    return sendingProgress.get(campaignId) || null;
}

// Helper to set live progress (merges with existing snapshot so logs survive)
function setLiveProgress(campaignId, progress) {
    const existing = sendingProgress.get(campaignId) || {};
    const merged = {
        ...existing,
        ...progress,
        logs: progress.logs || existing.logs || [],
    };
    sendingProgress.set(campaignId, merged);
    broadcastProgress(campaignId);
}

// Helper to clear progress after completion
function clearLiveProgress(campaignId) {
    sendingProgress.delete(campaignId);
}

// Check SMTP configuration status
router.get("/smtp-status", authenticateToken, (req, res) => {
    try {
        const smtp = getDecryptedSMTP(req.user.id);
        res.json({
            success: true,
            configured: !!smtp,
            email: smtp?.email || null,
            senderName: smtp?.senderName || null,
            provider: smtp?.provider || null,
            host: smtp?.host || null,
            port: smtp?.port || null,
        });
    } catch (error) {
        console.error("SMTP status check error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to check SMTP status",
        });
    }
});

// Verify SMTP credentials without sending an email
router.post("/test-connection", authenticateToken, async (req, res) => {
    try {
        const { host, port, secure, email, username, password } = req.body;

        // Allow testing either an ad-hoc payload (during setup) or the saved config
        let smtp;
        if (host && port && email && password) {
            const portNum = parseInt(port, 10);
            smtp = {
                host: String(host).trim(),
                port: portNum,
                secure: typeof secure === "boolean" ? secure : portNum === 465,
                email,
                username: username || email,
                password,
                senderName: email,
            };
        } else {
            smtp = getDecryptedSMTP(req.user.id);
            if (!smtp) {
                return res.status(400).json({
                    success: false,
                    message: "SMTP not configured yet.",
                });
            }
        }

        const transporter = nodemailer.createTransport(
            buildTransportConfig(smtp),
        );
        await transporter.verify();
        transporter.close();

        res.json({
            success: true,
            message: `Connected to ${smtp.host}:${smtp.port} successfully`,
        });
    } catch (error) {
        console.error("SMTP test-connection error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message || "SMTP connection failed",
            code: error.code,
        });
    }
});

// Send test email
router.post("/test", authenticateToken, async (req, res) => {
    try {
        const { to, subject, body } = req.body;

        if (!to || !subject || !body) {
            return res.status(400).json({
                success: false,
                message: "Recipient, subject, and body required",
            });
        }

        const smtp = getDecryptedSMTP(req.user.id);
        if (!smtp) {
            return res.status(400).json({
                success: false,
                message:
                    "SMTP not configured. Please configure your email provider in Settings.",
            });
        }

        const transporter = nodemailer.createTransport(
            buildTransportConfig(smtp),
        );

        await transporter.sendMail({
            from: `${smtp.senderName} <${smtp.email}>`,
            to,
            subject,
            html: body,
        });

        res.json({
            success: true,
            message: "Test email sent successfully",
        });
    } catch (error) {
        console.error("Test email error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to send test email",
        });
    }
});

// Send bulk emails for campaign
router.post("/send-bulk/:campaignId", authenticateToken, async (req, res) => {
    try {
        const { campaignId } = req.params;
        const campaigns = readDB("campaigns");
        const campaign = campaigns.find(
            (c) => c.id === campaignId && c.userId === req.user.id,
        );

        if (!campaign) {
            console.error(
                `Campaign ${campaignId} not found for user ${req.user.id}`,
            );
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        // Prevent duplicate sends - check if already sending
        if (campaign.status === "sending") {
            console.log(
                `Campaign ${campaignId} is already sending, ignoring duplicate request`,
            );
            return res.status(400).json({
                success: false,
                message:
                    "Campaign is already being sent. Please wait for it to complete.",
            });
        }

        console.log(`Campaign found:`, {
            id: campaign.id,
            name: campaign.name,
            recipientCount: campaign.recipients?.length,
            hasEmailTemplate: !!campaign.emailTemplate,
            emailField: campaign.emailField,
        });

        // Validate campaign data
        if (!campaign.recipients || campaign.recipients.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No recipients found in campaign",
            });
        }

        if (
            !campaign.emailTemplate ||
            !campaign.emailTemplate.subject ||
            !campaign.emailTemplate.body
        ) {
            return res.status(400).json({
                success: false,
                message: "Email template is incomplete",
            });
        }

        const smtp = getDecryptedSMTP(req.user.id);
        if (!smtp) {
            console.error(`SMTP not configured for user ${req.user.id}`);
            return res.status(400).json({
                success: false,
                message:
                    "SMTP not configured. Please configure your email provider in Settings.",
            });
        }

        console.log(
            `SMTP configured for ${smtp.email}, starting email send...`,
        );

        // Start sending in background
        res.json({
            success: true,
            message: "Bulk email sending started",
            campaignId,
        });

        // Send emails asynchronously
        sendBulkEmails(campaign, smtp, req.user.id).catch((error) => {
            console.error(
                `Fatal error in sendBulkEmails for campaign ${campaign.id}:`,
                error,
            );
        });
    } catch (error) {
        console.error("Bulk email error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to start bulk sending",
        });
    }
});

// Generate certificate PDF for a recipient
async function generateCertificatePDF(recipient, template) {
    return new Promise((resolve, reject) => {
        try {
            const certificateId = generateId();

            // Helper function to replace template variables with recipient data
            const replaceVariables = (text) => {
                if (!text) return text;
                let result = text;
                Object.keys(recipient).forEach((key) => {
                    const regex = new RegExp(`{{${key}}}`, "gi");
                    result = result.replace(regex, recipient[key] || "");
                });
                return result;
            };

            // Get recipient name - check for common field names or template variable
            let recipientName =
                recipient.name ||
                recipient.Name ||
                recipient.full_name ||
                recipient.fullName ||
                recipient.attendee_first_name ||
                recipient.first_name ||
                "Recipient";

            // Also replace any template variables in template fields
            const achievementText = replaceVariables(
                template?.achievementText ||
                    "has successfully completed the program",
            );
            const eventName = replaceVariables(
                template?.eventName || recipient.event || recipient.Event || "",
            );
            const dateStr =
                replaceVariables(template?.dateText) ||
                recipient.date ||
                recipient.Date ||
                new Date().toLocaleDateString();

            const filename = sanitizeFilename(
                `certificate_${recipientName}_${certificateId}.pdf`,
            );
            const outputPath = path.join(CERTIFICATES_DIR, filename);

            console.log(
                `[Certificate] Generating for: ${recipientName}, Event: ${eventName || "N/A"}`,
            );

            // PRIORITY: Use dimensions from frontend template (they are already correct from upload)
            let canvasWidth = template?.canvasSize?.width || template?.width;
            let canvasHeight = template?.canvasSize?.height || template?.height;

            console.log(
                `[Certificate] Template dimensions from frontend: ${canvasWidth}x${canvasHeight}`,
            );

            // Parse background image buffer
            let imageBuffer = null;
            if (
                template?.backgroundImage &&
                template.backgroundImage.startsWith("data:image")
            ) {
                try {
                    const base64Match = template.backgroundImage.match(
                        /^data:image\/(\w+);base64,(.+)$/,
                    );
                    if (base64Match) {
                        imageBuffer = Buffer.from(base64Match[2], "base64");

                        // Only use image-size if template dimensions are missing
                        if (!canvasWidth || !canvasHeight) {
                            try {
                                const sizeOf = require("image-size");
                                const dimensions = sizeOf(imageBuffer);
                                if (dimensions.width && dimensions.height) {
                                    canvasWidth = dimensions.width;
                                    canvasHeight = dimensions.height;
                                    console.log(
                                        `[Certificate] Detected image dimensions: ${canvasWidth}x${canvasHeight}`,
                                    );
                                }
                            } catch (sizeError) {
                                console.log(
                                    `[Certificate] Could not detect image dimensions`,
                                );
                            }
                        }
                    }
                } catch (err) {
                    console.error(
                        `[Certificate] Image parsing error:`,
                        err.message,
                    );
                }
            }

            // Fallback to default dimensions
            canvasWidth = canvasWidth || 800;
            canvasHeight = canvasHeight || 600;

            const isLandscape = canvasWidth > canvasHeight;
            console.log(
                `[Certificate] FINAL PDF dimensions: ${canvasWidth}x${canvasHeight} (${isLandscape ? "LANDSCAPE" : "PORTRAIT"})`,
            );

            // Create PDF with EXACT dimensions - NO layout option to avoid conflicts
            const doc = new PDFDocument({
                size: [canvasWidth, canvasHeight],
                margin: 0,
                autoFirstPage: false, // We'll add the page manually with exact size
            });

            // Add single page with exact dimensions
            doc.addPage({
                size: [canvasWidth, canvasHeight],
                margin: 0,
            });

            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            // Draw background image to fill entire page
            if (imageBuffer) {
                try {
                    // Place image at 0,0 - let it fill the page naturally
                    doc.image(imageBuffer, 0, 0, {
                        width: doc.page.width,
                        height: doc.page.height,
                    });
                    console.log(
                        `[Certificate] ✓ Background image drawn (${doc.page.width}x${doc.page.height})`,
                    );
                } catch (bgError) {
                    console.error(
                        `[Certificate] Background image error:`,
                        bgError.message,
                    );
                    // Fallback to solid color
                    doc.rect(0, 0, doc.page.width, doc.page.height).fill(
                        template?.backgroundColor || "#ffffff",
                    );
                }
            } else {
                // Fallback: solid white background - NO borders for clean output
                doc.rect(0, 0, doc.page.width, doc.page.height).fill("#ffffff");
            }

            // If template has elements (from Konva canvas), draw them
            if (template?.elements && template.elements.length > 0) {
                // Draw text elements from canvas
                for (const element of template.elements) {
                    if (element.type === "text" && element.text) {
                        let textContent = replaceVariables(element.text);
                        doc.fontSize(element.fontSize || 24)
                            .fillColor(element.fill || "#000000")
                            .font(
                                element.fontStyle?.includes("bold")
                                    ? "Helvetica-Bold"
                                    : "Helvetica",
                            )
                            .text(
                                textContent,
                                element.x - (element.offsetX || 0),
                                element.y,
                                {
                                    width: element.width || 400,
                                    align: element.align || "left",
                                },
                            );
                    }
                }
                // Certificate ID at bottom
                doc.fontSize(10)
                    .fillColor("#95a5a6")
                    .text(
                        `Certificate ID: ${certificateId}`,
                        50,
                        doc.page.height - 40,
                        {
                            align: "center",
                            width: doc.page.width - 100,
                        },
                    );
            } else {
                // Fallback: Use old style if no elements defined

                // Title
                const titleText = replaceVariables(
                    template?.titleText || "CERTIFICATE OF COMPLETION",
                );
                doc.fontSize(template?.titleFontSize || 36)
                    .fillColor(template?.titleColor || "#2c3e50")
                    .font("Helvetica-Bold")
                    .text(titleText, 50, 100, {
                        align: "center",
                        width: doc.page.width - 100,
                    });

                // Subtitle
                const subtitleText = replaceVariables(
                    template?.subtitleText || "This is to certify that",
                );
                doc.fontSize(16)
                    .fillColor("#7f8c8d")
                    .font("Helvetica")
                    .text(subtitleText, 50, 180, {
                        align: "center",
                        width: doc.page.width - 100,
                    });

                // Recipient name
                doc.fontSize(template?.nameFontSize || 42)
                    .fillColor(template?.nameColor || "#3498db")
                    .font("Helvetica-Bold")
                    .text(recipientName, 50, template?.nameY || 230, {
                        align: "center",
                        width: doc.page.width - 100,
                    });

                // Achievement text
                doc.fontSize(14)
                    .fillColor("#2c3e50")
                    .font("Helvetica")
                    .text(achievementText, 50, 300, {
                        align: "center",
                        width: doc.page.width - 100,
                    });

                // Event name if exists
                if (eventName) {
                    doc.fontSize(20)
                        .fillColor(template?.eventColor || "#e74c3c")
                        .font("Helvetica-Bold")
                        .text(eventName, 50, 340, {
                            align: "center",
                            width: doc.page.width - 100,
                        });
                }

                // Date
                doc.fontSize(12)
                    .fillColor("#7f8c8d")
                    .font("Helvetica")
                    .text(`Date: ${dateStr}`, 50, 420, {
                        align: "center",
                        width: doc.page.width - 100,
                    });

                // Certificate ID
                doc.fontSize(10)
                    .fillColor("#95a5a6")
                    .text(
                        `Certificate ID: ${certificateId}`,
                        50,
                        doc.page.height - 80,
                        {
                            align: "center",
                            width: doc.page.width - 100,
                        },
                    );
            } // End of else block for old-style certificate

            doc.end();

            stream.on("finish", () => {
                resolve({
                    path: outputPath,
                    filename: filename,
                });
            });

            stream.on("error", (err) => {
                reject(err);
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Background bulk email sender with provider-aware throttling and retry.
async function sendBulkEmails(campaign, smtp, userId) {
    const throttle = getThrottleConfig(smtp);

    // Seed an empty progress snapshot first so log events can attach.
    setLiveProgress(campaign.id, {
        status: "sending",
        stats: {
            total: campaign.recipients.length,
            sent: 0,
            failed: 0,
            pending: campaign.recipients.length,
        },
        results: [],
        logs: [],
        throttle: { label: throttle.label, batchSize: throttle.batchSize },
    });

    pushLog(
        campaign.id,
        "info",
        `═══ Starting campaign "${campaign.name}" ═══`,
    );
    pushLog(
        campaign.id,
        "info",
        `Recipients: ${campaign.recipients.length} · SMTP user: ${smtp.email}`,
    );
    pushLog(
        campaign.id,
        "info",
        `Provider profile: ${throttle.label} (batch=${throttle.batchSize}, maxConn=${throttle.maxConnections}, rate=${throttle.rateLimit}/${throttle.rateDelta}ms)`,
    );

    let transporter;
    try {
        pushLog(
            campaign.id,
            "info",
            `Connecting to ${smtp.host}:${smtp.port} (secure=${smtp.secure})…`,
        );
        transporter = nodemailer.createTransport({
            ...buildTransportConfig(smtp),
            pool: true,
            maxConnections: throttle.maxConnections,
            maxMessages: throttle.maxMessages,
            rateDelta: throttle.rateDelta,
            rateLimit: throttle.rateLimit,
        });
        await transporter.verify();
        pushLog(campaign.id, "success", `SMTP connection verified`);
    } catch (error) {
        pushLog(
            campaign.id,
            "error",
            `SMTP connection failed: ${error.message}`,
        );
        updateInDB("campaigns", campaign.id, {
            status: "failed",
            stats: {
                total: campaign.recipients.length,
                sent: 0,
                failed: campaign.recipients.length,
                pending: 0,
            },
            results: [
                {
                    email: "N/A",
                    status: "failed",
                    error: `SMTP connection failed: ${error.message}`,
                },
            ],
            updatedAt: new Date().toISOString(),
        });
        // Notify SSE listeners that we're done so they close the stream.
        campaignEvents.emit(`campaign:${campaign.id}`, {
            type: "done",
            status: "failed",
        });
        return;
    }

    let sent = 0;
    let failed = 0;
    const results = [];
    const emailField = campaign.emailField || "email";
    const hasCertificate = !!campaign.certificateTemplate;

    const BATCH_SIZE = throttle.batchSize;
    const BATCH_DELAY_MS = throttle.batchDelayMs;
    const MAX_RETRIES = 3;

    pushLog(
        campaign.id,
        "info",
        `Email field: "${emailField}"${hasCertificate ? " \u00b7 certificates: ON" : ""}`,
    );

    // Function to send a single email (with transient-error retry)
    const sendSingleEmail = async (recipient) => {
        const recipientEmail = recipient[emailField];

        try {
            // Validate email
            if (!validateEmail(recipientEmail)) {
                pushLog(
                    campaign.id,
                    "error",
                    `Invalid email skipped: ${recipientEmail}`,
                );
                return {
                    email: recipientEmail,
                    status: "failed",
                    error: "Invalid email",
                };
            }

            // Replace variables in template
            let emailBody = campaign.emailTemplate.body;
            let emailSubject = campaign.emailTemplate.subject;

            Object.keys(recipient).forEach((key) => {
                const regex = new RegExp(`{{${key}}}`, "g");
                emailBody = emailBody.replace(regex, recipient[key] || "");
                emailSubject = emailSubject.replace(
                    regex,
                    recipient[key] || "",
                );
            });

            // Wrap email body in proper HTML structure if not already wrapped
            if (
                !emailBody.toLowerCase().includes("<!doctype") &&
                !emailBody.toLowerCase().includes("<html")
            ) {
                emailBody = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    ${emailBody}
</body>
</html>`;
            }

            // Prepare email options
            const mailOptions = {
                from: `${smtp.senderName} <${smtp.email}>`,
                to: recipientEmail,
                subject: emailSubject,
                html: emailBody,
            };

            // Generate and attach certificate if template exists
            let certificatePath = null;
            if (hasCertificate) {
                try {
                    console.log(
                        `[Campaign ${campaign.id}] Generating certificate for ${recipientEmail}...`,
                    );
                    const cert = await generateCertificatePDF(
                        recipient,
                        campaign.certificateTemplate,
                    );
                    certificatePath = cert.path;
                    mailOptions.attachments = [
                        {
                            filename: cert.filename,
                            path: cert.path,
                            contentType: "application/pdf",
                        },
                    ];
                    pushLog(
                        campaign.id,
                        "info",
                        `Certificate ready for ${recipientEmail} (${cert.filename})`,
                    );
                } catch (certError) {
                    pushLog(
                        campaign.id,
                        "warn",
                        `Certificate generation failed for ${recipientEmail}: ${certError.message}`,
                    );
                    // Continue without certificate
                }
            }

            // Send with retry on transient SMTP errors (e.g. Outlook 432 concurrency)
            let lastError;
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    await transporter.sendMail(mailOptions);
                    if (attempt > 1) {
                        pushLog(
                            campaign.id,
                            "success",
                            `Sent → ${recipientEmail} (recovered on attempt ${attempt})`,
                        );
                    } else {
                        pushLog(
                            campaign.id,
                            "success",
                            `Sent → ${recipientEmail}`,
                        );
                    }
                    return {
                        email: recipientEmail,
                        status: "sent",
                        certificatePath: certificatePath
                            ? `/certificates/${path.basename(certificatePath)}`
                            : null,
                    };
                } catch (error) {
                    lastError = error;
                    if (attempt < MAX_RETRIES && isTransientSmtpError(error)) {
                        const backoff =
                            Math.min(15000, 1000 * Math.pow(2, attempt)) +
                            Math.floor(Math.random() * 500);
                        pushLog(
                            campaign.id,
                            "warn",
                            `Transient error for ${recipientEmail} (${error.responseCode || error.code || "ERR"}): ${error.message} — retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
                        );
                        await new Promise((r) => setTimeout(r, backoff));
                        continue;
                    }
                    throw error;
                }
            }
            throw lastError;
        } catch (error) {
            pushLog(
                campaign.id,
                "error",
                `Failed → ${recipientEmail}: ${error.message}`,
            );
            return {
                email: recipientEmail,
                status: "failed",
                error: error.message,
            };
        }
    };

    // Process recipients in batches
    pushLog(
        campaign.id,
        "info",
        `Starting batch processing (batch size = ${BATCH_SIZE})…`,
    );
    try {
        for (let i = 0; i < campaign.recipients.length; i += BATCH_SIZE) {
            // Check if campaign was stopped
            const currentCampaigns = readDB("campaigns");
            const currentCampaign = currentCampaigns.find(
                (c) => c.id === campaign.id,
            );
            if (currentCampaign?.status === "stopped") {
                pushLog(campaign.id, "warn", `Campaign stopped by user`);
                break;
            }

            const batch = campaign.recipients.slice(i, i + BATCH_SIZE);
            const batchNo = Math.floor(i / BATCH_SIZE) + 1;
            pushLog(
                campaign.id,
                "info",
                `Batch ${batchNo}: sending ${batch.length} email(s) (${i + 1}-${Math.min(i + BATCH_SIZE, campaign.recipients.length)} of ${campaign.recipients.length})`,
            );

            // Send batch concurrently
            const batchResults = await Promise.all(
                batch.map((recipient) => sendSingleEmail(recipient)),
            );

            // Update counters
            batchResults.forEach((result) => {
                if (result.status === "sent") sent++;
                else failed++;
                results.push(result);
            });

            // Update live progress + broadcast to SSE clients
            setLiveProgress(campaign.id, {
                status: "sending",
                stats: {
                    total: campaign.recipients.length,
                    sent,
                    failed,
                    pending: campaign.recipients.length - sent - failed,
                },
                results,
            });

            pushLog(
                campaign.id,
                "info",
                `Progress: ✓ ${sent} sent · ✗ ${failed} failed · … ${campaign.recipients.length - sent - failed} pending`,
            );

            // Delay between batches to respect provider rate limits
            if (i + BATCH_SIZE < campaign.recipients.length) {
                await new Promise((resolve) =>
                    setTimeout(resolve, BATCH_DELAY_MS),
                );
            }
        }
    } catch (error) {
        pushLog(
            campaign.id,
            "error",
            `Fatal error during sending: ${error.message}`,
        );
    }

    // Close transporter
    if (transporter) {
        transporter.close();
    }

    // Check if campaign was stopped (read from DB to check for stop requests)
    const finalCampaigns = readDB("campaigns");
    const finalCampaign = finalCampaigns.find((c) => c.id === campaign.id);
    const wasStopped = finalCampaign?.status === "stopped";
    const finalStatus = wasStopped ? "stopped" : "completed";

    // Persist final results (single DB write at the end)
    if (!wasStopped) {
        updateInDB("campaigns", campaign.id, {
            status: "completed",
            stats: {
                total: campaign.recipients.length,
                sent,
                failed,
                pending: 0,
            },
            results,
            completedAt: new Date().toISOString(),
        });
    } else {
        updateInDB("campaigns", campaign.id, {
            stats: {
                total: campaign.recipients.length,
                sent,
                failed,
                pending: campaign.recipients.length - sent - failed,
            },
            results,
        });
    }

    pushLog(
        campaign.id,
        finalStatus === "completed" ? "success" : "warn",
        `\u2550\u2550\u2550 ${wasStopped ? "Stopped" : "Completed"}: ${sent} sent \u00b7 ${failed} failed \u2550\u2550\u2550`,
    );

    // Notify SSE clients first, then drop the in-memory snapshot.
    campaignEvents.emit(`campaign:${campaign.id}`, {
        type: "done",
        status: finalStatus,
        stats: {
            total: campaign.recipients.length,
            sent,
            failed,
            pending: campaign.recipients.length - sent - failed,
        },
    });

    // Give SSE clients a brief window to receive the 'done' event before clearing.
    setTimeout(() => clearLiveProgress(campaign.id), 5000);
}

// Resend to failed recipients only
router.post(
    "/resend-failed/:campaignId",
    authenticateToken,
    async (req, res) => {
        try {
            const { campaignId } = req.params;
            const campaigns = readDB("campaigns");
            const campaign = campaigns.find(
                (c) => c.id === campaignId && c.userId === req.user.id,
            );

            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: "Campaign not found",
                });
            }

            // Get only failed recipients
            const failedResults =
                campaign.results?.filter((r) => r.status === "failed") || [];
            const emailField = campaign.emailField || "email";
            const failedEmails = failedResults.map((r) => r.email);
            const failedRecipients = campaign.recipients.filter((r) =>
                failedEmails.includes(r[emailField]),
            );

            if (failedRecipients.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No failed recipients to resend",
                });
            }

            const smtp = getDecryptedSMTP(req.user.id);
            if (!smtp) {
                return res.status(400).json({
                    success: false,
                    message: "SMTP not configured",
                });
            }

            // Create modified campaign for resending
            const resendCampaign = {
                ...campaign,
                recipients: failedRecipients,
            };

            // Reset stats for failed recipients only
            updateInDB("campaigns", campaign.id, {
                status: "sending",
                stats: {
                    ...campaign.stats,
                    pending: failedRecipients.length,
                },
            });

            res.json({
                success: true,
                message: `Resending to ${failedRecipients.length} failed recipients`,
                campaignId,
            });

            // Send emails asynchronously
            sendBulkEmails(resendCampaign, smtp, req.user.id);
        } catch (error) {
            console.error("Resend failed error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to resend",
            });
        }
    },
);

// Get campaign status
router.get("/status/:campaignId", authenticateToken, (req, res) => {
    try {
        const campaignId = req.params.campaignId;

        // First check if there's live progress in memory
        const liveProgress = getLiveProgress(campaignId);
        if (liveProgress) {
            return res.json({
                success: true,
                status: "sending",
                stats: liveProgress.stats,
                results: liveProgress.results || [],
                logs: liveProgress.logs || [],
            });
        }

        // Fall back to database for completed/failed campaigns
        const campaigns = readDB("campaigns");
        const campaign = campaigns.find(
            (c) => c.id === campaignId && c.userId === req.user.id,
        );

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        res.json({
            success: true,
            status: campaign.status,
            stats: campaign.stats,
            results: campaign.results || [],
            logs: [],
        });
    } catch (error) {
        console.error("Status error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get status",
        });
    }
});

// Server-Sent Events stream for real-time campaign progress + logs.
// Auth via Authorization header OR ?token=... query string (EventSource cannot set headers).
router.get("/stream/:campaignId", authenticateSSE, (req, res) => {
    const campaignId = req.params.campaignId;

    // Verify ownership before opening the stream
    const campaigns = readDB("campaigns");
    const campaign = campaigns.find(
        (c) => c.id === campaignId && c.userId === req.user.id,
    );
    if (!campaign) {
        res.status(404).end("Campaign not found");
        return;
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // disable nginx proxy buffering
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    const write = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Initial snapshot — either live or final DB state
    const live = getLiveProgress(campaignId);
    if (live) {
        write("snapshot", {
            status: live.status,
            stats: live.stats,
            results: live.results || [],
            logs: live.logs || [],
        });
    } else {
        write("snapshot", {
            status: campaign.status,
            stats: campaign.stats,
            results: campaign.results || [],
            logs: [],
        });
        // If the campaign is already terminal, close immediately.
        if (["completed", "failed", "stopped"].includes(campaign.status)) {
            write("done", { status: campaign.status });
            return res.end();
        }
    }

    const channel = `campaign:${campaignId}`;
    const listener = (payload) => {
        write(payload.type, payload);
        if (payload.type === "done") {
            // Allow the buffered frame to flush, then end the response.
            setTimeout(() => res.end(), 50);
        }
    };
    campaignEvents.on(channel, listener);

    // Heartbeat so proxies / browsers keep the connection open
    const heartbeat = setInterval(() => {
        res.write(": ping\n\n");
    }, 15000);

    const cleanup = () => {
        clearInterval(heartbeat);
        campaignEvents.off(channel, listener);
    };
    req.on("close", cleanup);
    res.on("close", cleanup);
});

// Certificate preview endpoint - generates a sample certificate
router.post("/certificate-preview", authenticateToken, async (req, res) => {
    try {
        const { template, sampleRecipient } = req.body;

        if (!template) {
            return res.status(400).json({
                success: false,
                message: "Certificate template is required",
            });
        }

        // Use sample data or defaults
        const recipient = sampleRecipient || {
            name: "John Doe",
            email: "john@example.com",
            date: new Date().toLocaleDateString(),
        };

        console.log(
            "[Certificate Preview] Generating preview for:",
            recipient.name || "Sample",
        );

        const cert = await generateCertificatePDF(recipient, template);

        // Read the generated PDF and return as base64
        const pdfBuffer = fs.readFileSync(cert.path);
        const base64Pdf = pdfBuffer.toString("base64");

        // Clean up the temp file
        fs.unlinkSync(cert.path);

        res.json({
            success: true,
            pdf: `data:application/pdf;base64,${base64Pdf}`,
            filename: cert.filename,
        });
    } catch (error) {
        console.error("Certificate preview error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate certificate preview",
        });
    }
});

export default router;
