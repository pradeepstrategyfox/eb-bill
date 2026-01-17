import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './config/database.js';
import { createRedisClient } from './config/redis.js';

// Import routes
import authRoutes from './routes/auth.js';
import homeRoutes from './routes/home.js';
import roomRoutes from './routes/rooms.js';
import applianceRoutes from './routes/appliances.js';
import consumptionRoutes from './routes/consumption.js';
import billingRoutes from './routes/billing.js';
import meterRoutes from './routes/meter.js';
import adminRoutes from './routes/admin.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for Render
app.get('/', (req, res) => {
    res.json({
        message: 'PowerSense Home API',
        status: 'running',
        version: '1.0.0',
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/homes', homeRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/appliances', applianceRoutes);
app.use('/api/consumption', consumptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/meter', meterRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    const status = err.status || 500;
    const message = err.message || 'Internal server error';

    res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✓ Database connected successfully');

        // Auto-sync database models and seed tariffs
        console.log('🔄 Syncing database tables...');
        await sequelize.sync({ alter: false, force: false });
        console.log('✓ Database tables synced');

        // Auto-seed tariff slabs if they don't exist
        const TariffSlab = (await import('./models/TariffSlab.js')).default;
        const tariffCount = await TariffSlab.count();

        if (tariffCount === 0) {
            console.log('🔄 Seeding TNEB tariff slabs...');
            const tariffs = [
                { minUnits: 0, maxUnits: 100, ratePerUnit: 2.50, fixedCharge: 20, subsidyPercentage: 50, effectiveFrom: new Date('2024-01-01') },
                { minUnits: 101, maxUnits: 200, ratePerUnit: 3.00, fixedCharge: 30, subsidyPercentage: 25, effectiveFrom: new Date('2024-01-01') },
                { minUnits: 201, maxUnits: 400, ratePerUnit: 4.50, fixedCharge: 50, subsidyPercentage: 0, effectiveFrom: new Date('2024-01-01') },
                { minUnits: 401, maxUnits: 500, ratePerUnit: 6.00, fixedCharge: 75, subsidyPercentage: 0, effectiveFrom: new Date('2024-01-01') },
                { minUnits: 501, maxUnits: 800, ratePerUnit: 7.50, fixedCharge: 100, subsidyPercentage: 0, effectiveFrom: new Date('2024-01-01') },
                { minUnits: 801, maxUnits: null, ratePerUnit: 9.00, fixedCharge: 150, subsidyPercentage: 0, effectiveFrom: new Date('2024-01-01') },
            ];
            await TariffSlab.bulkCreate(tariffs);
            console.log(`✓ Seeded ${tariffs.length} TNEB tariff slabs`);
        } else {
            console.log(`✓ Tariff slabs already exist (${tariffCount} slabs)`);
        }

        // Initialize Redis
        const redis = createRedisClient();
        await redis.connect();
        console.log('✓ Redis connected successfully');

        // Start server
        app.listen(PORT, () => {
            console.log(`✓ Server running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('✓ PowerSense Home API is ready!');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app;
