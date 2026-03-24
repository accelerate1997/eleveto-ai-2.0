require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load Aria's system prompt from the markdown file at runtime
const SYSTEM_PROMPT = fs.readFileSync(
    path.join(__dirname, 'whatsapp_assistant_prompt.md'),
    'utf-8'
);

// Inject Cal.com link and current date into the prompt
function buildSystemPrompt() {
    const calLink = process.env.CALCOM_LINK || '[CAL.COM LINK NOT SET]';
    const today = new Date().toDateString();
    return SYSTEM_PROMPT
        .replace('[INSERT YOUR CAL.COM LINK HERE]', calLink)
        .replace('[CAL.COM LINK]', calLink)
        + `\n\n[TODAY'S DATE: ${today}]`;
}

// In-memory session store: { phone: [{ role, content }, ...] }
const sessions = {};

/**
 * Process an incoming WhatsApp message through the AI.
 * @param {string} userInput - The incoming text message
 * @param {string} phone - The sender's phone number (clean, no @s.whatsapp.net)
 * @returns {Promise<string>} - The AI's reply text
 */
async function processMessage(userInput, phone) {
    try {
        if (!sessions[phone]) {
            console.log(`[SESSION] New session for ${phone}`);
            sessions[phone] = [
                { role: 'system', content: buildSystemPrompt() }
            ];
        } else {
            // Always refresh the system prompt in case env changed
            sessions[phone][0] = { role: 'system', content: buildSystemPrompt() };
        }

        const chatContext = sessions[phone];
        chatContext.push({ role: 'user', content: userInput });

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: chatContext,
            temperature: 0.6,
            max_tokens: 600
        });

        const replyText = response.choices[0].message.content?.trim();
        chatContext.push({ role: 'assistant', content: replyText });

        console.log(`[AI → ${phone}]: ${replyText?.substring(0, 80)}...`);
        return replyText || "I'm having a moment — could you say that again?";

    } catch (error) {
        console.error('[OpenAI Error]:', error.message);
        if (error.status === 429) {
            return "I'm a little overwhelmed right now — please try again in a moment! 🙏";
        }
        return "Sorry, I ran into an issue. Please try again shortly.";
    }
}

/**
 * Clear a user's conversation session (e.g. for testing).
 */
function clearSession(phone) {
    delete sessions[phone];
    console.log(`[SESSION] Cleared for ${phone}`);
}

/**
 * Get all active session phones (for debugging).
 */
function getActiveSessions() {
    return Object.keys(sessions);
}

module.exports = { processMessage, clearSession, getActiveSessions };
