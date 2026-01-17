import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please set it in your environment configuration');
    console.error('Example: postgresql://user:password@host:5432/database');
    process.exit(1);
}

// PostgreSQL connection
export const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false,
        } : false,
    },
});
