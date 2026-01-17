// Simple test to verify SQLite connection
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: console.log,
});

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ SQLite connection successful!');
        console.log('📁 Database file:', dbPath);

        // Test creating a simple table
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS test (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
      )
    `);
        console.log('✅ Test table created successfully!');

        await sequelize.close();
        console.log('✅ Connection closed');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testConnection();
