import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_eleveto_ai_1997';

if (JWT_SECRET === 'fallback_secret_key_eleveto_ai_1997') {
    console.warn('⚠️ WARNING: JWT_SECRET is using fallback. Please set a secure JWT_SECRET in your .env file.');
}

/**
 * Generate a JWT token for a user.
 */
export function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name
        },
        JWT_SECRET,
        { expiresIn: '7d' } // Valid for 7 days
    );
}

/**
 * Middleware to authenticate JWT tokens from client request headers.
 */
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Authentication token required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('[Auth Error] Invalid token:', err.message);
            return res.status(403).json({ error: 'Session expired or invalid token.' });
        }
        req.user = decoded;
        next();
    });
}
