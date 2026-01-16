import express from 'express';
import { body, validationResult } from 'express-validator';
import Home from '../models/Home.js';
import MeterReading from '../models/MeterReading.js';
import { authMiddleware } from '../middleware/auth.js';
import { getConsumptionData } from '../services/ConsumptionEngine.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * Submit meter reading
 * POST /api/homes/:homeId/meter-readings
 */
router.post('/homes/:homeId/meter-readings', [
    body('readingValue').isFloat({ min: 0 }),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
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

        const { readingValue } = req.body;

        // Get current simulated consumption
        const consumptionData = await getConsumptionData(req.params.homeId);

        // Calculate variance
        const variancePercentage = consumptionData.cycleKwh > 0
            ? ((readingValue - consumptionData.cycleKwh) / consumptionData.cycleKwh) * 100
            : 0;

        const meterReading = await MeterReading.create({
            homeId: req.params.homeId,
            readingValue,
            variancePercentage,
        });

        res.status(201).json(meterReading);
    } catch (error) {
        console.error('Submit meter reading error:', error);
        res.status(500).json({ error: 'Failed to submit meter reading' });
    }
});

/**
 * Get meter reading history
 * GET /api/homes/:homeId/meter-readings
 */
router.get('/homes/:homeId/meter-readings', async (req, res) => {
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

        const readings = await MeterReading.findAll({
            where: { homeId: req.params.homeId },
            order: [['readingDate', 'DESC']],
        });

        res.json(readings);
    } catch (error) {
        console.error('Get meter readings error:', error);
        res.status(500).json({ error: 'Failed to get meter readings' });
    }
});

export default router;
