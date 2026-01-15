import express from 'express';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import { getDecryptedSMTP } from './auth.js';
import { readDB, updateInDB } from '../utils/database.js';
import { validateEmail, generateId, sanitizeFilename } from '../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CERTIFICATES_DIR = path.join(__dirname, '..', 'certificates');

// Ensure certificates directory exists
if (!fs.existsSync(CERTIFICATES_DIR)) {
    fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });
}

const router = express.Router();

// In-memory store for campaign sending progress (avoids DB writes that trigger nodemon restarts)
const sendingProgress = new Map();

// Helper to get live progress
function getLiveProgress(campaignId) {
    return sendingProgress.get(campaignId) || null;
}

// Helper to set live progress
function setLiveProgress(campaignId, progress) {
    sendingProgress.set(campaignId, progress);
}

// Helper to clear progress after completion
function clearLiveProgress(campaignId) {
    sendingProgress.delete(campaignId);
}

// Check SMTP configuration status
router.get('/smtp-status', authenticateToken, (req, res) => {
    try {
        const smtp = getDecryptedSMTP(req.user.id);
        res.json({
            success: true,
            configured: !!smtp,
            email: smtp?.email || null,
            senderName: smtp?.senderName || null,
        });
    } catch (error) {
        console.error('SMTP status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check SMTP status',
        });
    }
});

// Send test email
router.post('/test', authenticateToken, async (req, res) => {
    try {
        const { to, subject, body } = req.body;

        if (!to || !subject || !body) {
            return res.status(400).json({
                success: false,
                message: 'Recipient, subject, and body required',
            });
        }

        const smtp = getDecryptedSMTP(req.user.id);
        if (!smtp) {
            return res.status(400).json({
                success: false,
                message: 'SMTP not configured. Please add your Gmail credentials.',
            });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: smtp.email,
                pass: smtp.password,
            },
        });

        await transporter.sendMail({
            from: `${smtp.senderName} <${smtp.email}>`,
            to,
            subject,
            html: body,
        });

        res.json({
            success: true,
            message: 'Test email sent successfully',
        });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send test email',
        });
    }
});

