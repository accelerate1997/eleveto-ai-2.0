import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import PocketBase from 'pocketbase';
import * as calService from './cal_service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables IMMEDIATELY
dotenv.config({ path: join(__dirname, '../.env') });

// Initialize PocketBase (Server-side)
const pb = new PocketBase(process.env.VITE_PB_URL || 'http://localhost:8090');
console.log(`[Aria] PocketBase URL: ${pb.baseUrl}`);

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
        await pb.collection('_superusers').authWithPassword(email, password);
        console.log(`[Aria] ✅ Authenticated successfully!`);
    } catch (err) {
        console.error('[Aria] PB Auth Error:', err.message);
        if (err.data) console.error('   Data:', JSON.stringify(err.data));
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
                    investment: { type: "string", description: "The investment amount they are willing to put towards their growth (e.g., '500k', 'flexible', etc.). NEVER use the word 'budget'." },
                    country: { type: "string", description: "Their location or country" },
                    notes: { type: "string", description: "Any additional context from the conversation" }
                },
                required: ["name", "interest"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_available_slots",
            description: "Check for available strategy meeting slots on a specific date.",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "The date to check (YYYY-MM-DD)" }
                },
                required: ["date"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "book_meeting",
            description: "Book a strategy meeting for the lead. Call this ONLY after checking availability and getting the user's confirmation.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Lead's full name" },
                    email: { type: "string", description: "Lead's email address" },
                    phone: { type: "string", description: "Lead's phone number (MANDATORY for booking)" },
                    start: { type: "string", description: "Selected slot in ISO format (e.g., 2026-03-27T10:00:00Z)" }
                },
                required: ["name", "email", "phone", "start"]
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

                // 2. Check if lead already exists (by phone)
                let existingRecord = null;
                try {
                    existingRecord = await pb.collection('leads').getFirstListItem(`whatsapp="${phone}"`);
                } catch (findErr) {
                    if (findErr.status !== 404) {
                        // A real error (auth, network) — rethrow so it's properly caught
                        throw findErr;
                    }
                    // 404 = not found, we'll create below
                }

                let record;
                if (existingRecord) {
                    console.log(`   🔄 Existing lead found: ${existingRecord.id}. Updating...`);
                    const updateData = { status: 'Qualified' };
                    if (args.name) updateData.name = args.name;
                    if (args.country) updateData.country = args.country;
                    if (args.investment) updateData.investment = args.investment;
                    if (args.interest) updateData.interest = args.interest;
                    if (args.notes) updateData.notes = args.notes;
                    record = await pb.collection('leads').update(existingRecord.id, updateData);
                    console.log(`   ✅ Lead updated: ${record.id}`);
                } else {
                    console.log(`   🆕 No existing lead for ${phone}. Creating new...`);
                    const data = {
                        name: args.name,
                        whatsapp: phone,
                        country: args.country || 'Unknown',
                        investment: args.investment || 'Not shared',
                        interest: args.interest || '',
                        notes: args.notes || '',
                        email: '',
                        status: 'Qualified',
                    };
                    record = await pb.collection('leads').create(data);
                    console.log(`   ✅ New lead created: ${record.id}`);
                }

                results.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: "save_lead",
                    content: "SUCCESS: The lead was registered in the CRM. You can now invite them to the Strategy Meeting."
                });
            } catch (err) {
                console.error(`   ❌ Tool Error:`, err.message);
                if (err.data) console.error('   Data:', JSON.stringify(err.data));

                results.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: "save_lead",
                    content: "FAIL: Could not save lead to CRM due to a technical error."
                });
            }
        } else if (toolCall.function.name === 'get_available_slots') {
            try {
                const args = JSON.parse(toolCall.function.arguments);
                const slots = await calService.getAvailableSlots(args.date);
                
                // Format slots to IST for the AI to present correctly
                const istSlots = slots.map(slot => {
                    const date = new Date(slot);
                    const ist = date.toLocaleTimeString('en-IN', { 
                        timeZone: 'Asia/Kolkata', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: true 
                    });
                    return `${ist} (ISO: ${slot})`;
                });

                results.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: "get_available_slots",
                    content: istSlots.length > 0 
                        ? `Available slots for ${args.date} in IST: ${istSlots.join(', ')}. PROMPT: Present these times in IST to the user. Use the ISO string in parentheses when calling book_meeting.`
                        : `No slots available for ${args.date}. Please try another date.`
                });
            } catch (err) {
                results.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: "get_available_slots",
                    content: `Error checking slots: ${err.message}`
                });
            }
        } else if (toolCall.function.name === 'book_meeting') {
            try {
                const args = JSON.parse(toolCall.function.arguments);
                console.log(`\n📅 [Aria Tool] Booking meeting for ${args.name} at ${args.start}`);
                
                const booking = await calService.createBooking({
                    name: args.name,
                    email: args.email,
                    phone: args.phone,
                    start: args.start
                });

                // --- Sync to PocketBase 'bookings' collection ---
                try {
                   console.log(`   🔄 Syncing to PocketBase...`);
                   await ensureAuth();
                   
                   // Try to find the lead and update with email
                   let leadId = null;
                   try {
                       const lead = await pb.collection('leads').getFirstListItem(`whatsapp="${phone}"`).catch(() => null);
                       if (lead) {
                           leadId = lead.id;
                           // Also save the email to the lead record
                           if (args.email && !lead.email) {
                               await pb.collection('leads').update(lead.id, { email: args.email });
                               console.log(`   📧 Email saved to lead: ${args.email}`);
                           }
                       }
                   } catch (e) {
                       console.log(`   ⚠️ Lead not found for sync, creating orphan booking.`);
                   }

                   // Build the booking record — only include meeting_link if it's a real URL
                   const videoCallUrl = booking.metadata?.videoCallUrl;
                   const bookingRecord = {
                       title: `Strategy Meeting with ${args.name}`,
                       date: args.start,
                       duration: 30,
                       status: 'Scheduled',
                       notes: `Booked by Aria via Cal.com (ID: ${booking.id || 'N/A'})`,
                   };
                   // Only add optional fields if they have valid values
                   if (leadId) bookingRecord.lead_id = leadId;
                   if (videoCallUrl && videoCallUrl.startsWith('http')) bookingRecord.meeting_link = videoCallUrl;

                   await pb.collection('bookings').create(bookingRecord);
                   console.log(`   ✅ Booking synced successfully!`);
                } catch (syncErr) {
                   console.error(`   ⚠️ Sync failed (ignoring to not break booking):`, syncErr.message);
                }
                // -----------------------------------------------

                results.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: "book_meeting",
                    content: `SUCCESS: Meeting booked! Booking ID: ${booking.id}. Please confirm with the user.`
                });
            } catch (err) {
                console.error(`   ❌ Booking Error:`, err.message);
                results.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: "book_meeting",
                    content: `FAIL: Error booking meeting via Cal.com: ${err.message}. Please apologize and ask for assistance.`
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

        // --- Persistence: LOG USER MESSAGE ---
        try {
            await ensureAuth();
            let leadRecord;
            try {
                leadRecord = await pb.collection('leads').getFirstListItem(`whatsapp="${phone}"`);
            } catch (e) {
                // Create draft lead if not found
                leadRecord = await pb.collection('leads').create({
                    whatsapp: phone,
                    name: 'Draft Lead',
                    status: 'Qualified',
                    investment: 'Not shared',
                    country: 'Unknown'
                });
                console.log(`[Aria Log] Draft lead created for ${phone} to start logging.`);
            }

            if (leadRecord) {
                await pb.collection('messages').create({
                    lead: leadRecord.id,
                    role: 'user',
                    content: userInput
                });
            }
        } catch (logErr) {
            console.error('[Aria Log Error] User message:', logErr.message);
        }
        // -------------------------------------

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
            
            // --- Persistence: LOG ASSISTANT MESSAGE ---
            try {
                const leadRecord = await pb.collection('leads').getFirstListItem(`whatsapp="${phone}"`).catch(() => null);
                if (leadRecord) {
                    await pb.collection('messages').create({
                        lead: leadRecord.id,
                        role: 'assistant',
                        content: finalReply
                    });
                }
            } catch (logErr) {
                console.error('[Aria Log Error] Assistant response:', logErr.message);
            }
            // ------------------------------------------

            history.push({ role: 'user', content: userInput });
            history.push({ role: 'assistant', content: finalReply });
            if (history.length > 40) history.splice(0, 2);
            sessions.set(phone, history);

            return finalReply;
        }

        const replyText = responseMessage.content?.trim()
            || "I'm having a moment — could you say that again?";

        // --- Persistence: LOG ASSISTANT RESPONSE ---
        try {
            const leadRecord = await pb.collection('leads').getFirstListItem(`whatsapp="${phone}"`).catch(() => null);
            if (leadRecord) {
                await pb.collection('messages').create({
                    lead: leadRecord.id,
                    role: 'assistant',
                    content: replyText
                });
            }
        } catch (logErr) {
            console.error('[Aria Log Error] Assistant response:', logErr.message);
        }
        // ------------------------------------------

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
