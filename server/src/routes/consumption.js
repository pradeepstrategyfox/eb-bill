import express from 'express';
import Home from '../models/Home.js';
import { authMiddleware } from '../middleware/auth.js';
import { getConsumptionData, getTopConsumersWithCost } from '../services/ConsumptionEngine.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * Get live consumption data
 * GET /api/consumption/:homeId/live
 */
router.get('/:homeId/live', async (req, res) => {
    try {
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
        res.json(consumptionData);
    } catch (error) {
        console.error('Get consumption error:', error);
        res.status(500).json({ error: 'Failed to get consumption data' });
    }
});

/**
 * Get insights with cost breakdown
 * GET /api/consumption/:homeId/insights
 */
router.get('/:homeId/insights', async (req, res) => {
    try {
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
        res.json({ topConsumers });
    } catch (error) {
        console.error('Get insights error:', error);
        res.status(500).json({ error: 'Failed to get insights' });
    }
});

export default router;
