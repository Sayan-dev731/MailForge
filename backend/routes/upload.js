import express from 'express';
import multer from 'multer';
import readXlsxFile from 'read-excel-file/node';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/auth.js';
import { generateId } from '../utils/helpers.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel and CSV files allowed.'));
        }
    },
});

// Parse Excel/CSV file
router.post('/parse', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const filePath = req.file.path;
        const fileExt = path.extname(req.file.originalname).toLowerCase();

        let rows = [];
        let headers = [];

        // Parse file based on type
        if (fileExt === '.csv') {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parsed = Papa.parse(fileContent, { header: true });
            rows = parsed.data.filter(row => Object.values(row).some(val => val));
            headers = Object.keys(rows[0] || {});
        } else {
            // Excel file
            const excelRows = await readXlsxFile(filePath);
            if (excelRows.length === 0) {
                fs.unlinkSync(filePath);
                return res.status(400).json({
                    success: false,
                    message: 'File is empty'
                });
            }

            // First row is headers
            headers = excelRows[0].map(h => String(h || ''));

            // Convert remaining rows to objects
            rows = excelRows.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] != null ? String(row[index]) : '';
                });
                return obj;
            }).filter(row => Object.values(row).some(val => val && val.trim()));
        }

        // Check if we have data
        if (rows.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                message: 'File is empty or invalid'
            });
        }

        // Get sample data for each column to help user decide
        const columnSamples = {};
        headers.forEach(header => {
            columnSamples[header] = rows.slice(0, 5).map(row => row[header]);
        });

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            data: {
                headers,
                columnSamples,
                rows: rows, // Send all rows
                totalRows: rows.length,
            },
        });
    } catch (error) {
        console.error('Parse error:', error);
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to parse file'
        });
        throw new Error('Failed to parse AI response');
    }
});
export default router;
