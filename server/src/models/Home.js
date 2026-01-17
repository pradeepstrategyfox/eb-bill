import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import User from './User.js';

const Home = sequelize.define('Home', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'My Home',
    },
    totalRooms: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'total_rooms',
        validate: {
            min: 1,
        },
    },
}, {
    tableName: 'ps_homes',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
});

// Associations
Home.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Home, { foreignKey: 'userId', as: 'homes' });

export default Home;
