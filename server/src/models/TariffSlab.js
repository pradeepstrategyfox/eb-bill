import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const TariffSlab = sequelize.define('TariffSlab', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    minUnits: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: 'min_units',
    },
    maxUnits: {
        type: DataTypes.FLOAT,
        allowNull: true, // null for top slab
        field: 'max_units',
    },
    ratePerUnit: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: 'rate_per_unit',
    },
    fixedCharge: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        field: 'fixed_charge',
    },
    subsidyPercentage: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        field: 'subsidy_percentage',
        validate: {
            min: 0,
            max: 100,
        },
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
    },
    effectiveFrom: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'effective_from',
    },
}, {
    tableName: 'tariff_slabs',
    underscored: true,
    timestamps: true,
});

export default TariffSlab;
