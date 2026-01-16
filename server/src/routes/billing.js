import express from 'express';
import Home from '../models/Home.js';
import BillingCycle from '../models/BillingCycle.js';
import { authMiddleware } from '../middleware/auth.js';
import { calculateTNEBBill } from '../services/BillingEngine.js';
import { getConsumptionData } from '../services/ConsumptionEngine.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * Get current bill projection
 * GET /api/homes/:homeId/billing/current
 */
router.get('/homes/:homeId/billing/current', async (req, res) => {
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
        const billProjection = await calculateTNEBBill(consumptionData.cycleKwh);

        // Update billing cycle
        const activeCycle = await BillingCycle.findOne({
            where: {
                homeId: req.params.homeId,
                isActive: true,
            },
        });

        if (activeCycle) {
            activeCycle.totalUnits = consumptionData.cycleKwh;
            activeCycle.estimatedBill = billProjection.estimatedBill;
            await activeCycle.save();
        }

        res.json(billProjection);
    } catch (error) {
        console.error('Get bill projection error:', error);
        res.status(500).json({ error: 'Failed to calculate bill' });
    }
});

/**
 * Get billing history
 * GET /api/homes/:homeId/billing/history
 */
router.get('/homes/:homeId/billing/history', async (req, res) => {
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

        const cycles = await BillingCycle.findAll({
            where: { homeId: req.params.homeId },
            order: [['startDate', 'DESC']],
        });

        res.json(cycles);
    } catch (error) {
        console.error('Get billing history error:', error);
        res.status(500).json({ error: 'Failed to get billing history' });
    }
});

export default router;
