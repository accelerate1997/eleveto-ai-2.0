import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import puppeteer from 'puppeteer';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

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
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(cors({ 
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
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

// POST /api/integrations/cal/sync
app.post('/api/integrations/cal/sync', async (req, res) => {
    const { apiKey, userId } = req.body;

    if (!apiKey) {
        return res.status(400).json({ error: 'Cal.com API Key is required' });
    }

    try {
        console.log(`\n[Cal.com Sync] Fetching bookings for user: ${userId}`);
        
        // 1. Fetch bookings from Cal.com API
        const response = await fetch(`https://api.cal.com/v1/bookings?apiKey=${apiKey}`);
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Failed to fetch from Cal.com');
        }

        const data = await response.json();
        const calBookings = data.bookings || [];
        console.log(`[Cal.com Sync] Found ${calBookings.length} bookings on Cal.com`);

        // We'll return the bookings so the frontend can choose to save them 
        // OR we'd need a way to connect to PB from here.
        // For now, let's return them for the frontend to handle upserting
        // to keep the backend simple (avoiding admin auth overhead here if possible).
        
        res.json({ success: true, bookings: calBookings });
    } catch (err) {
        console.error('[Cal.com Sync] Error:', err.message);
        res.status(500).json({ error: err.message || 'Sync failed' });
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

app.listen(PORT, () => {
    console.log(`\n🚀 Eleveto Scraper Server → http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
