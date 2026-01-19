import express from 'express';
import Home from '../models/Home.js';
import { authMiddleware } from '../middleware/auth.js';
import { getConsumptionData } from '../services/ConsumptionEngine.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * Get live consumption data
 * GET /api/consumption/:homeId/live
 */
router.get('/:homeId/live', async (req, res) => {
    try {
        // Validate homeId parameter
        if (!req.params.homeId || isNaN(req.params.homeId)) {
            return res.status(400).json({ error: 'Invalid home ID' });
        }

        const home = await Home.findOne({
            where: {
                id: req.params.homeId,
                userId: req.userId,
            },
        });

        if (!home) {
            return res.status(404).json({ error: 'Home not found' });
        }

        const consumptionData = await getConsumptionData(req.params.homeId);

        // Ensure all required fields have values
        const response = {
            liveLoad: consumptionData?.liveLoad || 0,
            today: consumptionData?.today || 0,
            cycleUsage: consumptionData?.cycleUsage || 0,
            activeAppliances: consumptionData?.activeAppliances || 0,
            ...consumptionData, // Include all other fields
        };

        res.json(response);
    } catch (error) {
        console.error('❌ Get consumption error:', error.message);
        console.error('Stack:', error.stack);

        // Return fallback data instead of crashing
        res.status(500).json({
            error: 'Failed to get consumption data',
            liveLoad: 0,
            today: 0,
            cycleUsage: 0,
            activeAppliances: 0,
        });
    }
});

/**
 * Get insights with cost breakdown
 * GET /api/consumption/:homeId/insights
 */
router.get('/:homeId/insights', async (req, res) => {
    try {
        // Validate homeId parameter
        if (!req.params.homeId || isNaN(req.params.homeId)) {
            return res.status(400).json({ error: 'Invalid home ID' });
        }

        const home = await Home.findOne({
            where: {
                id: req.params.homeId,
                userId: req.userId,
            },
        });

        if (!home) {
            return res.status(404).json({ error: 'Home not found' });
        }

        const topConsumers = await getTopConsumersWithCost(req.params.homeId);
        res.json({ topConsumers: topConsumers || [] });
    } catch (error) {
        console.error('❌ Get insights error:', error.message);
        res.status(500).json({
            error: 'Failed to get insights',
            topConsumers: [],
        });
    }
});

export default router;
