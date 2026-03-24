/**
 * aria_service.js
 * Aria — Eleveto WhatsApp AI Assistant
 * Loaded by the main server/index.js
 */
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import PocketBase from 'pocketbase';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize PocketBase (Server-side)
const pb = new PocketBase(process.env.VITE_PB_URL || 'http://localhost:8090');

/**
 * Ensure we are authenticated as admin to create/update leads.
 */
async function ensureAuth() {
    try {
        if (pb.authStore.isValid) return;

        const email = process.env.PB_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

        if (!email || !password) {
            console.warn('[Aria] PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD missing. Attempting public create.');
            return;
        }

        console.log(`[Aria] 🔑 Authenticating to PocketBase as ${email}...`);
        await pb.admins.authWithPassword(email, password);
        console.log(`[Aria] ✅ Authenticated successfully!`);
    } catch (err) {
        console.error('[Aria] PB Auth Error:', err.message);
    }
}

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

// Tool definition for lead qualification
const tools = [
    {
        type: "function",
        function: {
            name: "save_lead",
            description: "MANDATORY: Save the qualified lead's contact information to the CRM. Call this as soon as you have the NAME and the BUSINESS INTEREST/PROBLEM. Do not wait for the end of the chat.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "The lead's full name" },
                    interest: { type: "string", description: "The problem they want to solve or the business interest they shared" },
                    investment: { type: "string", description: "Their budget or investment capacity (if shared)" },
                    country: { type: "string", description: "Their location or country" },
                    notes: { type: "string", description: "Any additional context from the conversation" }
                },
                required: ["name", "interest"]
            }
        }
    }
];

/**
 * Handle tool calls from OpenAI.
 */
async function handleTools(toolCalls, phone) {
    const results = [];
    for (const toolCall of toolCalls) {
        if (toolCall.function.name === 'save_lead') {
            try {
                const args = JSON.parse(toolCall.function.arguments);
                console.log(`\n📝 [Aria Tool] Calling save_lead for ${phone}`);
                console.log(`   Data:`, JSON.stringify(args, null, 2));

                // 1. Authenticate as admin before database operation
                await ensureAuth();

                const data = {
                    name: args.name,
                    whatsapp: phone,
                    country: args.country || 'Unknown',
                    investment: args.investment || 'Not shared',
                    linkedin: '', 
                    google: '',   
                    email: '',    
                    status: 'Qualified',
                };

                // 2. Create the record
                const record = await pb.collection('leads').create(data);
                console.log(`   ✅ Lead saved! ID: ${record.id}`);

                results.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: "save_lead",
                    content: `Lead successfully recorded in CRM with ID: ${record.id}. The lead is now in the 'Qualified' column.`
                });
            } catch (err) {
                console.error(`   ❌ Tool Error:`, err.message);
                results.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: "save_lead",
                    content: "Error saving lead to CRM: " + err.message
                });
            }
        }
    }
    return results;
}

/**
 * Process an incoming message through Aria (OpenAI).
 */
export async function processAriaMessage(openai, userInput, phone) {
    try {
        if (!sessions.has(phone)) {
            console.log(`[Aria] New session for ${phone}`);
        }

        const history = sessions.get(phone) || [];
        const systemPrompt = { role: 'system', content: loadSystemPrompt() };
        let messages = [systemPrompt, ...history, { role: 'user', content: userInput }];

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            tools,
            tool_choice: "auto",
            temperature: 0.6
        });

        const responseMessage = response.choices[0].message;

        if (responseMessage.tool_calls) {
            const toolResults = await handleTools(responseMessage.tool_calls, phone);
            messages.push(responseMessage);
            messages.push(...toolResults);

            const secondResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
            });

            const finalReply = secondResponse.choices[0].message.content || "Success — I've updated your status.";
            
            history.push({ role: 'user', content: userInput });
            history.push({ role: 'assistant', content: finalReply });
            if (history.length > 40) history.splice(0, 2);
            sessions.set(phone, history);

            return finalReply;
        }

        const replyText = responseMessage.content?.trim()
            || "I'm having a moment — could you say that again?";

        history.push({ role: 'user', content: userInput });
        history.push({ role: 'assistant', content: replyText });
        if (history.length > 40) history.splice(0, 2);
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
