import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Home from './Home.js';

const Room = sequelize.define('Room', {
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
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('bedroom', 'hall', 'kitchen', 'bathroom', 'balcony'),
        allowNull: false,
    },
    squareFootage: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'square_footage',
    },
    positionX: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'position_x',
    },
    positionY: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'position_y',
    },
}, {
    tableName: 'rooms',
    underscored: true,
    timestamps: true,
});

// Associations
Room.belongsTo(Home, { foreignKey: 'homeId', as: 'home' });
Home.hasMany(Room, { foreignKey: 'homeId', as: 'rooms' });

export default Room;
