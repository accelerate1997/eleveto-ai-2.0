import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import puppeteer from 'puppeteer';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Database & Local Modules
import pool from './db.js';
import { initDb } from './init_db.js';
import { seedUsers } from './seed_users.js';
import { initSocket, broadcast } from './socket.js';
import { generateToken, authenticateToken } from './auth.js';
import {
    processAriaMessage,
    sendWhatsAppMessage,
    isDuplicate,
    clearAriaSession,
    getAriaSessionCount,
    syncLead,
    sendWhatsAppMedia
} from './aria_service.js';
import { checkAndSendReminders, startReminderService } from './reminder_service.js';
import { startFollowupService } from './followup_service.js';

dotenv.config({ path: '../.env' }); // Fallback to local .env if present

// Initialize OpenAI (Requires OPENAI_API_KEY in .env)
const openai = new OpenAI();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.io initialization
const io = new Server(httpServer, {
    cors: {
        origin: '*', // Allow all origins for simplicity in self-hosted setups, or configure strictly
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});
initSocket(io);

// Multer upload configuration for handling file attachments
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = 'uploads/';
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Serve uploads folder static
app.use('/uploads', express.static('uploads'));

// GET /api/files/:collection/:id/:filename (PocketBase file resolution compatibility)
app.get('/api/files/:collection/:id/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// Use Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP if it interferes with public assets
}));

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' }
});

// Dynamic CORS configuration
const defaultOrigins = [
    'http://localhost',
    'capacitor://localhost',
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175',
    'https://elevetoai.com',
    'https://api-eleveto.31.97.231.139.sslip.io'
];

const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? [...new Set([...process.env.ALLOWED_ORIGINS.split(','), ...defaultOrigins])]
    : defaultOrigins;

