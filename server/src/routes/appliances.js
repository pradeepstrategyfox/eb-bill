import express from 'express';
import { body, validationResult } from 'express-validator';
import Appliance from '../models/Appliance.js';
import Room from '../models/Room.js';
import Home from '../models/Home.js';
import { authMiddleware } from '../middleware/auth.js';
import { getAllAppliances } from '../services/ApplianceLibrary.js';
import { toggleAppliance } from '../services/ConsumptionEngine.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * Get appliance library
 * GET /api/appliances/library
 */
router.get('/library', (req, res) => {
    res.json(getAllAppliances());
});

/**
 * Create appliance
 * POST /api/rooms/:roomId/appliances
 */
router.post('/rooms/:roomId/appliances', [
    body('name').notEmpty(),
    body('type').notEmpty(),
    body('wattage').isFloat({ min: 0 }),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Verify room ownership
        const room = await Room.findByPk(req.params.roomId, {
            include: [{ model: Home, as: 'home' }],
        });

        if (!room || room.home.userId !== req.userId) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const appliance = await Appliance.create({
            roomId: req.params.roomId,
            ...req.body,
        });

        res.status(201).json(appliance);
    } catch (error) {
        console.error('Create appliance error:', error);
        res.status(500).json({ error: 'Failed to create appliance' });
    }
});

/**
 * Toggle appliance state
 * PATCH /api/appliances/:id/toggle
 */
router.patch('/:id/toggle', async (req, res) => {
    try {
        const appliance = await Appliance.findByPk(req.params.id, {
            include: [{
                model: Room,
                as: 'room',
                include: [{ model: Home, as: 'home' }],
            }],
        });

        if (!appliance || appliance.room.home.userId !== req.userId) {
            return res.status(404).json({ error: 'Appliance not found' });
        }

        const newState = !appliance.isOn;
        const updatedAppliance = await toggleAppliance(appliance.id, newState);

        res.json(updatedAppliance);
    } catch (error) {
        console.error('Toggle appliance error:', error);
        res.status(500).json({ error: 'Failed to toggle appliance' });
    }
});

/**
 * Update appliance
 * PUT /api/appliances/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const appliance = await Appliance.findByPk(req.params.id, {
            include: [{
                model: Room,
                as: 'room',
                include: [{ model: Home, as: 'home' }],
            }],
        });

        if (!appliance || appliance.room.home.userId !== req.userId) {
            return res.status(404).json({ error: 'Appliance not found' });
        }

        await appliance.update(req.body);
        res.json(appliance);
    } catch (error) {
        console.error('Update appliance error:', error);
        res.status(500).json({ error: 'Failed to update appliance' });
    }
});

/**
 * Delete appliance
 * DELETE /api/appliances/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const appliance = await Appliance.findByPk(req.params.id, {
            include: [{
                model: Room,
                as: 'room',
                include: [{ model: Home, as: 'home' }],
            }],
        });

        if (!appliance || appliance.room.home.userId !== req.userId) {
            return res.status(404).json({ error: 'Appliance not found' });
        }

        await appliance.destroy();
        res.json({ message: 'Appliance deleted' });
    } catch (error) {
        console.error('Delete appliance error:', error);
        res.status(500).json({ error: 'Failed to delete appliance' });
    }
});

export default router;