// Send bulk emails for campaign
router.post('/send-bulk/:campaignId', authenticateToken, async (req, res) => {
    try {
        const { campaignId } = req.params;
        const campaigns = readDB('campaigns');
        const campaign = campaigns.find(c => c.id === campaignId && c.userId === req.user.id);

        if (!campaign) {
            console.error(`Campaign ${campaignId} not found for user ${req.user.id}`);
            return res.status(404).json({
                success: false,
                message: 'Campaign not found',
            });
        }

        // Prevent duplicate sends - check if already sending
        if (campaign.status === 'sending') {
            console.log(`Campaign ${campaignId} is already sending, ignoring duplicate request`);
            return res.status(400).json({
                success: false,
                message: 'Campaign is already being sent. Please wait for it to complete.',
            });
        }

        console.log(`Campaign found:`, {
            id: campaign.id,
            name: campaign.name,
            recipientCount: campaign.recipients?.length,
            hasEmailTemplate: !!campaign.emailTemplate,
            emailField: campaign.emailField
        });

        // Validate campaign data
        if (!campaign.recipients || campaign.recipients.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No recipients found in campaign',
            });
        }

        if (!campaign.emailTemplate || !campaign.emailTemplate.subject || !campaign.emailTemplate.body) {
            return res.status(400).json({
                success: false,
                message: 'Email template is incomplete',
            });
        }

        const smtp = getDecryptedSMTP(req.user.id);
        if (!smtp) {
            console.error(`SMTP not configured for user ${req.user.id}`);
            return res.status(400).json({
                success: false,
                message: 'SMTP not configured. Please add your Gmail credentials in Settings.',
            });
        }

        console.log(`SMTP configured for ${smtp.email}, starting email send...`);

        // Start sending in background
        res.json({
            success: true,
            message: 'Bulk email sending started',
            campaignId,
        });

        // Send emails asynchronously
        sendBulkEmails(campaign, smtp, req.user.id).catch(error => {
            console.error(`Fatal error in sendBulkEmails for campaign ${campaign.id}:`, error);
        });
    } catch (error) {
        console.error('Bulk email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start bulk sending',
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
                Object.keys(recipient).forEach(key => {
                    const regex = new RegExp(`{{${key}}}`, 'gi');
                    result = result.replace(regex, recipient[key] || '');
                });
                return result;
            };

            // Get recipient name - check for common field names or template variable
            let recipientName = recipient.name || recipient.Name ||
                recipient.full_name || recipient.fullName ||
                recipient.attendee_first_name || recipient.first_name ||
                'Recipient';

            // Also replace any template variables in template fields
            const achievementText = replaceVariables(template?.achievementText || 'has successfully completed the program');
            const eventName = replaceVariables(template?.eventName || recipient.event || recipient.Event || '');
            const dateStr = replaceVariables(template?.dateText) || recipient.date || recipient.Date || new Date().toLocaleDateString();

            const filename = sanitizeFilename(`certificate_${recipientName}_${certificateId}.pdf`);
            const outputPath = path.join(CERTIFICATES_DIR, filename);

            console.log(`[Certificate] Generating for: ${recipientName}, Event: ${eventName || 'N/A'}`);

            // PRIORITY: Use dimensions from frontend template (they are already correct from upload)
            let canvasWidth = template?.canvasSize?.width || template?.width;
            let canvasHeight = template?.canvasSize?.height || template?.height;

            console.log(`[Certificate] Template dimensions from frontend: ${canvasWidth}x${canvasHeight}`);

            // Parse background image buffer
            let imageBuffer = null;
            if (template?.backgroundImage && template.backgroundImage.startsWith('data:image')) {
                try {
                    const base64Match = template.backgroundImage.match(/^data:image\/(\w+);base64,(.+)$/);
                    if (base64Match) {
                        imageBuffer = Buffer.from(base64Match[2], 'base64');

                        // Only use image-size if template dimensions are missing
                        if (!canvasWidth || !canvasHeight) {
                            try {
                                const sizeOf = require('image-size');
                                const dimensions = sizeOf(imageBuffer);
                                if (dimensions.width && dimensions.height) {
                                    canvasWidth = dimensions.width;
                                    canvasHeight = dimensions.height;
                                    console.log(`[Certificate] Detected image dimensions: ${canvasWidth}x${canvasHeight}`);
                                }
                            } catch (sizeError) {
                                console.log(`[Certificate] Could not detect image dimensions`);
                            }
                        }
                    }
                } catch (err) {
                    console.error(`[Certificate] Image parsing error:`, err.message);
                }
            }

            // Fallback to default dimensions
            canvasWidth = canvasWidth || 800;
            canvasHeight = canvasHeight || 600;

            const isLandscape = canvasWidth > canvasHeight;
            console.log(`[Certificate] FINAL PDF dimensions: ${canvasWidth}x${canvasHeight} (${isLandscape ? 'LANDSCAPE' : 'PORTRAIT'})`);

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
                    console.log(`[Certificate] ✓ Background image drawn (${doc.page.width}x${doc.page.height})`);
                } catch (bgError) {
                    console.error(`[Certificate] Background image error:`, bgError.message);
                    // Fallback to solid color
                    doc.rect(0, 0, doc.page.width, doc.page.height).fill(template?.backgroundColor || '#ffffff');
                }
            } else {
                // Fallback: solid white background - NO borders for clean output
                doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
            }

            // If template has elements (from Konva canvas), draw them
            if (template?.elements && template.elements.length > 0) {
                // Draw text elements from canvas
                for (const element of template.elements) {
                    if (element.type === 'text' && element.text) {
                        let textContent = replaceVariables(element.text);
                        doc.fontSize(element.fontSize || 24)
                            .fillColor(element.fill || '#000000')
                            .font(element.fontStyle?.includes('bold') ? 'Helvetica-Bold' : 'Helvetica')
                            .text(textContent, element.x - (element.offsetX || 0), element.y, {
                                width: element.width || 400,
                                align: element.align || 'left',
                            });
                    }
                }
                // Certificate ID at bottom
                doc.fontSize(10)
                    .fillColor('#95a5a6')
                    .text(`Certificate ID: ${certificateId}`, 50, doc.page.height - 40, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });
            } else {
                // Fallback: Use old style if no elements defined

                // Title
                const titleText = replaceVariables(template?.titleText || 'CERTIFICATE OF COMPLETION');
                doc.fontSize(template?.titleFontSize || 36)
                    .fillColor(template?.titleColor || '#2c3e50')
                    .font('Helvetica-Bold')
                    .text(titleText, 50, 100, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });

                // Subtitle
                const subtitleText = replaceVariables(template?.subtitleText || 'This is to certify that');
                doc.fontSize(16)
                    .fillColor('#7f8c8d')
                    .font('Helvetica')
                    .text(subtitleText, 50, 180, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });

                // Recipient name
                doc.fontSize(template?.nameFontSize || 42)
                    .fillColor(template?.nameColor || '#3498db')
                    .font('Helvetica-Bold')
                    .text(recipientName, 50, template?.nameY || 230, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });

                // Achievement text
                doc.fontSize(14)
                    .fillColor('#2c3e50')
                    .font('Helvetica')
                    .text(achievementText, 50, 300, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });

                // Event name if exists
                if (eventName) {
                    doc.fontSize(20)
                        .fillColor(template?.eventColor || '#e74c3c')
                        .font('Helvetica-Bold')
                        .text(eventName, 50, 340, {
                            align: 'center',
                            width: doc.page.width - 100,
                        });
                }

                // Date
                doc.fontSize(12)
                    .fillColor('#7f8c8d')
                    .font('Helvetica')
                    .text(`Date: ${dateStr}`, 50, 420, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });

                // Certificate ID
                doc.fontSize(10)
                    .fillColor('#95a5a6')
                    .text(`Certificate ID: ${certificateId}`, 50, doc.page.height - 80, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });
            } // End of else block for old-style certificate

            doc.end();

            stream.on('finish', () => {
                resolve({
                    path: outputPath,
                    filename: filename,
                });
            });

            stream.on('error', (err) => {
                reject(err);
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Background bulk email sender with parallel processing
async function sendBulkEmails(campaign, smtp, userId) {
    console.log(`[Campaign ${campaign.id}] ============ STARTING BULK EMAIL SEND ============`);
    console.log(`[Campaign ${campaign.id}] Recipients: ${campaign.recipients.length}, Email field: ${campaign.emailField || 'email'}`);
    console.log(`[Campaign ${campaign.id}] SMTP User: ${smtp.email}`);

    let transporter;
    try {
        console.log(`[Campaign ${campaign.id}] Creating nodemailer transporter...`);
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: smtp.email,
                pass: smtp.password,
            },
            pool: true, // Enable connection pooling
            maxConnections: 5, // Allow up to 5 simultaneous connections
            maxMessages: 100, // Reuse connections for up to 100 messages
            rateDelta: 1000, // Time window for rate limiting
            rateLimit: 10, // Max messages per rateDelta
        });

        // Verify transporter
        console.log(`[Campaign ${campaign.id}] Verifying SMTP connection...`);
        await transporter.verify();
        console.log(`[Campaign ${campaign.id}] ✓ SMTP connection verified successfully`);
    } catch (error) {
        console.error(`[Campaign ${campaign.id}] ✗ SMTP verification FAILED:`, error.message);
        console.error(`[Campaign ${campaign.id}] Full error:`, error);
        updateInDB('campaigns', campaign.id, {
            status: 'failed',
            stats: {
                total: campaign.recipients.length,
                sent: 0,
                failed: campaign.recipients.length,
                pending: 0,
            },
            results: [{
                email: 'N/A',
                status: 'failed',
                error: `SMTP connection failed: ${error.message}`,
            }],
            updatedAt: new Date().toISOString(),
        });
        return;
    }

    let sent = 0;
    let failed = 0;
    const results = [];
    const emailField = campaign.emailField || 'email';
    const hasCertificate = !!campaign.certificateTemplate;

    // Optimized batch settings for 100+ recipients
    const BATCH_SIZE = 5; // Reduced from 10 to prevent Gmail rate limiting
    const BATCH_DELAY_MS = 2000; // 2 second delay between batches for stability
    const SEQUENTIAL_CERTS = true; // Generate certificates sequentially to prevent memory issues

    console.log(`[Campaign ${campaign.id}] Email field: "${emailField}", Has certificate: ${hasCertificate}`);
    console.log(`[Campaign ${campaign.id}] Batch config: size=${BATCH_SIZE}, delay=${BATCH_DELAY_MS}ms, sequential_certs=${SEQUENTIAL_CERTS}`);

    // Mark campaign as sending using in-memory progress (avoids DB write that triggers nodemon restart)
    console.log(`[Campaign ${campaign.id}] Setting initial progress in memory...`);
    setLiveProgress(campaign.id, {
        status: 'sending',
        stats: {
            total: campaign.recipients.length,
            sent: 0,
            failed: 0,
            pending: campaign.recipients.length,
        },
        results: [],
    });
    console.log(`[Campaign ${campaign.id}] ✓ Campaign progress initialized`);

    // Function to send a single email
    const sendSingleEmail = async (recipient) => {
        const recipientEmail = recipient[emailField];
        console.log(`[Campaign ${campaign.id}] Processing recipient: ${recipientEmail}`);

        try {
            // Validate email
            if (!validateEmail(recipientEmail)) {
                console.log(`[Campaign ${campaign.id}] ✗ Invalid email: ${recipientEmail}`);
                return {
                    email: recipientEmail,
                    status: 'failed',
                    error: 'Invalid email',
                };
            }

            // Replace variables in template
            let emailBody = campaign.emailTemplate.body;
            let emailSubject = campaign.emailTemplate.subject;

            Object.keys(recipient).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                emailBody = emailBody.replace(regex, recipient[key] || '');
                emailSubject = emailSubject.replace(regex, recipient[key] || '');
            });

            // Wrap email body in proper HTML structure if not already wrapped
            if (!emailBody.toLowerCase().includes('<!doctype') && !emailBody.toLowerCase().includes('<html')) {
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
                    console.log(`[Campaign ${campaign.id}] Generating certificate for ${recipientEmail}...`);
                    const cert = await generateCertificatePDF(recipient, campaign.certificateTemplate);
                    certificatePath = cert.path;
                    mailOptions.attachments = [{
                        filename: cert.filename,
                        path: cert.path,
                        contentType: 'application/pdf',
                    }];
                    console.log(`[Campaign ${campaign.id}] ✓ Certificate generated: ${cert.filename}`);
                } catch (certError) {
                    console.error(`[Campaign ${campaign.id}] ✗ Certificate generation failed for ${recipientEmail}:`, certError.message);
                    // Continue without certificate
                }
            }

            // Send email
            console.log(`[Campaign ${campaign.id}] Sending email to ${recipientEmail}...`);
            await transporter.sendMail(mailOptions);
            console.log(`[Campaign ${campaign.id}] ✓ Email sent successfully to ${recipientEmail}`);

            return {
                email: recipientEmail,
                status: 'sent',
                certificatePath: certificatePath ? `/certificates/${path.basename(certificatePath)}` : null,
            };
        } catch (error) {
            console.error(`[Campaign ${campaign.id}] ✗ Failed to send to ${recipientEmail}:`, error.message);
            return {
                email: recipientEmail,
                status: 'failed',
                error: error.message,
            };
        }
    };

    // Process recipients in batches
    console.log(`[Campaign ${campaign.id}] Starting batch processing...`);
    try {
        for (let i = 0; i < campaign.recipients.length; i += BATCH_SIZE) {
            // Check if campaign was stopped
            const currentCampaigns = readDB('campaigns');
            const currentCampaign = currentCampaigns.find(c => c.id === campaign.id);
            if (currentCampaign?.status === 'stopped') {
                console.log(`[Campaign ${campaign.id}] Campaign was stopped by user`);
                break;
            }

            const batch = campaign.recipients.slice(i, i + BATCH_SIZE);
            console.log(`[Campaign ${campaign.id}] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}, emails ${i + 1}-${Math.min(i + BATCH_SIZE, campaign.recipients.length)}`);

            // Send batch concurrently
            const batchResults = await Promise.all(
                batch.map(recipient => sendSingleEmail(recipient))
            );

            // Update counters
            batchResults.forEach(result => {
                if (result.status === 'sent') {
                    sent++;
                } else {
                    failed++;
                }
                results.push(result);
            });

            // Update live progress in memory after each batch (no DB write = no nodemon restart)
            setLiveProgress(campaign.id, {
                status: 'sending',
                stats: {
                    total: campaign.recipients.length,
                    sent,
                    failed,
                    pending: campaign.recipients.length - sent - failed,
                },
                results,
            });

            console.log(`[Campaign ${campaign.id}] Progress: ${sent} sent, ${failed} failed, ${campaign.recipients.length - sent - failed} pending`);

            // Delay between batches to respect Gmail rate limits and prevent crashes
            if (i + BATCH_SIZE < campaign.recipients.length) {
                console.log(`[Campaign ${campaign.id}] Waiting ${BATCH_DELAY_MS}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
            }
        }
    } catch (error) {
        console.error(`[Campaign ${campaign.id}] Fatal error during sending:`, error);
    }

    // Close transporter
    if (transporter) {
        transporter.close();
    }

    // Clear live progress from memory
    clearLiveProgress(campaign.id);

    // Check if campaign was stopped (read from DB to check for stop requests)
    const finalCampaigns = readDB('campaigns');
    const finalCampaign = finalCampaigns.find(c => c.id === campaign.id);
    const wasStopped = finalCampaign?.status === 'stopped';

    // NOW write final results to database (only one write at the end)
    console.log(`[Campaign ${campaign.id}] Writing final results to database...`);
    if (!wasStopped) {
        updateInDB('campaigns', campaign.id, {
            status: 'completed',
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
        // Update stats for stopped campaign
        updateInDB('campaigns', campaign.id, {
            stats: {
                total: campaign.recipients.length,
                sent,
                failed,
                pending: campaign.recipients.length - sent - failed,
            },
            results,
        });
    }

    console.log(`[Campaign ${campaign.id}] ✓ ${wasStopped ? 'Stopped' : 'Completed'}: ${sent} sent, ${failed} failed`);
}

// Resend to failed recipients only
router.post('/resend-failed/:campaignId', authenticateToken, async (req, res) => {
    try {
        const { campaignId } = req.params;
        const campaigns = readDB('campaigns');
        const campaign = campaigns.find(c => c.id === campaignId && c.userId === req.user.id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found',
            });
        }

        // Get only failed recipients
        const failedResults = campaign.results?.filter(r => r.status === 'failed') || [];
        const emailField = campaign.emailField || 'email';
        const failedEmails = failedResults.map(r => r.email);
        const failedRecipients = campaign.recipients.filter(r => failedEmails.includes(r[emailField]));

        if (failedRecipients.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No failed recipients to resend',
            });
        }

        const smtp = getDecryptedSMTP(req.user.id);
        if (!smtp) {
            return res.status(400).json({
                success: false,
                message: 'SMTP not configured',
            });
        }

        // Create modified campaign for resending
        const resendCampaign = {
            ...campaign,
            recipients: failedRecipients,
        };

        // Reset stats for failed recipients only
        updateInDB('campaigns', campaign.id, {
            status: 'sending',
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
        console.error('Resend failed error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend',
        });
    }
});

// Get campaign status
router.get('/status/:campaignId', authenticateToken, (req, res) => {
    try {
        const campaignId = req.params.campaignId;

        // First check if there's live progress in memory
        const liveProgress = getLiveProgress(campaignId);
        if (liveProgress) {
            return res.json({
                success: true,
                status: 'sending',
                stats: liveProgress.stats,
                results: liveProgress.results || [],
            });
        }

        // Fall back to database for completed/failed campaigns
        const campaigns = readDB('campaigns');
        const campaign = campaigns.find(c => c.id === campaignId && c.userId === req.user.id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found',
            });
        }

        res.json({
            success: true,
            status: campaign.status,
            stats: campaign.stats,
            results: campaign.results || [],
        });
    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get status',
        });
    }
});

// Certificate preview endpoint - generates a sample certificate
router.post('/certificate-preview', authenticateToken, async (req, res) => {
    try {
        const { template, sampleRecipient } = req.body;

        if (!template) {
            return res.status(400).json({
                success: false,
                message: 'Certificate template is required',
            });
        }

        // Use sample data or defaults
        const recipient = sampleRecipient || {
            name: 'John Doe',
            email: 'john@example.com',
            date: new Date().toLocaleDateString(),
        };

        console.log('[Certificate Preview] Generating preview for:', recipient.name || 'Sample');

        const cert = await generateCertificatePDF(recipient, template);

        // Read the generated PDF and return as base64
        const pdfBuffer = fs.readFileSync(cert.path);
        const base64Pdf = pdfBuffer.toString('base64');

        // Clean up the temp file
        fs.unlinkSync(cert.path);

        res.json({
            success: true,
            pdf: `data:application/pdf;base64,${base64Pdf}`,
            filename: cert.filename,
        });
    } catch (error) {
        console.error('Certificate preview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate certificate preview',
        });
    }
});

export default router;
