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

/**
 * Add rooms to home
 * POST /api/homes/:id/rooms
 */
router.post('/:id/rooms', [
    body('rooms').isArray({ min: 1 }),
    body('rooms.*.name').notEmpty(),
    body('rooms.*.type').notEmpty(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Verify home ownership
        const home = await Home.findOne({
            where: {
                id: req.params.id,
                userId: req.userId,
            },
        });

        if (!home) {
            return res.status(404).json({ error: 'Home not found' });
        }

        const { rooms } = req.body;

        // Create all rooms
        const createdRooms = await Promise.all(
            rooms.map(room => Room.create({
                homeId: home.id,
                name: room.name,
                type: room.type,
                squareFootage: room.squareFootage || 100,
            }))
        );

        res.status(201).json(createdRooms);
    } catch (error) {
        console.error('Create rooms error:', error);
        res.status(500).json({ error: 'Failed to create rooms' });
    }
});

/**
 * Add appliances to room
 * POST /api/homes/:id/rooms/:roomId/appliances
 */
router.post('/:id/rooms/:roomId/appliances', [
    body('appliances').isArray({ min: 1 }),
    body('appliances.*.name').notEmpty(),
    body('appliances.*.wattage').isInt({ min: 1 }),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Verify home ownership
        const home = await Home.findOne({
            where: {
                id: req.params.id,
                userId: req.userId,
            },
        });

        if (!home) {
            return res.status(404).json({ error: 'Home not found' });
        }

        // Verify room belongs to home  
        const room = await Room.findOne({
            where: {
                id: req.params.roomId,
                homeId: home.id,
            },
        });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const { appliances } = req.body;

        console.log('📥 Received appliances data:', JSON.stringify(appliances, null, 2));

        // Validate and create all appliances
        const createdAppliances = await Promise.all(
            appliances.map((appliance, index) => {
                // Validate required fields
                const applianceType = appliance.type || appliance.name;
                const applianceName = appliance.name || appliance.type;
                const applianceWattage = appliance.wattage || 100;

                if (!applianceType) {
                    console.error(`❌ Appliance at index ${index} missing type:`, appliance);
                    throw new Error(`Appliance #${index + 1} is missing type field`);
                }

                console.log(`✓ Creating appliance: ${applianceName} (${applianceType}) - ${applianceWattage}W`);

                return Appliance.create({
                    roomId: room.id,
                    name: applianceName,
                    type: applianceType, // CRITICAL: This was missing!
                    wattage: applianceWattage,
                    isOn: false,
                });
            })
        );

        console.log(`✅ Successfully created ${createdAppliances.length} appliances`);

        res.status(201).json(createdAppliances);
    } catch (error) {
        console.error('❌ Create appliances error:', error.message);
        console.error('Error name:', error.name);
        console.error('Error stack:', error.stack);
        if (error.parent) {
            console.error('SQL Error:', error.parent.message);
        }
        if (error.sql) {
            console.error('SQL Query:', error.sql);
        }
        res.status(500).json({ error: 'Failed to create appliances' });
    }
});

export default router;
