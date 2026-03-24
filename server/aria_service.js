/**
 * aria_service.js
 * Aria — Eleveto WhatsApp AI Assistant
 * Loaded by the main server/index.js
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
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

// In-memory session store: phone → conversation history array
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
 * Process an incoming message through Aria (Gemini 1.5 Flash).
 * @param {string} userInput - The incoming message text
 * @param {string} phone - The sender's phone number (digits only)
 * @returns {Promise<string>} - Aria's reply
 */
export async function processAriaMessage(userInput, phone) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error('[Aria] Missing GEMINI_API_KEY in environment!');
            return "My AI brain is currently disconnected (Missing API Key).";
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Initialize the model with the system instruction
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: loadSystemPrompt(),
            generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 600,
            }
        });

        if (!sessions.has(phone)) {
            console.log(`[Aria] New session for ${phone}`);
        }

        // Gemini history format: { role: "user" | "model", parts: [{ text: "..." }] }
        const history = sessions.get(phone) || [];

        // Start chat session with existing history
        const chatSession = model.startChat({ history });

        // Send the new user message
        const result = await chatSession.sendMessage(userInput);
        const replyText = result.response.text().trim();

        // Push the new turn to our internal session map
        history.push({ role: 'user', parts: [{ text: userInput }] });
        history.push({ role: 'model', parts: [{ text: replyText }] });
        
        // Keep last 40 turns (20 pairs) to avoid token overflow
        if (history.length > 40) history.splice(0, 2); 
        sessions.set(phone, history);

        console.log(`[Aria → ${phone}]: ${replyText.substring(0, 100)}...`);
        return replyText;

    } catch (error) {
        console.error('[Aria/Gemini Error]:', error.message || error);
        return "Sorry, I ran into an issue connecting to my brain. Please try again shortly.";
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
