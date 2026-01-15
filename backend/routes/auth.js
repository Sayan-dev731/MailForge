import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readDB, writeDB, findInDB, addToDB, updateInDB } from '../utils/database.js';
import { encrypt, decrypt, generateId } from '../utils/helpers.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_change_this';

// Signup - Create new user
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const users = readDB('users');
        const existingUser = users.find(u => u.email === email);

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = {
            id: generateId(),
            name: name || email.split('@')[0],
            email,
            password: hashedPassword,
            role: users.length === 0 ? 'admin' : 'user',
            createdAt: new Date().toISOString(),
        };

        addToDB('users', user);

        res.json({
            success: true,
            message: 'Account created successfully'
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Signup failed'
        });
    }
});

// Register/Login (simplified - auto-create admin on first run)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password required'
            });
        }

        const users = readDB('users');
        let user = users.find(u => u.email === email);

        // First time login - create admin account
        if (users.length === 0) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user = {
                id: generateId(),
                email,
                password: hashedPassword,
                role: 'admin',
                createdAt: new Date().toISOString(),
            };
            addToDB('users', user);
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// Get SMTP settings
router.get('/smtp', authenticateToken, (req, res) => {
    try {
        const settings = readDB('settings');
        const userSettings = settings[req.user.id];

        if (!userSettings || !userSettings.smtp) {
            return res.json({
                success: true,
                smtp: null
            });
        }

        // Return settings without decrypted password
        res.json({
            success: true,
            smtp: {
                email: userSettings.smtp.email,
                senderName: userSettings.smtp.senderName,
                hasPassword: !!userSettings.smtp.password,
            },
        });
    } catch (error) {
        console.error('Get SMTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get SMTP settings'
        });
    }
});

// Save SMTP settings
router.post('/smtp', authenticateToken, (req, res) => {
    try {
        const { email, password, senderName } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and App Password required'
            });
        }

        // Encrypt password
        const encryptedPassword = encrypt(password);

        const settings = readDB('settings');
        settings[req.user.id] = {
            ...settings[req.user.id],
            smtp: {
                email,
                password: encryptedPassword,
                senderName: senderName || email,
                updatedAt: new Date().toISOString(),
            },
        };

        writeDB('settings', settings);

        res.json({
            success: true,
            message: 'SMTP settings saved successfully',
        });
    } catch (error) {
        console.error('Save SMTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save SMTP settings'
        });
    }
});

// Get decrypted SMTP for internal use
export function getDecryptedSMTP(userId) {
    try {
        const settings = readDB('settings');
        const userSettings = settings[userId];

        if (!userSettings || !userSettings.smtp) {
            return null;
        }

        return {
            email: userSettings.smtp.email,
            password: decrypt(userSettings.smtp.password),
            senderName: userSettings.smtp.senderName,
        };
    } catch (error) {
        console.error('Get decrypted SMTP error:', error);
        return null;
    }
}

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

export default router;
