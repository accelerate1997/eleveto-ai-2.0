require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { processMessage, clearSession, getActiveSessions } = require('./openai_service');
const { sendMessage } = require('./evolution');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Eleveto_Global';

// ─── De-duplication Cache ──────────────────────────────────────────────────
const processedMessages = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isDuplicate(id) {
    const now = Date.now();
    if (processedMessages.has(id)) return true;
    processedMessages.set(id, now);
    if (processedMessages.size > 1000) {
        for (const [key, ts] of processedMessages.entries()) {
            if (now - ts > CACHE_TTL) processedMessages.delete(key);
        }
    }
    return false;
}

// ─── Debug Cache ───────────────────────────────────────────────────────────
const recentWebhooks = [];

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ARIA_ALIVE',
        instance: INSTANCE_NAME,
        activeSessions: getActiveSessions().length,
        recentWebhooks
    });
});

// ─── Webhook ───────────────────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
    try {
        const { event, data } = req.body;
        console.log(`\n🔥 WEBHOOK: ${event}`);

        // Only process incoming messages
        if (event !== 'messages.upsert') {
            return res.sendStatus(200);
        }

        const msg = Array.isArray(data) ? data[0] : data;

        // Anti-loop: ignore messages older than 60s but younger than 1hr
        const rawTs = msg?.messageTimestamp;
        if (rawTs) {
            const age = Math.floor(Date.now() / 1000) - rawTs;
            if (age > 60 && age < 3600) {
                console.log(`[IGNORE] Old message (${age}s). Skipping.`);
                return res.sendStatus(200);
            }
        }

        // Acknowledge quickly to prevent Evolution API retries
        res.sendStatus(200);

        const key = msg?.key;
        const msgId = key?.id;
        const remoteJid = key?.remoteJid;
        const fromMe = key?.fromMe;
        const message = msg?.message;

        // De-duplicate
        if (msgId && isDuplicate(msgId)) {
            console.log(`[IGNORE] Duplicate msg: ${msgId}`);
            return;
        }

        // Skip our own messages and group messages
        if (!message || !remoteJid || fromMe) return;
        if (remoteJid.includes('@g.us')) {
            console.log('[IGNORE] Group message.');
            return;
        }

        const text = message.conversation ||
            message.extendedTextMessage?.text ||
            message.imageMessage?.caption;

        if (!text) return;

        const phone = remoteJid.split('@')[0];
        console.log(`\n📨 From ${phone}: ${text}`);

        // Add to debug log
        recentWebhooks.unshift({ time: new Date().toISOString(), phone, text: text.substring(0, 60) });
        if (recentWebhooks.length > 10) recentWebhooks.pop();

        // Get AI response and send it
        const reply = await processMessage(text, phone);
        console.log(`💬 Reply to ${phone}: ${reply.substring(0, 80)}...`);
        await sendMessage(remoteJid, reply, INSTANCE_NAME);

    } catch (error) {
        console.error('Webhook error:', error);
        if (!res.headersSent) res.sendStatus(500);
    }
});

// ─── Debug Endpoints ───────────────────────────────────────────────────────
// Clear a session for testing: POST /api/session/clear { "phone": "911234567890" }
app.post('/api/session/clear', (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    clearSession(phone);
    res.json({ success: true, message: `Session cleared for ${phone}` });
});

// ─── Start Server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('\n🌟🌟🌟 ARIA STARTUP 🌟🌟🌟');
    console.log(`🤖 Eleveto WhatsApp AI Agent running on port ${PORT}`);
    console.log(`📱 Instance: ${INSTANCE_NAME}`);
    console.log(`🔗 Webhook endpoint: POST /webhook`);
    console.log(`❤️  Health check: GET /health\n`);
});
