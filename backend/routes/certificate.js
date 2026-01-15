import express from 'express';
import multer from 'multer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/auth.js';
import { generateId, sanitizeFilename } from '../utils/helpers.js';

const router = express.Router();

// Configure multer for certificate template uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `template-${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PNG and JPG allowed.'));
        }
    },
});

// Upload certificate template
router.post('/template', authenticateToken, upload.single('template'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }

        res.json({
            success: true,
            templatePath: `/uploads/${req.file.filename}`,
            filename: req.file.filename,
        });
    } catch (error) {
        console.error('Template upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload template',
        });
    }
});

// Generate certificate PDF
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { recipient, template } = req.body;

        if (!recipient || !template) {
            return res.status(400).json({
                success: false,
                message: 'Recipient and template required',
            });
        }

        const certificateId = generateId();
        const filename = sanitizeFilename(`certificate_${recipient.name}_${certificateId}.pdf`);
        const outputPath = path.join('certificates', filename);

        // Create PDF
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
        });

        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Add background color or pattern
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8f9fa');

        // Add border
        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
            .lineWidth(3)
            .strokeColor('#2c3e50')
            .stroke();

        // Title
        doc.fontSize(36)
            .fillColor('#2c3e50')
            .font('Helvetica-Bold')
            .text('CERTIFICATE OF COMPLETION', 50, 100, {
                align: 'center',
                width: doc.page.width - 100,
            });

        // Subtitle
        doc.fontSize(16)
            .fillColor('#7f8c8d')
            .font('Helvetica')
            .text('This is to certify that', 50, 180, {
                align: 'center',
                width: doc.page.width - 100,
            });

        // Recipient name (main focus)
        doc.fontSize(template.nameFontSize || 42)
            .fillColor(template.nameColor || '#3498db')
            .font('Helvetica-Bold')
            .text(recipient.name, 50, template.nameY || 230, {
                align: 'center',
                width: doc.page.width - 100,
            });

        // Achievement text
        doc.fontSize(14)
            .fillColor('#2c3e50')
            .font('Helvetica')
            .text(template.achievementText || 'has successfully completed the program', 50, 300, {
                align: 'center',
                width: doc.page.width - 100,
            });

        // Event name
        if (recipient.event) {
            doc.fontSize(20)
                .fillColor('#e74c3c')
                .font('Helvetica-Bold')
                .text(recipient.event, 50, 340, {
                    align: 'center',
                    width: doc.page.width - 100,
                });
        }

        // Date
        doc.fontSize(12)
            .fillColor('#7f8c8d')
            .font('Helvetica')
            .text(`Date: ${recipient.date || new Date().toLocaleDateString()}`, 50, 420, {
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

        doc.end();

        // Wait for PDF to be written
        stream.on('finish', () => {
            res.json({
                success: true,
                certificatePath: `/certificates/${filename}`,
                certificateId,
            });
        });

        stream.on('error', (error) => {
            console.error('PDF generation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate certificate',
            });
        });
    } catch (error) {
        console.error('Generate certificate error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate certificate',
        });
    }
});

// Generate certificates for all recipients
router.post('/generate-bulk', authenticateToken, async (req, res) => {
    try {
        const { recipients, template } = req.body;

        if (!recipients || recipients.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Recipients required',
            });
        }

        const certificates = [];

        for (const recipient of recipients) {
            const certificateId = generateId();
            const filename = sanitizeFilename(`certificate_${recipient.name}_${certificateId}.pdf`);
            const outputPath = path.join('certificates', filename);

            await new Promise((resolve, reject) => {
                const doc = new PDFDocument({
                    size: 'A4',
                    layout: 'landscape',
                });

                const stream = fs.createWriteStream(outputPath);
                doc.pipe(stream);

                // Same PDF generation logic as above
                doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8f9fa');
                doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
                    .lineWidth(3)
                    .strokeColor('#2c3e50')
                    .stroke();

                doc.fontSize(36)
                    .fillColor('#2c3e50')
                    .font('Helvetica-Bold')
                    .text('CERTIFICATE OF COMPLETION', 50, 100, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });

                doc.fontSize(16)
                    .fillColor('#7f8c8d')
                    .font('Helvetica')
                    .text('This is to certify that', 50, 180, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });

                doc.fontSize(template.nameFontSize || 42)
                    .fillColor(template.nameColor || '#3498db')
                    .font('Helvetica-Bold')
                    .text(recipient.name, 50, template.nameY || 230, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });

                doc.fontSize(14)
                    .fillColor('#2c3e50')
                    .font('Helvetica')
                    .text(template.achievementText || 'has successfully completed the program', 50, 300, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });

                if (recipient.event) {
                    doc.fontSize(20)
                        .fillColor('#e74c3c')
                        .font('Helvetica-Bold')
                        .text(recipient.event, 50, 340, {
                            align: 'center',
                            width: doc.page.width - 100,
                        });
                }

                doc.fontSize(12)
                    .fillColor('#7f8c8d')
                    .font('Helvetica')
                    .text(`Date: ${recipient.date || new Date().toLocaleDateString()}`, 50, 420, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });

                doc.fontSize(10)
                    .fillColor('#95a5a6')
                    .text(`Certificate ID: ${certificateId}`, 50, doc.page.height - 80, {
                        align: 'center',
                        width: doc.page.width - 100,
                    });

                doc.end();

                stream.on('finish', () => {
                    certificates.push({
                        recipientEmail: recipient.email,
                        certificatePath: `/certificates/${filename}`,
                        certificateId,
                    });
                    resolve();
                });

                stream.on('error', reject);
            });
        }

        res.json({
            success: true,
            certificates,
        });
    } catch (error) {
        console.error('Bulk certificate generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate certificates',
        });
    }
});

export default router;
