import express from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

// Mock OTP service (replace with real service in production)
const otpStore = new Map(); //In-memory OTP storage for development

/**
 * Send OTP to email or phone
 * POST /api/auth/send-otp
 */
router.post('/send-otp', [
    body('email').optional().isEmail(),
    body('phone').optional().isMobilePhone(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, phone } = req.body;

        if (!email && !phone) {
            return res.status(400).json({ error: 'Email or phone is required' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP (expires in 5 minutes)
        const key = email || phone;
        otpStore.set(key, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

        // In development, log OTP to console
        console.log(`OTP for ${key}: ${otp}`);

        // TODO: Send actual OTP via SMS/Email service

        res.json({ message: 'OTP sent successfully', key });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

/**
 * Verify OTP and register/login user
 * POST /api/auth/verify-otp
 */
router.post('/verify-otp', [
    body('key').notEmpty(),
    body('otp').isLength({ min: 6, max: 6 }),
    body('name').optional().notEmpty(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { key, otp, name } = req.body;

        // Verify OTP
        const stored = otpStore.get(key);
        if (!stored) {
            return res.status(400).json({ error: 'OTP not found or expired' });
        }

        if (stored.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (Date.now() > stored.expiresAt) {
            otpStore.delete(key);
            return res.status(400).json({ error: 'OTP expired' });
        }

        // Clear OTP
        otpStore.delete(key);

        // Check if user exists
        const isEmail = key.includes('@');
        const whereClause = isEmail ? { email: key } : { phone: key };

        let user = await User.findOne({ where: whereClause });

        if (!user) {
            // Create new user
            if (!name) {
                return res.status(400).json({ error: 'Name is required for new users' });
            }

            user = await User.create({
                ...(isEmail ? { email: key } : { phone: key }),
                name,
                passwordHash: await bcrypt.hash(Math.random().toString(), 10), // Random hash for OTP users
            });
        }

        // Generate JWT token
        const token = generateToken(user.id);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                name: user.name,
            },
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

/**
 * Traditional login with email and password
 * POST /api/auth/login
 */
router.post('/login', [
    body('email').isEmail(),
    body('password').notEmpty(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user.id);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                name: user.name,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * Register with email and password
 * POST /api/auth/register
 */
router.post('/register', [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty(),
], async (req, res) => {
    try {
        console.log('📝 Registration attempt:', req.body.email);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name } = req.body;

        // Check if user exists
        console.log('🔍 Checking if user exists:', email);
        const existing = await User.findOne({ where: { email } });
        if (existing) {
            console.log('❌ User already exists:', email);
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        console.log('🔐 Hashing password...');
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        console.log('👤 Creating user:', { email, name });
        const user = await User.create({
            email,
            passwordHash,
            name,
        });
        console.log('✅ User created successfully:', user.id);

        const token = generateToken(user.id);
        console.log('🎫 Token generated');

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                name: user.name,
            },
        });
    } catch (error) {
        console.error('❌❌❌ REGISTRATION ERROR ❌❌❌');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        if (error.parent) {
            console.error('Parent error:', error.parent.message);
        }
        if (error.sql) {
            console.error('SQL:', error.sql);
        }
        res.status(500).json({ error: 'Registration failed' });
    }
});

export default router;
