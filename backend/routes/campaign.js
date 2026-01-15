import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { readDB, addToDB, updateInDB, deleteFromDB } from '../utils/database.js';
import { generateId } from '../utils/helpers.js';

const router = express.Router();

// Create new campaign
router.post('/create', authenticateToken, (req, res) => {
    try {
        const { name, recipients, emailTemplate, certificateTemplate, emailField } = req.body;

        if (!name || !recipients || recipients.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Campaign name and recipients required',
            });
        }

        const campaign = {
            id: generateId(),
            userId: req.user.id,
            name,
            recipients,
            emailTemplate,
            certificateTemplate,
            emailField: emailField || 'email', // Store which field contains email
            status: 'draft',
            stats: {
                total: recipients.length,
                sent: 0,
                failed: 0,
                pending: recipients.length,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        addToDB('campaigns', campaign);

        res.json({
            success: true,
            campaign,
        });
    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create campaign',
        });
    }
});

// Get all campaigns
router.get('/list', authenticateToken, (req, res) => {
    try {
        const campaigns = readDB('campaigns');
        const userCampaigns = campaigns
            .filter(c => c.userId === req.user.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            campaigns: userCampaigns,
        });
    } catch (error) {
        console.error('List campaigns error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch campaigns',
        });
    }
});

// Get campaign by ID
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const campaigns = readDB('campaigns');
        const campaign = campaigns.find(c => c.id === req.params.id && c.userId === req.user.id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found',
            });
        }

        res.json({
            success: true,
            campaign,
        });
    } catch (error) {
        console.error('Get campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch campaign',
        });
    }
});

// Update campaign
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const campaigns = readDB('campaigns');
        const campaign = campaigns.find(c => c.id === req.params.id && c.userId === req.user.id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found',
            });
        }

        const updates = {
            ...req.body,
            updatedAt: new Date().toISOString(),
        };

        updateInDB('campaigns', req.params.id, updates);

        res.json({
            success: true,
            message: 'Campaign updated successfully',
        });
    } catch (error) {
        console.error('Update campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update campaign',
        });
    }
});

// Delete campaign
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const campaigns = readDB('campaigns');
        const campaign = campaigns.find(c => c.id === req.params.id && c.userId === req.user.id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found',
            });
        }

        deleteFromDB('campaigns', req.params.id);

        res.json({
            success: true,
            message: 'Campaign deleted successfully',
        });
    } catch (error) {
        console.error('Delete campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete campaign',
        });
    }
});

// Stop a sending campaign
router.post('/:id/stop', authenticateToken, (req, res) => {
    try {
        const campaigns = readDB('campaigns');
        const campaign = campaigns.find(c => c.id === req.params.id && c.userId === req.user.id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found',
            });
        }

        if (campaign.status !== 'sending') {
            return res.status(400).json({
                success: false,
                message: 'Campaign is not currently sending',
            });
        }

        updateInDB('campaigns', req.params.id, {
            status: 'stopped',
            stoppedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        res.json({
            success: true,
            message: 'Campaign stopped successfully',
        });
    } catch (error) {
        console.error('Stop campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to stop campaign',
        });
    }
});

export default router;
