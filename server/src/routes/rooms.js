import express from 'express';
import { body, validationResult } from 'express-validator';
import Room from '../models/Room.js';
import Home from '../models/Home.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * Create room
 * POST /api/homes/:homeId/rooms
 */
router.post('/homes/:homeId/rooms', [
    body('name').notEmpty(),
    body('type').isIn(['bedroom', 'hall', 'kitchen', 'bathroom', 'balcony']),
    body('positionX').optional().isInt(),
    body('positionY').optional().isInt(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Verify home ownership
        const home = await Home.findOne({
            where: {
                id: req.params.homeId,
                userId: req.userId,
            },
        });

        if (!home) {
            return res.status(404).json({ error: 'Home not found' });
        }

        const room = await Room.create({
            homeId: req.params.homeId,
            ...req.body,
        });

        res.status(201).json(room);
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

/**
 * Update room
 * PUT /api/rooms/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const room = await Room.findByPk(req.params.id, {
            include: [{ model: Home, as: 'home' }],
        });

        if (!room || room.home.userId !== req.userId) {
            return res.status(404).json({ error: 'Room not found' });
        }

        await room.update(req.body);
        res.json(room);
    } catch (error) {
        console.error('Update room error:', error);
        res.status(500).json({ error: 'Failed to update room' });
    }
});

/**
 * Delete room
 * DELETE /api/rooms/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const room = await Room.findByPk(req.params.id, {
            include: [{ model: Home, as: 'home' }],
        });

        if (!room || room.home.userId !== req.userId) {
            return res.status(404).json({ error: 'Room not found' });
        }

        await room.destroy();
        res.json({ message: 'Room deleted' });
    } catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

export default router;
