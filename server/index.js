import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import puppeteer from 'puppeteer';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import {
    processAriaMessage,
    sendWhatsAppMessage,
    isDuplicate,
    clearAriaSession,
    getAriaSessionCount
} from './aria_service.js';

dotenv.config({ path: '../.env' }); // Fallback to local .env if present
// Process environment variables will already be populated by Docker/Compose

// Initialize OpenAI (Requires OPENAI_API_KEY in .env)
const openai = new OpenAI();

const app = express();
const PORT = process.env.PORT || 3001;

// Use Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP if it interferes with certain public assets, or configure strictly
}));

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
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
    res.json({ status: 'ok', message: 'Eleveto Scraper Server running' });
});

/**
 * Scrape Google Maps for business listings.
 * Returns array of: { name, rating, reviews_count, phone, maps_link }
 */
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

        // Wait for the results panel
        const resultsSelector = '[role="feed"]';
        try {
            await page.waitForSelector(resultsSelector, { timeout: 15000 });
        } catch {
            console.log('[Scraper] No results panel found — zero results for this query');
            return [];
        }

        // Scroll to load more results
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

            // Check for "end of results" marker
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

        // Extract all result cards
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

                    // Rating and reviews
                    const ratingEl = parent.querySelector('[role="img"][aria-label*="star"]');
                    const ratingText = ratingEl?.getAttribute('aria-label') || '';
                    const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*star/i);
                    const rating = ratingMatch ? ratingMatch[1] : '';

                    const reviewsMatch = ratingText.match(/(\d[\d,]*)\s*review/i);
                    const reviews_count = reviewsMatch ? reviewsMatch[1].replace(/,/g, '') : '';

                    // Phone — look through all text spans
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
                } catch { /* skip bad card */ }
            });

            // Deduplicate by maps_link
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

// GET /api/debug/lead - Diagnostic endpoint for Live Environment Auth/Create testing
app.get('/api/debug/lead', async (req, res) => {
    if (req.query.key !== 'test1234') return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { default: PocketBase } = await import('pocketbase');
        const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

        // Ensure we test the EXACT ensureAuth logic but expose the error
        if (!email || !password) {
            return res.status(500).json({ 
                error: 'Missing PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD in environment',
                foundKeys: Object.keys(process.env).filter(k => k.includes('PB') || k.includes('ADMIN') || k.includes('EMAIL'))
            });
        }

        await pb.collection('_superusers').authWithPassword(email, password);

        // Attempt create
        const data = {
            whatsapp: '919999000333',
            name: 'Live Server Debug Lead',
            status: 'Qualified',
            investment: 'Not shared',
            country: 'Unknown'
        };

        const existing = await pb.collection('leads').getFirstListItem('whatsapp="919999000333"').catch(() => null);
        if (existing) await pb.collection('leads').delete(existing.id);

        const record = await pb.collection('leads').create(data);
        res.json({ success: true, pbUrl: pb.baseUrl, emailLog: email, record });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message, 
            pbData: err.data 
        });
    }
});

