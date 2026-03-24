/**
 * aria_service.js
 * Aria — Eleveto WhatsApp AI Assistant
 * Loaded by the main server/index.js
 */
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load Aria's system prompt from the eleveto agent directory
const PROMPT_PATH = join(__dirname, '../eleveto agent/whatsapp_assistant_prompt.md');

function loadSystemPrompt() {
    if (!existsSync(PROMPT_PATH)) {
        console.warn('[Aria] whatsapp_assistant_prompt.md not found. Using fallback prompt.');
        return 'You are Aria, a friendly AI assistant for Eleveto AI. Help users understand our AI services and invite qualified leads to book a free strategy call.';
    }
    const raw = readFileSync(PROMPT_PATH, 'utf-8');
    const calLink = process.env.CALCOM_LINK || '[Book a call with us]';
    const today = new Date().toDateString();
    return raw
        .replace('[INSERT YOUR CAL.COM LINK HERE]', calLink)
        .replace('[CAL.COM LINK]', calLink)
        + `\n\n[TODAY'S DATE: ${today}]`;
}

// In-memory session store: phone → conversation history
const sessions = new Map();

// De-duplication cache
const processedMsgIds = new Map();
const MSG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function isDuplicate(id) {
    const now = Date.now();
    if (processedMsgIds.has(id)) return true;
    processedMsgIds.set(id, now);
    if (processedMsgIds.size > 1000) {
        for (const [k, ts] of processedMsgIds.entries()) {
            if (now - ts > MSG_CACHE_TTL) processedMsgIds.delete(k);
        }
    }
    return false;
}

/**
 * Process an incoming message through Aria (OpenAI).
 * @param {OpenAI} openai - The shared OpenAI instance
 * @param {string} userInput - The incoming message text
 * @param {string} phone - The sender's phone number (digits only)
 * @returns {Promise<string>} - Aria's reply
 */
export async function processAriaMessage(openai, userInput, phone) {
    try {
        if (!sessions.has(phone)) {
            console.log(`[Aria] New session for ${phone}`);
        }

        const history = sessions.get(phone) || [];

        // Rebuild system prompt fresh each call (in case env changed, or date changed)
        const systemPrompt = { role: 'system', content: loadSystemPrompt() };

        const messages = [systemPrompt, ...history, { role: 'user', content: userInput }];

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.6,
            max_tokens: 600
        });

        const replyText = response.choices[0].message.content?.trim()
            || "I'm having a moment — could you say that again?";

        // Persist to session (keep last 20 turns to avoid token overflow)
        history.push({ role: 'user', content: userInput });
        history.push({ role: 'assistant', content: replyText });
        if (history.length > 40) history.splice(0, 2); // remove oldest turn
        sessions.set(phone, history);

        console.log(`[Aria → ${phone}]: ${replyText.substring(0, 100)}...`);
        return replyText;

    } catch (error) {
        console.error('[Aria/OpenAI Error]:', error.message);
        if (error.status === 429) {
            return "I'm a little overwhelmed right now — please try again in a moment! 🙏";
        }
        return "Sorry, I ran into an issue. Please try again shortly.";
    }
}

/**
 * Send a message via Evolution API.
 */
export async function sendWhatsAppMessage(remoteJid, text, instanceName) {
    const evoUrlSource = process.env.EVOLUTION_API_URL || '';
    const evoUrl = evoUrlSource.endsWith('/') ? evoUrlSource.slice(0, -1) : evoUrlSource;
    const evoKey = process.env.EVOLUTION_API_KEY;

    if (!evoUrl || !evoKey) {
        console.error('[Aria] Missing Evolution API credentials. Cannot send reply.');
        return false;
    }

    try {
        const cleanNumber = remoteJid.replace('+', '').replace('@s.whatsapp.net', '');
        const response = await fetch(`${evoUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
            body: JSON.stringify({
                number: cleanNumber,
                options: { delay: 1200, presence: 'composing', linkPreview: false },
                text
            })
        });
        if (response.ok) {
            console.log(`[Aria] ✅ Sent reply to ${cleanNumber}`);
            return true;
        }
        console.error(`[Aria] ❌ Failed to send. Status: ${response.status}`);
        return false;
    } catch (err) {
        console.error('[Aria] ❌ Send error:', err.message);
        return false;
    }
}

export function clearAriaSession(phone) {
    sessions.delete(phone);
}

export function getAriaSessionCount() {
    return sessions.size;
}
