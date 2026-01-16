import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Appliance from './Appliance.js';

const ApplianceUsageLog = sequelize.define('ApplianceUsageLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    applianceId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'appliance_id',
        references: {
            model: 'appliances',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    turnedOnAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'turned_on_at',
    },
    turnedOffAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'turned_off_at',
    },
    durationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'duration_seconds',
    },
    energyConsumedKwh: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        field: 'energy_consumed_kwh',
    },
}, {
    tableName: 'appliance_usage_logs',
    underscored: true,
    timestamps: true,
    updatedAt: false, // Only createdAt
});

// Associations
ApplianceUsageLog.belongsTo(Appliance, { foreignKey: 'applianceId', as: 'appliance' });
Appliance.hasMany(ApplianceUsageLog, { foreignKey: 'applianceId', as: 'usageLogs' });

export default ApplianceUsageLog;
