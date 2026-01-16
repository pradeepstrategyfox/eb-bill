import express from 'express';
import TariffSlab from '../models/TariffSlab.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Simple admin check (enhance with proper role-based auth in production)
function adminCheck(req, res, next) {
    // TODO: Implement proper admin role check
    next();
}

/**
 * Get all tariff slabs
 * GET /api/admin/tariffs
 */
router.get('/tariffs', adminCheck, async (req, res) => {
    try {
        const slabs = await TariffSlab.findAll({
            order: [['minUnits', 'ASC']],
        });
        res.json(slabs);
    } catch (error) {
        console.error('Get tariffs error:', error);
        res.status(500).json({ error: 'Failed to get tariffs' });
    }
});

/**
 * Create tariff slab
 * POST /api/admin/tariffs
 */
router.post('/tariffs', adminCheck, async (req, res) => {
    try {
        const slab = await TariffSlab.create(req.body);
        res.status(201).json(slab);
    } catch (error) {
        console.error('Create tariff error:', error);
        res.status(500).json({ error: 'Failed to create tariff' });
    }
});

/**
 * Update tariff slab
 * PUT /api/admin/tariffs/:id
 */
router.put('/tariffs/:id', adminCheck, async (req, res) => {
    try {
        const slab = await TariffSlab.findByPk(req.params.id);
        if (!slab) {
            return res.status(404).json({ error: 'Tariff slab not found' });
        }

        await slab.update(req.body);
        res.json(slab);
    } catch (error) {
        console.error('Update tariff error:', error);
        res.status(500).json({ error: 'Failed to update tariff' });
    }
});

export default router;
