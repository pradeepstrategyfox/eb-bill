import { sequelize } from './config/database.js';
import TariffSlab from './models/TariffSlab.js';
import User from './models/User.js';
import Home from './models/Home.js';
import Room from './models/Room.js';
import Appliance from './models/Appliance.js';
import ApplianceUsageLog from './models/ApplianceUsageLog.js';
import MeterReading from './models/MeterReading.js';
import BillingCycle from './models/BillingCycle.js';
import dotenv from 'dotenv';

dotenv.config();

// Set up associations
Home.hasMany(Room, { foreignKey: 'homeId', as: 'Rooms' });
Room.belongsTo(Home, { foreignKey: 'homeId' });

Room.hasMany(Appliance, { foreignKey: 'roomId', as: 'Appliances' });
Appliance.belongsTo(Room, { foreignKey: 'roomId' });

Appliance.hasMany(ApplianceUsageLog, { foreignKey: 'applianceId' });
ApplianceUsageLog.belongsTo(Appliance, { foreignKey: 'applianceId' });

Home.hasMany(MeterReading, { foreignKey: 'homeId' });
MeterReading.belongsTo(Home, { foreignKey: 'homeId' });

Home.hasMany(BillingCycle, { foreignKey: 'homeId' });
BillingCycle.belongsTo(Home, { foreignKey: 'homeId' });

User.hasMany(Home, { foreignKey: 'userId' });
Home.belongsTo(User, { foreignKey: 'userId' });

async function seedDatabase() {
    try {
        console.log('🔄 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connected');

        console.log('🔄 Syncing tables (will create if not exist)...');
        await sequelize.sync({ alter: false, force: false });
        console.log('✅ Tables synced');

        // Check if tariffs already exist
        const tariffCount = await TariffSlab.count();

        if (tariffCount === 0) {
            console.log('🔄 Seeding tariff slabs...');

            const tariffs = [
                {
                    minUnits: 0,
                    maxUnits: 100,
                    ratePerUnit: 2.50,
                    fixedCharge: 20,
                    subsidyPercentage: 50,
                    effectiveFrom: new Date('2024-01-01'),
                },
                {
                    minUnits: 101,
                    maxUnits: 200,
                    ratePerUnit: 3.00,
                    fixedCharge: 30,
                    subsidyPercentage: 25,
                    effectiveFrom: new Date('2024-01-01'),
                },
                {
                    minUnits: 201,
                    maxUnits: 400,
                    ratePerUnit: 4.50,
                    fixedCharge: 50,
                    subsidyPercentage: 0,
                    effectiveFrom: new Date('2024-01-01'),
                },
                {
                    minUnits: 401,
                    maxUnits: 500,
                    ratePerUnit: 6.00,
                    fixedCharge: 75,
                    subsidyPercentage: 0,
                    effectiveFrom: new Date('2024-01-01'),
                },
                {
                    minUnits: 501,
                    maxUnits: 800,
                    ratePerUnit: 7.50,
                    fixedCharge: 100,
                    subsidyPercentage: 0,
                    effectiveFrom: new Date('2024-01-01'),
                },
                {
                    minUnits: 801,
                    maxUnits: null,
                    ratePerUnit: 9.00,
                    fixedCharge: 150,
                    subsidyPercentage: 0,
                    effectiveFrom: new Date('2024-01-01'),
                },
            ];

            await TariffSlab.bulkCreate(tariffs);
            console.log('✅ Tariff slabs seeded successfully!');
            console.log(`   - ${tariffs.length} tariff slabs created`);
        } else {
            console.log(`ℹ️  Tariff slabs already exist (${tariffCount} slabs)`);
        }

        console.log('\n🎉 Database setup complete!');
        console.log('✅ PowerSense Home is ready to use');

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Database seed failed:');
        console.error(error.message);
        if (error.parent) {
            console.error('SQL Error:', error.parent.message);
        }
        process.exit(1);
    }
}

seedDatabase();
