import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Room from './Room.js';

const Appliance = sequelize.define('Appliance', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    roomId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'room_id',
        references: {
            model: 'rooms',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    wattage: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: 0,
        },
    },
    isOn: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_on',
    },
}, {
    tableName: 'appliances',
    underscored: true,
    timestamps: true,
});

// Associations
Appliance.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });
Room.hasMany(Appliance, { foreignKey: 'roomId', as: 'appliances' });

export default Appliance;
