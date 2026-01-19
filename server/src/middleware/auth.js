import { getSupabaseClient } from '../config/supabase.js';
import User from '../models/User.js';

/**
 * Middleware to verify Supabase JWT tokens using Supabase Client Library
 * This validates the token via Supabase API and syncs/creates the user in our database
 */
export async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);

        // Create a Supabase client with the user's token
        const supabaseClient = getSupabaseClient(token);

        // Verify the token by getting the user from Supabase
        const { data: { user: supabaseUser }, error } = await supabaseClient.auth.getUser();

        if (error || !supabaseUser) {
            console.error('Supabase auth error:', error?.message || 'No user found');
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Extract user info from Supabase user
        const supabaseUserId = supabaseUser.id;
        const email = supabaseUser.email;
        const userMetadata = supabaseUser.user_metadata || {};
        const name = userMetadata.name || email?.split('@')[0] || 'User';

        // Find or create user in our database
        let user = await User.findOne({ where: { supabaseId: supabaseUserId } });

        if (!user) {
            // Check if user exists by email (for legacy users)
            if (email) {
                user = await User.findOne({ where: { email } });
                if (user) {
                    // Link existing user to Supabase
                    user.supabaseId = supabaseUserId;
                    await user.save();
                    console.log(`✓ Linked existing user ${email} to Supabase ID ${supabaseUserId}`);
                }
            }
        }

        if (!user) {
            // Create new user
            user = await User.create({
                supabaseId: supabaseUserId,
                email: email,
                name: name,
            });
            console.log(`✓ Created new user from Supabase: ${email} (${supabaseUserId})`);
        }

        // Attach user info to request
        req.userId = user.id;
        req.supabaseUserId = supabaseUserId;
        req.user = user;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(500).json({ error: 'Authentication error' });
    }
}

/**
 * Optional auth middleware - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
export async function optionalAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token - continue as anonymous
        req.userId = null;
        req.user = null;
        return next();
    }

    // Has token - verify it
    return authMiddleware(req, res, next);
}
