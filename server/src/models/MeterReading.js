import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Home from './Home.js';

const MeterReading = sequelize.define('MeterReading', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    homeId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'home_id',
        references: {
            model: 'homes',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    readingValue: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: 'reading_value',
        validate: {
            min: 0,
        },
    },
    readingDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'reading_date',
    },
    variancePercentage: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'variance_percentage',
    },
}, {
    tableName: 'ps_meter_readings',
    underscored: true,
    timestamps: true,
    updatedAt: false,
});

// Associations
MeterReading.belongsTo(Home, { foreignKey: 'homeId', as: 'home' });
Home.hasMany(MeterReading, { foreignKey: 'homeId', as: 'meterReadings' });

export default MeterReading;
