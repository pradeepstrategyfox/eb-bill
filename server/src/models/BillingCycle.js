import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Home from './Home.js';

const BillingCycle = sequelize.define('BillingCycle', {
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
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'start_date',
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'end_date',
    },
    totalUnits: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        field: 'total_units',
    },
    estimatedBill: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        field: 'estimated_bill',
    },
    actualBill: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'actual_bill',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
    },
}, {
    tableName: 'ps_billing_cycles',
    underscored: true,
    timestamps: true,
});

// Associations
BillingCycle.belongsTo(Home, { foreignKey: 'homeId', as: 'home' });
Home.hasMany(BillingCycle, { foreignKey: 'homeId', as: 'billingCycles' });

export default BillingCycle;
