import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    supabaseId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
        field: 'supabase_id',
        comment: 'Supabase auth user ID',
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
        validate: {
            isEmail: true,
        },
    },
    phone: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: true, // Now optional since Supabase handles auth
        field: 'password_hash',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'ps_users',
    underscored: true,
    timestamps: true,
});

export default User;