// POST /api/integrations/cal/sync
app.post('/api/integrations/cal/sync', async (req, res) => {
    // Use the UI-provided key, or fall back to the server's own key (same one Aria uses)
    const apiKey = req.body.apiKey || process.env.CALCOM_API_KEY;

    if (!apiKey) {
        return res.status(400).json({ error: 'No Cal.com API Key configured. Set CALCOM_API_KEY in .env.' });
    }

    try {
        console.log(`\n[Cal.com Sync] Fetching bookings from Cal.com...`);
        
        // 1. Fetch bookings from Cal.com
        const response = await fetch(`https://api.cal.com/v1/bookings?apiKey=${apiKey}&status=upcoming`);

        if (!response.ok) {
            const errData = await response.text();
            throw new Error(`Cal.com error: ${errData}`);
        }

        const data = await response.json();
        const calBookings = data.bookings || [];
        console.log(`[Cal.com Sync] Found ${calBookings.length} bookings`);

        // 2. Import PocketBase and upsert server-side
        const { default: PocketBase } = await import('pocketbase');
        const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');
        await pb.collection('_superusers').authWithPassword(
            process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL,
            process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
        );

        let created = 0, updated = 0, skipped = 0;

        for (const booking of calBookings) {
            try {
                // Map Cal.com status
                const statusMap = {
                    'accepted': 'Scheduled',
                    'confirmed': 'Scheduled',
                    'cancelled': 'Cancelled',
                    'pending': 'Scheduled',
                };
                const status = statusMap[booking.status?.toLowerCase()] || 'Scheduled';
                const title = (booking.title || `Meeting with ${booking.attendees?.[0]?.name || 'Guest'}`).trim() || 'Cal.com Meeting';
                const date = booking.startTime || booking.start;
                // duration — Cal.com uses eventLength OR duration, sometimes both are missing
                const rawDuration = booking.eventLength ?? booking.duration ?? booking.length;
                const duration = (typeof rawDuration === 'number' && rawDuration > 0) ? rawDuration : 30;
                const meetingLink = booking.metadata?.videoCallUrl || '';
                const calId = String(booking.id);

                // Skip if no valid date (can't save without it)
                if (!date) {
                    console.log(`  ⚠️ Skipping booking ${calId} — missing startTime`);
                    skipped++;
                    continue;
                }


                // Try to find existing record by cal booking ID in notes
                let existingRecord = null;
                try {
                    existingRecord = await pb.collection('bookings').getFirstListItem(`notes ~ "Cal.com ID: ${calId}"`);
                } catch (e) { /* not found = create */ }

                const record = {
                    title,
                    date,
                    duration,
                    status,
                    notes: `Synced from Cal.com (Cal.com ID: ${calId})`,
                };
                if (meetingLink && meetingLink.startsWith('http')) record.meeting_link = meetingLink;

                if (existingRecord) {
                    await pb.collection('bookings').update(existingRecord.id, record);
                    updated++;
                } else {
                    await pb.collection('bookings').create(record);
                    created++;
                }
            } catch (upsertErr) {
                console.error(`[Cal.com Sync] Failed to upsert booking ${booking.id}:`, upsertErr.message);
                skipped++;
            }
        }

        console.log(`[Cal.com Sync] Done. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
        res.json({ success: true, total: calBookings.length, created, updated, skipped });

    } catch (err) {
        console.error('[Cal.com Sync] Error:', err.message);
        res.status(500).json({ error: err.message || 'Sync failed' });
    }
});


/**
 * Evolution API WhatsApp Integration
 * Logic adapted from "WA Saathi"
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

        // 1. Try to create the instance
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

        // 2. If instance exists or was created, get the QR code
        // Evolution API might return QR immediately on create if qrcode: true
        if (createData?.qrcode?.base64) {
            return res.json({
                success: true,
                instanceName,
                qr: createData.qrcode.base64
            });
        }

        // Otherwise, fetch connection status/QR
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

app.post('/api/public/landing-ai', async (req, res) => {
    const { problem } = req.body;

    if (!problem) {
        return res.status(400).json({ error: 'problem statement is required' });
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Using a fast, cheap model for the public landing page
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
                {
                    role: "user",
                    content: problem
                }
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
 *  ARIA — WhatsApp AI Agent Webhook
 *  POST /webhook  (called by Evolution API)
 * ─────────────────────────────────────────────────
 */
const ariaRecentWebhooks = [];

app.post('/webhook', async (req, res) => {
    try {
        const { event, data } = req.body;
        console.log(`\n🔥 [Aria Webhook] Event: ${event}`);

        if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') return res.sendStatus(200);

        const msg = Array.isArray(data) ? data[0] : data;

        // Anti-loop: ignore messages older than 60s but within the last hour
        const rawTs = msg?.messageTimestamp;
        if (rawTs) {
            const age = Math.floor(Date.now() / 1000) - rawTs;
            if (age > 60 && age < 3600) {
                console.log(`[Aria] Skipping old message (${age}s).`);
                return res.sendStatus(200);
            }
        }

        // Acknowledge early to prevent Evolution API retries
        res.sendStatus(200);

        const key = msg?.key;
        const msgId = key?.id;
        const remoteJid = key?.remoteJid;
        const fromMe = key?.fromMe;
        const message = msg?.message;

        // Skip our own messages, groups, and duplicates
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
        const instanceName = req.body.instance || process.env.INSTANCE_NAME || 'Eleveto_Global';

        console.log(`\n📨 [Aria] From ${phone}: ${text}`);

        // Log to debug cache
        ariaRecentWebhooks.unshift({ time: new Date().toISOString(), phone, preview: text.substring(0, 60) });
        if (ariaRecentWebhooks.length > 10) ariaRecentWebhooks.pop();

        // Process with AI and reply
        const reply = await processAriaMessage(openai, text, phone);
        await sendWhatsAppMessage(remoteJid, reply, instanceName);

    } catch (error) {
        console.error('[Aria Webhook Error]:', error);
        if (!res.headersSent) res.sendStatus(500);
    }
});

// Clear a session (for testing): POST /api/aria/session/clear { "phone": "..." }
app.post('/api/aria/session/clear', (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    clearAriaSession(phone);
    res.json({ success: true });
});

// Aria status: GET /api/aria/status
app.get('/api/aria/status', (req, res) => {
    res.json({
        status: 'ARIA_ALIVE',
        activeSessions: getAriaSessionCount(),
        instance: process.env.INSTANCE_NAME || 'Eleveto_Global',
        recentWebhooks: ariaRecentWebhooks
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Eleveto Server → http://0.0.0.0:${PORT}`);
    console.log(`   Health check: http://0.0.0.0:${PORT}/api/health`);
    console.log(`   Aria webhook: POST http://0.0.0.0:${PORT}/webhook`);
    console.log(`   Aria status:  GET  http://0.0.0.0:${PORT}/api/aria/status\n`);
});