app.use(cors({ 
    origin: (origin, callback) => {
        if (!origin || 
            origin.startsWith('http://localhost') || 
            origin.startsWith('https://localhost') || 
            origin.startsWith('capacitor://') || 
            origin.startsWith('file://') ||
            allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`[CORS Error] Blocked Origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use('/api/', limiter); // Apply rate limiter to all API routes

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Eleveto Scraper Server running with PostgreSQL backend' });
});

/**
 * ─────────────────────────────────────────────────
 *  AUTHENTICATION ROUTER
 * ─────────────────────────────────────────────────
 */

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const queryRes = await pool.query('SELECT * FROM public.users WHERE email = $1', [email.toLowerCase().trim()]);
        const user = queryRes.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = generateToken(user);
        res.json({
            token,
            record: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                active: user.active
            }
        });
    } catch (err) {
        console.error('[Login Error]:', err.message);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const queryRes = await pool.query('SELECT id, email, name, role, active, created_at FROM public.users WHERE id = $1', [req.user.id]);
        const user = queryRes.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User session not found.' });
        }
        res.json({ record: user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/register-with-invite
app.post('/api/auth/register-with-invite', async (req, res) => {
    const { email, name, password, token } = req.body;
    if (!email || !name || !password || !token) {
        return res.status(400).json({ error: 'All fields and registration token are required.' });
    }

    try {
        // Verify token
        const inviteRes = await pool.query(
            'SELECT * FROM public.invites WHERE email = $1 AND token = $2 AND consumed = false',
            [email.toLowerCase().trim(), token]
        );
        const invite = inviteRes.rows[0];
        if (!invite) {
            return res.status(400).json({ error: 'Invalid or expired invitation token.' });
        }

        const checkUser = await pool.query('SELECT id FROM public.users WHERE email = $1', [email.toLowerCase().trim()]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email is already registered.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const userRes = await pool.query(
            'INSERT INTO public.users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
            [email.toLowerCase().trim(), passwordHash, name, invite.role]
        );

        // Mark invite consumed
        await pool.query('UPDATE public.invites SET consumed = true WHERE id = $1', [invite.id]);

        const user = userRes.rows[0];
        const authToken = generateToken(user);

        res.json({ token: authToken, user });
    } catch (err) {
        console.error('[Registration Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/users (Public signup)
app.post('/api/users', async (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password and name are required.' });
    }

    try {
        const checkUser = await pool.query('SELECT id FROM public.users WHERE email = $1', [email.toLowerCase().trim()]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const userRes = await pool.query(
            'INSERT INTO public.users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, active',
            [email.toLowerCase().trim(), passwordHash, name, role || 'employee']
        );
        res.status(201).json(userRes.rows[0]);
    } catch (err) {
        console.error('[Public Sign-up Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * ─────────────────────────────────────────────────
 *  LEADS ENDPOINTS (CRUD)
 * ─────────────────────────────────────────────────
 */

// GET /api/leads
app.get('/api/leads', authenticateToken, async (req, res) => {
    try {
        const queryRes = await pool.query('SELECT * FROM public.leads ORDER BY created_at DESC');
        res.json(queryRes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/leads
app.post('/api/leads', authenticateToken, async (req, res) => {
    const { name, email, whatsapp, country, industry, investment, status, source, notes, sequence_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        const insertQuery = `
            INSERT INTO public.leads (name, email, whatsapp, country, industry, investment, status, source, notes, sequence_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        const values = [
            name, email || null, whatsapp || null, country || null, 
            industry || null, investment || null, status || 'Lead', 
            source || 'Manual Entry', notes || '', sequence_id || null, req.user.id
        ];

        const queryRes = await pool.query(insertQuery, values);
        const lead = queryRes.rows[0];
        broadcast('leads:create', lead);
        res.status(201).json(lead);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/leads/:id
app.put('/api/leads/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    try {
        const updates = [];
        const values = [];
        let index = 1;

        const allowedFields = [
            'name', 'email', 'whatsapp', 'country', 'industry', 'investment', 
            'status', 'source', 'notes', 'ai_disabled', 'sequence_id', 'followup_date', 'followup_active', 'followup_count', 'last_followup_sent', 'custom_followup'
        ];

        for (const [key, val] of Object.entries(body)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = $${index}`);
                values.push(val);
                index++;
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields provided for update' });
        }

        values.push(id);
        const queryStr = `UPDATE public.leads SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`;
        
        const queryRes = await pool.query(queryStr, values);
        const lead = queryRes.rows[0];

        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        broadcast('leads:update', lead);
        res.json(lead);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/leads/:id
app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const queryRes = await pool.query('DELETE FROM public.leads WHERE id = $1 RETURNING id', [id]);
        if (queryRes.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
        broadcast('leads:delete', { id });
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * ─────────────────────────────────────────────────
 *  BOOKINGS ENDPOINTS
 * ─────────────────────────────────────────────────
 */

// GET /api/bookings
app.get('/api/bookings', authenticateToken, async (req, res) => {
    try {
        const queryRes = await pool.query(`
            SELECT b.*, 
                   (SELECT json_build_object('id', l.id, 'name', l.name, 'email', l.email, 'whatsapp', l.whatsapp, 'status', l.status) 
                    FROM public.leads l WHERE l.id = b.lead_id) as lead 
            FROM public.bookings b 
            ORDER BY b.date ASC
        `);
        res.json(queryRes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/bookings
app.post('/api/bookings', authenticateToken, async (req, res) => {
    const { title, date, duration, status, notes, meeting_link, reschedule_link, lead_id } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'title and date are required' });

    try {
        const insertQuery = `
            INSERT INTO public.bookings (title, date, duration, status, notes, meeting_link, reschedule_link, lead_id, reminders_sent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const values = [
            title, date, duration || 30, status || 'Scheduled', 
            notes || '', meeting_link || '', reschedule_link || '', 
            lead_id || null, JSON.stringify([])
        ];

        const queryRes = await pool.query(insertQuery, values);
        const booking = queryRes.rows[0];
        broadcast('bookings:create', booking);
        res.status(201).json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/bookings/:id
app.put('/api/bookings/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    try {
        const updates = [];
        const values = [];
        let index = 1;

        const allowedFields = [
            'title', 'date', 'duration', 'status', 'notes', 'meeting_link', 'reschedule_link', 'lead_id', 'reminders_sent'
        ];

        for (const [key, val] of Object.entries(body)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = $${index}`);
                values.push(key === 'reminders_sent' ? JSON.stringify(val) : val);
                index++;
            }
        }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields provided' });

        values.push(id);
        const queryStr = `UPDATE public.bookings SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`;
        const queryRes = await pool.query(queryStr, values);
        const booking = queryRes.rows[0];

        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        broadcast('bookings:update', booking);
        res.json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/bookings/:id
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const queryRes = await pool.query('DELETE FROM public.bookings WHERE id = $1 RETURNING id', [id]);
        if (queryRes.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
        broadcast('bookings:delete', { id });
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * ─────────────────────────────────────────────────
 *  MESSAGES ENDPOINTS
 * ─────────────────────────────────────────────────
 */

// GET /api/messages/:leadId
app.get('/api/messages/:leadId', authenticateToken, async (req, res) => {
    const { leadId } = req.params;
    try {
        const queryRes = await pool.query('SELECT * FROM public.messages WHERE lead_id = $1 ORDER BY created_at ASC', [leadId]);
        res.json(queryRes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/messages (Supports file upload)
app.post('/api/messages', authenticateToken, upload.single('attachment'), async (req, res) => {
    const { lead, role, content } = req.body;
    if (!lead || !role) return res.status(400).json({ error: 'lead and role are required' });

    try {
        let attachment_path = null;
        if (req.file) {
            attachment_path = req.file.filename;
        }

        const insertQuery = `
            INSERT INTO public.messages (lead_id, role, content, attachment_path, source)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [lead, role, content || '', attachment_path, 'Manual'];
        const queryRes = await pool.query(insertQuery, values);
        const msg = queryRes.rows[0];
        
        broadcast('messages:create', msg);
        res.status(201).json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * ─────────────────────────────────────────────────
 *  SEQUENCES ENDPOINTS
 * ─────────────────────────────────────────────────
 */

// GET /api/sequences
app.get('/api/sequences', authenticateToken, async (req, res) => {
    try {
        const queryRes = await pool.query('SELECT * FROM public.sequences ORDER BY name ASC');
        res.json(queryRes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/sequences
app.post('/api/sequences', authenticateToken, async (req, res) => {
    const { name, description, steps } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    try {
        const queryRes = await pool.query(
            'INSERT INTO public.sequences (name, description, steps, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description || '', JSON.stringify(steps || []), req.user.id]
        );
        res.status(201).json(queryRes.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * ─────────────────────────────────────────────────
 *  INVITES ENDPOINTS
 * ─────────────────────────────────────────────────
 */

// GET /api/invites
app.get('/api/invites', authenticateToken, async (req, res) => {
    const { token } = req.query;
    try {
        let queryRes;
        if (token) {
            queryRes = await pool.query('SELECT * FROM public.invites WHERE token = $1 AND consumed = false', [token]);
        } else {
            queryRes = await pool.query('SELECT * FROM public.invites ORDER BY created_at DESC');
        }
        
        const mapped = queryRes.rows.map(i => ({
            id: i.id,
            email: i.email,
            role: i.role,
            token: i.token,
            used: i.consumed,
            created_at: i.created_at
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/invites/:id (Update invite consumed status)
app.put('/api/invites/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { used } = req.body;
    try {
        const queryRes = await pool.query(
            'UPDATE public.invites SET consumed = $1 WHERE id = $2 RETURNING *',
            [used !== undefined ? used : true, id]
        );
        const invite = queryRes.rows[0];
        if (!invite) return res.status(404).json({ error: 'Invite not found' });
        
        res.json({
            id: invite.id,
            email: invite.email,
            role: invite.role,
            token: invite.token,
            used: invite.consumed,
            created_at: invite.created_at
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/invites
app.post('/api/invites', authenticateToken, async (req, res) => {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    try {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const queryRes = await pool.query(
            'INSERT INTO public.invites (email, role, token) VALUES ($1, $2, $3) RETURNING *',
            [email.toLowerCase().trim(), role || 'employee', token]
        );
        res.status(201).json(queryRes.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/invites/:id
app.delete('/api/invites/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM public.invites WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * ─────────────────────────────────────────────────
 *  TEAM/USERS ENDPOINTS
 * ─────────────────────────────────────────────────
 */

// GET /api/users
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const queryRes = await pool.query('SELECT id, email, name, role, active, cal_api_key, cal_username, google_meet_link, created_at FROM public.users ORDER BY name ASC');
        res.json(queryRes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users/:id
app.get('/api/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const queryRes = await pool.query('SELECT id, email, name, role, active, cal_api_key, cal_username, google_meet_link, created_at FROM public.users WHERE id = $1', [id]);
        const user = queryRes.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/users/:id
app.put('/api/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    try {
        const updates = [];
        const values = [];
        let index = 1;

        const allowedFields = [
            'name', 'email', 'role', 'active', 'cal_api_key', 'cal_username', 'google_meet_link'
        ];

        for (const [key, val] of Object.entries(body)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = $${index}`);
                values.push(val);
                index++;
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields provided for update' });
        }

        values.push(id);
        const queryStr = `UPDATE public.users SET ${updates.join(', ')} WHERE id = $${index} RETURNING id, email, name, role, active, cal_api_key, cal_username, google_meet_link`;
        
        const queryRes = await pool.query(queryStr, values);
        const updatedUser = queryRes.rows[0];

        if (!updatedUser) return res.status(404).json({ error: 'User not found' });
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * ─────────────────────────────────────────────────
 *  PORTFOLIO ENDPOINTS
 * ─────────────────────────────────────────────────
 */

// GET /api/Portoflio (named Portoflio/portfolios for compatibility)
app.get(['/api/Portoflio', '/api/portfolios'], async (req, res) => {
    try {
        const queryRes = await pool.query('SELECT * FROM public.portfolios ORDER BY created_at DESC');
        // Map postgres field names to pocketbase-like field names for frontend compatibility
        const mapped = queryRes.rows.map(p => ({
            id: p.id,
            project_name: p.project_name,
            Desicription_: p.description,
            Project_thumnail: p.project_thumbnail,
            project_images_: p.project_images,
            created: p.created_at
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/Portoflio (Supports thumbnail and gallery file uploads)
app.post(['/api/Portoflio', '/api/portfolios'], authenticateToken, upload.fields([
    { name: 'Project_thumnail', maxCount: 1 },
    { name: 'project_images_', maxCount: 10 }
]), async (req, res) => {
    const { project_name, Desicription_ } = req.body;
    if (!project_name) return res.status(400).json({ error: 'project_name is required' });

    try {
        let thumbnail = null;
        if (req.files?.['Project_thumnail']?.[0]) {
            thumbnail = req.files['Project_thumnail'][0].filename;
        }

        const images = [];
        if (req.files?.['project_images_']) {
            req.files['project_images_'].forEach(file => {
                images.push(file.filename);
            });
        }

        const queryRes = await pool.query(
            'INSERT INTO public.portfolios (project_name, description, project_images, project_thumbnail) VALUES ($1, $2, $3, $4) RETURNING *',
            [project_name, Desicription_ || '', JSON.stringify(images), thumbnail]
        );
        const p = queryRes.rows[0];
        
        // Map output compatibility
        res.status(201).json({
            id: p.id,
            project_name: p.project_name,
            Desicription_: p.description,
            Project_thumnail: p.project_thumbnail,
            project_images_: p.project_images,
            created: p.created_at
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/Portoflio/:id
app.delete(['/api/Portoflio/:id', '/api/portfolios/:id'], authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM public.portfolios WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * ─────────────────────────────────────────────────
 *  CLIENT CREDENTIALS ENDPOINTS
 * ─────────────────────────────────────────────────
 */

// GET /api/client_credentials
app.get('/api/client_credentials', authenticateToken, async (req, res) => {
    const { client_id } = req.query;
    try {
        let queryRes;
        if (client_id) {
            queryRes = await pool.query('SELECT * FROM public.client_credentials WHERE client_id = $1 ORDER BY created_at DESC', [client_id]);
        } else {
            queryRes = await pool.query('SELECT * FROM public.client_credentials ORDER BY created_at DESC');
        }
        res.json(queryRes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/client_credentials
app.post('/api/client_credentials', authenticateToken, async (req, res) => {
    const { client_id, platform_name, platform_id, password, api_keys, platform_url } = req.body;
    if (!client_id || !platform_name) {
        return res.status(400).json({ error: 'client_id and platform_name are required' });
    }

    try {
        const queryRes = await pool.query(
            `INSERT INTO public.client_credentials (client_id, platform_name, platform_id, password, api_keys, platform_url)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [client_id, platform_name, platform_id || '', password || '', api_keys || '', platform_url || '']
        );
        res.status(201).json(queryRes.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/client_credentials/:id
app.delete('/api/client_credentials/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM public.client_credentials WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


/**
 * ─────────────────────────────────────────────────
 *  GOOGLE MAPS SCRAPER
 * ─────────────────────────────────────────────────
 */

// POST /api/scrape
app.post('/api/scrape', async (req, res) => {
    const { keyword = '', location = '', industry = '', maxScrolls = 50 } = req.body;

    if (!keyword || !location) {
        return res.status(400).json({ error: 'keyword and location are required' });
    }

    const parts = [keyword, industry, 'in', location].filter(p => p.trim());
    const searchQuery = parts.join(' ');

    console.log(`\n[Scraper] Request: "${searchQuery}" | maxScrolls: ${maxScrolls}`);

    try {
        const results = await scrapeGoogleMaps({
            searchQuery,
            maxScrollAttempts: Math.min(Number(maxScrolls) || 50, 200),
        });
        res.json({ results, count: results.length, query: searchQuery });
    } catch (err) {
        console.error('[Scraper] Error:', err.message);
        res.status(500).json({ error: err.message || 'Scrape failed' });
    }
});

async function scrapeGoogleMaps({ searchQuery, maxScrollAttempts = 50 }) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1280, height: 900 });

        const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
        console.log(`[Scraper] Navigating to: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const resultsSelector = '[role="feed"]';
        try {
            await page.waitForSelector(resultsSelector, { timeout: 15000 });
        } catch {
            console.log('[Scraper] No results panel found — zero results for this query');
            return [];
        }

        let previousCount = 0;
        let noChangeCount = 0;

        for (let i = 0; i < maxScrollAttempts; i++) {
            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) el.scrollTop = el.scrollHeight;
            }, resultsSelector);

            await new Promise(r => setTimeout(r, 800));

            const current = await page.evaluate((sel) => {
                return document.querySelectorAll(`${sel} > div`).length;
            }, resultsSelector);

            const endOfResults = await page.evaluate(() => {
                const spans = [...document.querySelectorAll('span')];
                return spans.some(s => s.textContent.includes("You've reached the end of the list"));
            });

            if (endOfResults) {
                console.log(`[Scraper] Reached end of list after ${i + 1} scrolls`);
                break;
            }

            if (current === previousCount) {
                noChangeCount++;
                if (noChangeCount >= 3) break;
            } else {
                noChangeCount = 0;
            }
            previousCount = current;
        }

        const results = await page.evaluate(() => {
            const cards = document.querySelectorAll('[role="feed"] > div > div > a');
            const data = [];

            cards.forEach(card => {
                try {
                    const parent = card.closest('[role="feed"] > div');
                    if (!parent) return;

                    const name = card.querySelector('.fontHeadlineSmall, [aria-label]')?.textContent?.trim()
                        || card.getAttribute('aria-label')?.trim()
                        || '';

                    if (!name) return;

                    const ratingEl = parent.querySelector('[role="img"][aria-label*="star"]');
                    const ratingText = ratingEl?.getAttribute('aria-label') || '';
                    const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*star/i);
                    const rating = ratingMatch ? ratingMatch[1] : '';

                    const reviewsMatch = ratingText.match(/(\d[\d,]*)\s*review/i);
                    const reviews_count = reviewsMatch ? reviewsMatch[1].replace(/,/g, '') : '';

                    let phone = '';
                    const spans = parent.querySelectorAll('span');
                    spans.forEach(s => {
                        const t = s.textContent.trim();
                        if (/^\+?[\d\s\-().]{7,20}$/.test(t) && !phone) phone = t;
                    });

                    const maps_link = card.href || '';

                    if (name) {
                        data.push({ name, rating, reviews_count, phone, maps_link });
                    }
                } catch { /* skip */ }
            });

            const seen = new Set();
            return data.filter(d => {
                const key = d.maps_link || d.name;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        });

        console.log(`[Scraper] Done — ${results.length} results extracted`);
        return results;

    } finally {
        await browser.close();
    }
}

/**
 * ─────────────────────────────────────────────────
 *  CAL.COM INTEGRATION & WORKERS
 * ─────────────────────────────────────────────────
 */

async function syncCalBookings(apiKey) {
    if (!apiKey) apiKey = process.env.CALCOM_API_KEY;
    if (!apiKey) throw new Error('No Cal.com API Key configured.');

    console.log(`\n[Cal.com Sync] 🔄 Fetching bookings from Cal.com...`);
    const response = await fetch(`https://api.cal.com/v2/bookings?status=upcoming`, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'cal-api-version': '2024-08-13'
        }
    });

    if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Cal.com error: ${errData}`);
    }

    const resJson = await response.json();
    const calBookings = resJson.data || resJson.bookings || [];
    console.log(`[Cal.com Sync] 📥 Found ${calBookings.length} upcoming bookings`);

    const client = await pool.connect();
    let created = 0, updated = 0, skipped = 0;
    const now = new Date();

    try {
        for (const booking of calBookings) {
            try {
                const date = booking.start || booking.startTime;
                const startTime = new Date(date);

                if (startTime < now) {
                    console.log(`  ⏭️ Skipping past booking ${booking.id} (${date})`);
                    continue;
                }

                const statusMap = {
                    'accepted': 'Scheduled',
                    'confirmed': 'Scheduled',
                    'cancelled': 'Cancelled',
                    'pending': 'Scheduled',
                };
                const status = statusMap[booking.status?.toLowerCase()] || 'Scheduled';
                const title = (booking.title || `Meeting with ${booking.attendees?.[0]?.name || 'Guest'}`).trim() || 'Cal.com Meeting';
                const rawDuration = booking.duration ?? booking.eventLength ?? booking.length;
                const duration = (typeof rawDuration === 'number' && rawDuration > 0) ? rawDuration : 30;
                const meetingLink = booking.meetingUrl || booking.metadata?.videoCallUrl || '';
                const calId = String(booking.id);
                const rescheduleUrl = booking.uid ? `https://cal.com/reschedule/${booking.uid}` : '';

                // Try to find existing record by notes matching Cal.com ID
                const checkRes = await client.query('SELECT * FROM public.bookings WHERE notes LIKE $1', [`%Cal.com ID: ${calId}%`]);
                const existingRecord = checkRes.rows[0];

                // Attempt to link to lead_id if possible
                let leadId = null;
                const leadEmail = booking.attendees?.[0]?.email || '';
                const leadPhone = booking.attendees?.[0]?.timeZone || ''; // Fallback / metadata parsing if present
                
                const leadQuery = await client.query('SELECT id FROM public.leads WHERE email = $1 OR whatsapp = $2', [leadEmail, leadPhone]);
                if (leadQuery.rows.length > 0) {
                    leadId = leadQuery.rows[0].id;
                }

                if (existingRecord) {
                    let sent = [];
                    try {
                        sent = existingRecord.reminders_sent ? (typeof existingRecord.reminders_sent === 'string' ? JSON.parse(existingRecord.reminders_sent) : existingRecord.reminders_sent) : [];
                    } catch (e) { sent = []; }

                    const updateQuery = `
                        UPDATE public.bookings
                        SET title = $1, date = $2, duration = $3, status = $4, meeting_link = $5, reschedule_link = $6, lead_id = $7, reminders_sent = $8
                        WHERE id = $9
                        RETURNING *
                    `;
                    const uRes = await client.query(updateQuery, [
                        title, date, duration, status, meetingLink, rescheduleUrl, leadId, JSON.stringify(sent), existingRecord.id
                    ]);
                    broadcast('bookings:update', uRes.rows[0]);
                    updated++;
                } else {
                    const insertQuery = `
                        INSERT INTO public.bookings (title, date, duration, status, notes, reschedule_link, lead_id, meeting_link, reminders_sent)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        RETURNING *
                    `;
                    const bRes = await client.query(insertQuery, [
                        title, date, duration, status, `Synced from Cal.com (Cal.com ID: ${calId})`, rescheduleUrl, leadId, meetingLink, JSON.stringify([])
                    ]);
                    broadcast('bookings:create', bRes.rows[0]);
                    created++;
                }
            } catch (upsertErr) {
                console.error(`[Cal.com Sync] Failed to upsert booking ${booking.id}:`, upsertErr.message);
                skipped++;
            }
        }
    } finally {
        client.release();
    }

    console.log(`[Cal.com Sync] ✅ Done. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
    return { total: calBookings.length, created, updated, skipped };
}

// POST /api/integrations/cal/sync
app.post('/api/integrations/cal/sync', async (req, res) => {
    try {
        const result = await syncCalBookings(req.body.apiKey);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Cal.com Sync API] Error:', err.message);
        res.status(500).json({ error: err.message || 'Sync failed' });
    }
});

// Automated Sync Interval (Every 60 minutes)
setInterval(() => {
    syncCalBookings().catch(err => console.error('[Auto Sync] Error:', err.message));
}, 60 * 60 * 1000);


/**
 * ─────────────────────────────────────────────────
 *  EVOLUTION WHATSAPP GATEWAY
 * ─────────────────────────────────────────────────
 */

// POST /api/whatsapp/connect
app.post('/api/whatsapp/connect', async (req, res) => {
    try {
        const { instanceName } = req.body;
        if (!instanceName) {
            return res.status(400).json({ error: 'Instance Name is required' });
        }

        const evoUrlSource = process.env.EVOLUTION_API_URL || '';
        const evoUrl = evoUrlSource.endsWith('/') ? evoUrlSource.slice(0, -1) : evoUrlSource;
        const evoKey = process.env.EVOLUTION_API_KEY;

        if (!evoUrl || !evoKey || evoUrl.includes('your-evolution-api-url') || evoKey === 'your_evolution_api_key_here') {
            console.warn("⚠️ Evolution API not configured in .env. Returning Mock Connection.");
            return res.json({
                success: true,
                mock: true,
                message: "Evolution API not configured. Using Mock mode.",
                qr: null
            });
        }

        console.log(`[WhatsApp] Connecting instance: ${instanceName}`);

        const createRes = await fetch(`${evoUrl}/instance/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evoKey
            },
            body: JSON.stringify({
                instanceName: instanceName,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS"
            })
        });

        const createData = await createRes.json();

        if (createData?.qrcode?.base64) {
            return res.json({
                success: true,
                instanceName,
                qr: createData.qrcode.base64
            });
        }

        const connectRes = await fetch(`${evoUrl}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evoKey }
        });

        const connectData = await connectRes.json();

        if (connectData?.base64) {
            return res.json({
                success: true,
                instanceName,
                qr: connectData.base64
            });
        } else if (connectData?.instance?.state === 'open' || createData?.instance?.state === 'open') {
            return res.json({
                success: true,
                instanceName,
                connected: true,
                message: "Already connected"
            });
        }

        res.status(500).json({ error: 'Failed to retrieve WhatsApp QR code', details: connectData });

    } catch (error) {
        console.error('[WhatsApp Connect] Error:', error);
        res.status(500).json({ error: 'Internal Server Error during WhatsApp connection' });
    }
});

// GET /api/whatsapp/status/:instanceName
app.get('/api/whatsapp/status/:instanceName', async (req, res) => {
    const { instanceName } = req.params;
    const evoUrlSource = process.env.EVOLUTION_API_URL || '';
    const evoUrl = evoUrlSource.endsWith('/') ? evoUrlSource.slice(0, -1) : evoUrlSource;
    const evoKey = process.env.EVOLUTION_API_KEY;

    if (!evoUrl || !evoKey || evoUrl.includes('your-evolution-api-url') || evoKey === 'your_evolution_api_key_here') {
        return res.json({ success: true, state: 'DISCONNECTED', mock: true });
    }

    try {
        const response = await fetch(`${evoUrl}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evoKey }
        });

        const data = await response.json();
        res.json({
            success: true,
            state: data?.instance?.state || 'DISCONNECTED',
            details: data
        });
    } catch (error) {
        console.error('[WhatsApp Status] Error:', error);
        res.status(500).json({ error: 'Failed to fetch connection status' });
    }
});

// POST /api/public/landing-ai (Public bottleneck solver)
app.post('/api/public/landing-ai', async (req, res) => {
    const { problem } = req.body;
    if (!problem) return res.status(400).json({ error: 'problem statement is required' });

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are Eleveto AI Core, an advanced autonomous system architect for an AI Automation Agency.
A user will provide a business bottleneck or problem.
Your job is to reply with a hyper-concise, highly technical 3-step automation solution.

FORMATTING RULES:
- Do NOT use Markdown (no asterisks, no bolding).
- Provide exactly 3 steps, prefixing each with a step number.
- Make it sound futuristic, robotic, yet realistic (e.g., NLP extraction, API syncing, autonomous agents).
- Keep each step under 15 words.
- End with a final line starting with "Solution: " summarizing the impact.`
                },
                { role: "user", content: problem }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        const aiText = completion.choices[0].message.content;
        res.json({ result: aiText });
    } catch (err) {
        console.error('[Landing AI] Error:', err.message);
        res.status(500).json({ error: 'Failed to generate solution' });
    }
});

/**
 * ─────────────────────────────────────────────────
 *  ARIA WHATSAPP AGENT WEBHOOK (Evolution API)
 * ─────────────────────────────────────────────────
 */
const ariaRecentWebhooks = [];

app.post('/webhook', async (req, res) => {
    try {
        const { event, data } = req.body;
        console.log(`\n🔥 [Aria Webhook] Event: ${event}`);

        if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') return res.sendStatus(200);

        const msg = Array.isArray(data) ? data[0] : data;
        const rawTs = msg?.messageTimestamp;
        if (rawTs) {
            const age = Math.floor(Date.now() / 1000) - rawTs;
            if (age > 60 && age < 3600) {
                console.log(`[Aria] Skipping old message (${age}s).`);
                return res.sendStatus(200);
            }
        }

        res.sendStatus(200);

        const key = msg?.key;
        const msgId = key?.id;
        const remoteJid = key?.remoteJid;
        const fromMe = key?.fromMe;
        const message = msg?.message;

        if (!message || !remoteJid || fromMe) return;
        if (remoteJid.includes('@g.us')) return;
        if (msgId && isDuplicate(msgId)) {
            console.log(`[Aria] Duplicate msg ${msgId}, skipping.`);
            return;
        }

        const text = message.conversation ||
            message.extendedTextMessage?.text ||
            message.imageMessage?.caption;

        if (!text) return;

        const phone = remoteJid.split('@')[0];
        const instanceName = req.body.instance || process.env.INSTANCE_NAME || 'Eleveto_gx3yachgic1mjxv';

        console.log(`\n📨 [Aria] From ${phone}: ${text}`);

        ariaRecentWebhooks.unshift({ time: new Date().toISOString(), phone, preview: text.substring(0, 60) });
        if (ariaRecentWebhooks.length > 10) ariaRecentWebhooks.pop();

        const reply = await processAriaMessage(openai, text, phone);
        if (reply) {
            await sendWhatsAppMessage(remoteJid, reply, instanceName);
        }

    } catch (error) {
        console.error('[Aria Webhook Error]:', error);
        if (!res.headersSent) res.sendStatus(500);
    }
});

/**
 * ─────────────────────────────────────────────────
 *  META ADS LEAD GEN WEBHOOK
 * ─────────────────────────────────────────────────
 */

// GET /api/webhooks/meta (Meta verification challenge)
app.get('/api/webhooks/meta', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.META_VERIFY_TOKEN || 'elevetoai1997leadform';

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('✅ Meta Webhook verified successfully.');
        return res.status(200).send(challenge);
    }
    console.warn('❌ Meta Webhook verification failed. Token mismatch.');
    res.sendStatus(403);
});

// POST /api/webhooks/meta (Receives webhook event)
app.post('/api/webhooks/meta', async (req, res) => {
    const body = req.body;

    // Acknowledge the event receipt immediately to Meta to avoid timeouts
    res.status(200).send('EVENT_RECEIVED');

    if (body.object === 'page') {
        try {
            for (const entry of body.entry) {
                if (!entry.changes) continue;
                for (const change of entry.changes) {
                    if (change.field === 'leadgen') {
                        const leadgenId = change.value.leadgen_id;
                        console.log(`\n📥 [Meta Webhook] New lead gen notification: leadgen_id=${leadgenId}`);

                        // Fetch details from Meta Graph API
                        const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
                        if (!pageAccessToken) {
                            console.error('❌ Error: META_PAGE_ACCESS_TOKEN not set in environment.');
                            continue;
                        }

                        const graphUrl = `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${pageAccessToken}`;
                        const response = await fetch(graphUrl);
                        if (!response.ok) {
                            const errBody = await response.text();
                            console.error(`❌ Meta Graph API fetch failed (status ${response.status}):`, errBody);
                            continue;
                        }

                        const metaLead = await response.json();
                        console.log('🔍 [Meta Webhook] Lead data fetched:', JSON.stringify(metaLead));

                        let name = 'Meta Lead';
                        let email = '';
                        let phone = '';
                        let customNotes = '📋 META LEAD FORM RESPONSES:\n';

                        metaLead.field_data?.forEach(field => {
                            if (field.name === 'full_name') {
                                name = field.values[0] || name;
                            } else if (field.name === 'email') {
                                email = field.values[0] || email;
                            } else if (field.name === 'phone_number') {
                                phone = field.values[0] || phone;
                            } else {
                                const question = field.name.replace(/_/g, ' ');
                                const value = field.values[0] || 'N/A';
                                customNotes += `• ${question}: ${value}\n`;
                            }
                        });

                        if (!phone) {
                            console.warn('⚠️ Meta lead gen event missing phone number. Skipping.');
                            continue;
                        }

                        // Normalize phone number (keep digits only)
                        const normalizedPhone = phone.replace(/\D/g, '');

                        // Sync to database using our robust syncLead helper
                        await syncLead(normalizedPhone, {
                            name,
                            email,
                            notes: customNotes,
                            interest: 'Meta Ads Lead',
                            source: 'Meta Ads'
                        }, 'Lead');
                    }
                }
            }
        } catch (error) {
            console.error('❌ [Meta Webhook processing error]:', error.message);
        }
    }
});

/**
 * ─────────────────────────────────────────────────
 *  CAL.COM BOOKING WEBHOOK
 * ─────────────────────────────────────────────────
 */
app.post('/api/webhooks/cal', async (req, res) => {
    try {
        console.log('\n📥 [Cal Webhook] Incoming Request Payload');
        const payload = req.body.payload || req.body;
        const trigger = req.body.triggerEvent || payload.triggerEvent || 'BOOKING_CREATED';

        console.log(`📅 [Cal Webhook] Trigger: ${trigger}`);

        if (trigger !== 'BOOKING_CREATED') {
            return res.status(200).json({ message: 'Ignore non-creation events' });
        }

        const attendees = payload.attendees || payload.payload?.attendees || [];
        const responses = payload.responses || {};
        
        const attendee = attendees[0] || {};
        const name = attendee.name || responses.name?.value || payload.name || 'Guest';
        const email = attendee.email || responses.email?.value || payload.email || '';
        const phone = attendee.phoneNumber || attendee.attendeePhoneNumber || responses.phone?.value || '';
        const startTime = payload.startTime || payload.start || payload.payload?.startTime;
        const videoUrl = payload.videoCallUrl || payload.metadata?.videoCallUrl || payload.payload?.videoCallUrl || '';

        if (!phone) {
            console.log('[Cal Webhook] Phone not provided in payload.');
            return res.status(200).json({ success: false, message: 'No phone number' });
        }

        console.log(`   👤 Attendee: ${name} (${phone})`);
        
        // 1. Sync Lead to PostgreSQL
        await syncLead(phone, { name, email, interest: 'Meeting Booked via Cal.com' }, 'Meeting Booked');

        // 2. Trigger sync bookings job
        setTimeout(() => {
            syncCalBookings().catch(err => console.error('[Webhook Sync] Auto-sync failed:', err.message));
        }, 2000);

        // 3. Send confirmation WhatsApp message
        const formattedTime = new Date(startTime).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'full',
            timeStyle: 'short'
        });

        const confirmationText = `✅ *Meeting Confirmed!*
 
Hi *${name}*, your Strategy Meeting with *Eleveto AI* is officially booked.
 
📅 *Time:* ${formattedTime} (IST)
🔗 *Meeting Link:* ${videoUrl || 'Check your email invite'}
 
We look forward to seeing you there! 👋`;

        const instanceName = process.env.INSTANCE_NAME || 'Eleveto_gx3yachgic1mjxv';
        await sendWhatsAppMessage(phone, confirmationText, instanceName);

        res.json({ success: true, message: 'Lead synced and confirmation sent' });

    } catch (error) {
        console.error('[Cal Webhook Error]:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * ─────────────────────────────────────────────────
 *  MANUAL OUTBOUND MESSAGE DISPATCHER
 * ─────────────────────────────────────────────────
 */
app.post('/api/messages/send', async (req, res) => {
    try {
        const { leadId, text, mediaBase64, mimeType, fileName, skipLog } = req.body;
        if (!leadId) return res.status(400).json({ error: 'leadId is required' });
        if (!text && !mediaBase64) return res.status(400).json({ error: 'Either text or mediaBase64 is required' });

        const client = await pool.connect();
        try {
            const leadRes = await client.query('SELECT * FROM public.leads WHERE id = $1', [leadId]);
            const lead = leadRes.rows[0];

            if (!lead || !lead.whatsapp) {
                return res.status(404).json({ error: 'Lead or WhatsApp number not found' });
            }

            const instanceName = process.env.INSTANCE_NAME || 'Eleveto_gx3yachgic1mjxv';
            const remoteJid = `${lead.whatsapp}@s.whatsapp.net`;

            let sent = false;
            if (mediaBase64) {
                const cleanBase64 = mediaBase64.includes('base64,') ? mediaBase64.split('base64,')[1] : mediaBase64;
                sent = await sendWhatsAppMedia(remoteJid, cleanBase64, mimeType, fileName, text, instanceName);
            } else {
                sent = await sendWhatsAppMessage(remoteJid, text, instanceName);
            }

            if (sent) {
                if (!skipLog) {
                    const msgContent = text || `[Sent Media: ${fileName}]`;
                    const insertRes = await client.query(
                        'INSERT INTO public.messages (lead_id, role, content, source) VALUES ($1, \'manual\', $2, \'Manual\') RETURNING *',
                        [lead.id, msgContent]
                    );
                    broadcast('messages:create', insertRes.rows[0]);
                    return res.json({ success: true, message: insertRes.rows[0] });
                }
                return res.json({ success: true });
            } else {
                return res.status(500).json({ error: 'Failed to send WhatsApp message via Evolution API' });
            }
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[API Manual Chat Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/aria/session/clear
app.post('/api/aria/session/clear', (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    clearAriaSession(phone);
    res.json({ success: true });
});

// GET /api/aria/status
app.get('/api/aria/status', (req, res) => {
    res.json({
        status: 'ARIA_ALIVE',
        activeSessions: getAriaSessionCount(),
        instance: process.env.INSTANCE_NAME || 'Eleveto_gx3yachgic1mjxv',
        recentWebhooks: ariaRecentWebhooks
    });
});

// Server Initialization
async function startServer() {
    try {
        // Init tables & seed user records
        await initDb();
        await seedUsers();

        // Start background workers
        startReminderService(15);
        startFollowupService(2);

        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 Eleveto Server → http://0.0.0.0:${PORT}`);
            console.log(`   Health check: http://0.0.0.0:${PORT}/api/health`);
            console.log(`   Aria webhook: POST http://0.0.0.0:${PORT}/webhook`);
            console.log(`   Aria status:  GET  http://0.0.0.0:${PORT}/api/aria/status\n`);
        });
    } catch (err) {
        console.error('❌ Server startup aborted due to DB connection issues:', err.message);
        process.exit(1);
    }
}

startServer();
