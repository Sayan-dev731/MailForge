import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import campaignRoutes from './routes/campaign.js';
import emailRoutes from './routes/email.js';
import certificateRoutes from './routes/certificate.js';
import { initializeDatabase } from './utils/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize database
initializeDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/certificate', certificateRoutes);

// Static files
app.use('/uploads', express.static('uploads'));
app.use('/certificates', express.static('certificates'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'MailForge AI Backend is running' });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 MailForge AI Backend running on port ${PORT}`);
});
