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
 * GET /api/billing/:homeId/current
 */
router.get('/:homeId/current', async (req, res) => {
    try {
        // Validate homeId parameter
        if (!req.params.homeId) {
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

        // Get consumption data with error handling
        const consumptionData = await getConsumptionData(req.params.homeId);

        // Safely get cycleKwh with fallback
        const cycleKwh = consumptionData?.cycleKwh || consumptionData?.cycleUsage || 0;

        // Calculate bill projection
        const billProjection = await calculateTNEBBill(cycleKwh);

        // Update billing cycle if it exists
        const activeCycle = await BillingCycle.findOne({
            where: {
                homeId: req.params.homeId,
                isActive: true,
            },
        });

        if (activeCycle) {
            activeCycle.totalUnits = cycleKwh;
            activeCycle.estimatedBill = billProjection?.estimatedBill || billProjection?.totalBill || 0;
            await activeCycle.save();
        }

        // Ensure response has expected fields
        const response = {
            totalBill: billProjection?.totalBill || 0,
            slab: billProjection?.slab || 'No data',
            ...billProjection, // Include all other fields
        };

        res.json(response);
    } catch (error) {
        console.error('❌ Get bill projection error:', error.message);
        console.error('Stack:', error.stack);

        // Return fallback data instead of crashing
        res.status(500).json({
            error: 'Failed to calculate bill',
            totalBill: 0,
            slab: 'Error calculating',
        });
    }
});

/**
 * Get billing history
 * GET /api/billing/:homeId/history
 */
router.get('/:homeId/history', async (req, res) => {
    try {
        // Validate homeId parameter
        if (!req.params.homeId) {
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

        const cycles = await BillingCycle.findAll({
            where: { homeId: req.params.homeId },
            order: [['startDate', 'DESC']],
        });

        res.json(cycles || []);
    } catch (error) {
        console.error('❌ Get billing history error:', error.message);
        res.status(500).json({
            error: 'Failed to get billing history',
            cycles: [],
        });
    }
});

export default router;
