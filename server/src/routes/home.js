import express from 'express';
import { body, validationResult } from 'express-validator';
import Home from '../models/Home.js';
import Room from '../models/Room.js';
import Appliance from '../models/Appliance.js';
import BillingCycle from '../models/BillingCycle.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Create new home
 * POST /api/homes
 */
router.post('/', [
    body('name').notEmpty(),
    body('totalRooms').isInt({ min: 1 }),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, totalRooms } = req.body;

        const home = await Home.create({
            userId: req.userId,
            name,
            totalRooms,
        });

        // Create initial billing cycle
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 60);

        await BillingCycle.create({
            homeId: home.id,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            totalUnits: 0,
            estimatedBill: 0,
            isActive: true,
        });

        res.status(201).json(home);
    } catch (error) {
        console.error('Create home error:', error);
        res.status(500).json({ error: 'Failed to create home' });
    }
});

/**
 * Get home with rooms and appliances
 * GET /api/homes/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const home = await Home.findOne({
            where: {
                id: req.params.id,
                userId: req.userId,
            },
            include: [{
                model: Room,
                as: 'rooms',
                include: [{
                    model: Appliance,
                    as: 'appliances',
                }],
            }],
        });

        if (!home) {
            return res.status(404).json({ error: 'Home not found' });
        }

        res.json(home);
    } catch (error) {
        console.error('Get home error:', error);
        res.status(500).json({ error: 'Failed to get home' });
    }
});

/**
 * Get user's homes
 * GET /api/homes
 */
router.get('/', async (req, res) => {
    try {
        const homes = await Home.findAll({
            where: { userId: req.userId },
            include: [{
                model: Room,
                as: 'rooms',
            }],
        });

        res.json(homes);
    } catch (error) {
        console.error('Get homes error:', error);
        res.status(500).json({ error: 'Failed to get homes' });
    }
});

/**
 * Update home
 * PUT /api/homes/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const home = await Home.findOne({
            where: {
                id: req.params.id,
                userId: req.userId,
            },
        });

        if (!home) {
            return res.status(404).json({ error: 'Home not found' });
        }

        const { name, totalRooms } = req.body;

        if (name) home.name = name;
        if (totalRooms) home.totalRooms = totalRooms;

        await home.save();

        res.json(home);
    } catch (error) {
        console.error('Update home error:', error);
        res.status(500).json({ error: 'Failed to update home' });
    }
});

export default router;
