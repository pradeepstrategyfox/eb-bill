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
            model: 'ps_users', // Explicitly reference the table name with prefix
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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
    underscored: true,
    timestamps: true,
});

// Associations
Home.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Home, { foreignKey: 'userId', as: 'homes' });

export default Home;
