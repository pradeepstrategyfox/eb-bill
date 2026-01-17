import { sequelize } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration to add missing timestamp columns to ps_ tables
 * Run this once to fix the schema
 */
async function addTimestampColumns() {
    try {
        console.log('🔧 Starting migration: Adding timestamp columns...');

        await sequelize.authenticate();
        console.log('✓ Database connected');

        // Add created_at and updated_at to ps_users if they don't exist
        console.log('Adding timestamps to ps_users...');
        await sequelize.query(`
            ALTER TABLE ps_users 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `);

        // Add to ps_homes
        console.log('Adding timestamps to ps_homes...');
        await sequelize.query(`
            ALTER TABLE ps_homes 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `);

        // Add to ps_rooms
        console.log('Adding timestamps to ps_rooms...');
        await sequelize.query(`
            ALTER TABLE ps_rooms 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `);

        // Add to ps_appliances
        console.log('Adding timestamps to ps_appliances...');
        await sequelize.query(`
            ALTER TABLE ps_appliances 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `);

        // Add to ps_appliance_usage_logs
        console.log('Adding timestamps to ps_appliance_usage_logs...');
        await sequelize.query(`
            ALTER TABLE ps_appliance_usage_logs 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `);

        // ps_meter_readings only needs created_at
        console.log('Adding created_at to ps_meter_readings...');
        await sequelize.query(`
            ALTER TABLE ps_meter_readings 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `);

        // Add to ps_billing_cycles
        console.log('Adding timestamps to ps_billing_cycles...');
        await sequelize.query(`
            ALTER TABLE ps_billing_cycles 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `);

        // Add to ps_tariff_slabs
        console.log('Adding timestamps to ps_tariff_slabs...');
        await sequelize.query(`
            ALTER TABLE ps_tariff_slabs 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `);

        console.log('\n✅ Migration completed successfully!');
        console.log('All ps_ tables now have proper timestamp columns.');

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.parent) {
            console.error('SQL Error:', error.parent.message);
        }
        process.exit(1);
    }
}

addTimestampColumns();
