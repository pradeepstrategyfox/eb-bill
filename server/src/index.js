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

        // Sync database models (in development)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: false });
            console.log('✓ Database models synchronized');
        }

        // Initialize Redis
        const redis = createRedisClient();
        await redis.connect();
        console.log('✓ Redis connected successfully');

        // Start server
        app.listen(PORT, () => {
            console.log(`✓ Server running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app;
