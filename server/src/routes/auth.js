import express from 'express';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Sync/Get current user from Supabase token
 * GET /api/auth/me
 * 
 * This endpoint verifies the Supabase JWT and returns/creates the user in our DB
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = req.user;

        res.json({
            user: {
                id: user.id,
                supabaseId: user.supabaseId,
                email: user.email,
                phone: user.phone,
                name: user.name,
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

/**
 * Sync Supabase user to local database
 * POST /api/auth/sync
 * 
 * Called after Supabase login/signup to ensure user exists in our DB
 */
router.post('/sync', authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        const { name } = req.body;

        // Update name if provided
        if (name && name !== user.name) {
            user.name = name;
            await user.save();
        }

        res.json({
            message: 'User synced successfully',
            user: {
                id: user.id,
                supabaseId: user.supabaseId,
                email: user.email,
                phone: user.phone,
                name: user.name,
            },
        });
    } catch (error) {
        console.error('Sync user error:', error);
        res.status(500).json({ error: 'Failed to sync user' });
    }
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        const { name, phone } = req.body;

        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone;

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                supabaseId: user.supabaseId,
                email: user.email,
                phone: user.phone,
                name: user.name,
            },
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * Health check for auth service
 * GET /api/auth/health
 */
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        authProvider: 'supabase',
        message: 'Auth service is running' 
    });
});

export default router;
