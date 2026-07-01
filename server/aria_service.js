import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import { broadcast } from './socket.js';
import * as calService from './cal_service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables IMMEDIATELY
dotenv.config({ path: join(__dirname, '../.env') });

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
                    industry: { type: "string", description: "The specific industry their business operates in (e.g., Real Estate, E-commerce, Healthcare)" },
                    notes: { type: "string", description: "MANDATORY: A cumulative, structured Q&A list of all the qualification questions asked and the answers provided by the lead so far (e.g., 'Q: What type of business do you have?\nA: Retail Shop\nQ: Do you currently have a website?\nA: No - I need one built from scratch'). Keep adding to this log as the conversation progresses." }
                },
                required: ["name", "interest"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_available_slots",
            description: "Check for available strategy meeting slots on a specific date. IMPORTANT: You MUST ask the user for their preferred date first before calling this tool. Do NOT guess the date.",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "The date provided by the user (YYYY-MM-DD)" }
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
 * Synchronize a lead with the PostgreSQL CRM.
 */
export async function syncLead(phone, args, status = 'Qualified') {
    const client = await pool.connect();
    try {
        const normalizedPhone = phone.replace('+', '').replace('@s.whatsapp.net', '');
        console.log(`\n🔄 [CRM Sync] Processing lead for ${normalizedPhone} (Status: ${status})`);

        // Search for existing lead (by phone)
        const checkRes = await client.query('SELECT * FROM public.leads WHERE whatsapp = $1', [normalizedPhone]);
        const existingRecord = checkRes.rows[0];

        let record;
        if (existingRecord) {
            console.log(`   🔄 Existing lead found: ${existingRecord.id}. Updating...`);
            
            // Build dynamic update values
            const updates = [];
            const values = [];
            let placeholderIndex = 1;

            const fieldsToUpdate = {
                status,
                name: args.name,
                email: args.email,
                country: args.country,
                investment: args.investment,
                interest: args.interest,
                notes: args.notes,
                industry: args.industry
            };

            for (const [key, value] of Object.entries(fieldsToUpdate)) {
                if (value !== undefined && value !== null && String(value).trim() !== '') {
                    updates.push(`${key} = $${placeholderIndex}`);
                    values.push(value);
                    placeholderIndex++;
                }
            }

            if (updates.length > 0) {
                values.push(existingRecord.id);
                const queryStr = `UPDATE public.leads SET ${updates.join(', ')} WHERE id = $${placeholderIndex} RETURNING *`;
                const updateRes = await client.query(queryStr, values);
                record = updateRes.rows[0];
            } else {
                record = existingRecord;
            }
            console.log(`   ✅ Lead updated: ${record.id}`);
            broadcast('leads:update', record);
        } else {
            console.log(`   🆕 No existing lead for ${normalizedPhone}. Creating new...`);
            
            const insertQuery = `
                INSERT INTO public.leads (whatsapp, name, email, notes, status, source, industry, interest, investment, country)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;
            const notes = args.notes || `Interest: ${args.interest || 'N/A'}\nInvestment: ${args.investment || 'Not shared'}\nLocation: ${args.country || 'Not shared'}\nContext: ${args.notes || 'None'}`;
            const values = [
                normalizedPhone,
                args.name || `Lead ${normalizedPhone.slice(-4)}`,
                args.email || '',
                notes,
                status,
                'WhatsApp Assistant',
                args.industry || '',
                args.interest || '',
                args.investment || '',
                args.country || ''
            ];

            const insertRes = await client.query(insertQuery, values);
            record = insertRes.rows[0];
            console.log(`   ✅ New lead created: ${record.id}`);
            broadcast('leads:create', record);
        }
        return record;
    } catch (err) {
        console.error(`   ❌ Sync Lead Error:`, err.message);
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Handle tool calls from OpenAI.
 */
async function handleTools(toolCalls, phone) {
    const results = [];
    const client = await pool.connect();
    try {
        for (const toolCall of toolCalls) {
            if (toolCall.function.name === 'save_lead') {
                try {
                    const args = JSON.parse(toolCall.function.arguments);
                    const record = await syncLead(phone, args, 'Qualified');
                    
                    results.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: "save_lead",
                        content: `SUCCESS: Lead ${record.name} was registered in the CRM. You can now invite them to the Strategy Meeting.`
                    });
                } catch (err) {
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

                    // Sync to PostgreSQL bookings
                    try {
                        console.log(`   🔄 Syncing to PostgreSQL...`);
                        
                        // Try to find the lead and update with email
                        let leadId = null;
                        const leadRes = await client.query('SELECT * FROM public.leads WHERE whatsapp = $1', [phone.replace('+', '')]);
                        const lead = leadRes.rows[0];

                        if (lead) {
                            leadId = lead.id;
                            if (args.email && !lead.email) {
                                await client.query('UPDATE public.leads SET email = $1 WHERE id = $2', [args.email, lead.id]);
                                console.log(`   📧 Email saved to lead: ${args.email}`);
                            }
                        }

                        const b = booking.booking || booking.data || booking;
                        const bookingId = b.id || b.uid || 'N/A';
                        const bookingUid = b.uid || '';
                        const videoCallUrl = b.meetingUrl || b.metadata?.videoCallUrl || b.videoCallUrl || '';
                        const rescheduleUrl = bookingUid ? `https://cal.com/reschedule/${bookingUid}` : '';

                        const insertBookingQuery = `
                            INSERT INTO public.bookings (title, date, duration, status, notes, reschedule_link, lead_id, meeting_link, reminders_sent)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                            RETURNING *
                        `;
                        const bValues = [
                            `Strategy Meeting with ${args.name}`,
                            args.start,
                            30,
                            'Scheduled',
                            `Booked by Aria via Cal.com (ID: ${bookingId})`,
                            rescheduleUrl,
                            leadId,
                            videoCallUrl,
                            JSON.stringify([])
                        ];

                        const bRes = await client.query(insertBookingQuery, bValues);
                        console.log(`   ✅ Booking synced successfully! (ID: ${bookingId})`);
                        broadcast('bookings:create', bRes.rows[0]);

                        // Immediate Confirmation Message
                        const formattedTime = new Date(args.start).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            dateStyle: 'full',
                            timeStyle: 'short'
                        });

                        const confirmationText = `✅ *Meeting Confirmed!*
 
Hi ${args.name}, your Strategy Meeting is booked.
 
📅 *Date:* ${formattedTime}
🔗 *Meeting Link:* ${videoCallUrl || 'Coming soon to your calendar'}
🔄 *Reschedule:* ${rescheduleUrl || 'Check your email'}
 
*What’s Next?*
1. Check your email for the calendar invite.
2. I will send you reminders 24h, 1h, and 10 mins before we start! 👋`;
                        
                        const instanceName = process.env.INSTANCE_NAME || 'Eleveto_gx3yachgic1mjxv';
                        await sendWhatsAppMessage(phone, confirmationText, instanceName);

                    } catch (syncErr) {
                        console.error(`   ⚠️ Sync failed (ignoring to not break booking):`, syncErr.message);
                    }

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
    } finally {
        client.release();
    }
    return results;
}

/**
 * Process an incoming message through Aria (OpenAI).
 */
export async function processAriaMessage(openai, userInput, phone) {
    const client = await pool.connect();
    try {
        if (!sessions.has(phone)) {
            console.log(`[Aria] New session for ${phone}`);
        }

        const history = sessions.get(phone) || [];
        const systemPrompt = { role: 'system', content: loadSystemPrompt() };
        let messages = [systemPrompt, ...history, { role: 'user', content: userInput }];

        // --- Log User Message ---
        let leadRecord = null;
        try {
            const normalizedPhone = phone.replace('+', '').replace('@s.whatsapp.net', '');
            const leadRes = await client.query('SELECT * FROM public.leads WHERE whatsapp = $1', [normalizedPhone]);
            leadRecord = leadRes.rows[0];

            if (!leadRecord) {
                const insertRes = await client.query(
                    'INSERT INTO public.leads (whatsapp, name, status, investment, country) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                    [normalizedPhone, `Draft Lead (${normalizedPhone.slice(-4)})`, 'Qualified', 'Not shared', 'Unknown']
                );
                leadRecord = insertRes.rows[0];
                broadcast('leads:create', leadRecord);
                console.log(`[Aria Log] Draft lead created for ${phone} to start logging.`);
            }

            if (leadRecord) {
                const msgRes = await client.query(
                    'INSERT INTO public.messages (lead_id, role, content, source) VALUES ($1, $2, $3, $4) RETURNING *',
                    [leadRecord.id, 'user', userInput, 'WhatsApp']
                );
                broadcast('messages:create', msgRes.rows[0]);

                // Check if AI is paused
                if (leadRecord.ai_disabled) {
                    console.log(`[Aria] AI is paused for ${phone}. Logged message, skipping AI reply.`);
                    return null;
                }
            }
        } catch (logErr) {
            console.error('[Aria Log Error] User message:', logErr.message);
        }

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
            
            // --- Log Assistant Message ---
            try {
                if (leadRecord) {
                    const msgRes = await client.query(
                        'INSERT INTO public.messages (lead_id, role, content, source) VALUES ($1, $2, $3, $4) RETURNING *',
                        [leadRecord.id, 'assistant', finalReply, 'WhatsApp']
                    );
                    broadcast('messages:create', msgRes.rows[0]);
                }
            } catch (logErr) {
                console.error('[Aria Log Error] Assistant response:', logErr.message);
            }

            history.push({ role: 'user', content: userInput });
            history.push({ role: 'assistant', content: finalReply });
            if (history.length > 40) history.splice(0, 2);
            sessions.set(phone, history);

            return finalReply;
        }

        const replyText = responseMessage.content?.trim()
            || "I'm having a moment — could you say that again?";

        // --- Log Assistant Response ---
        try {
            if (leadRecord) {
                const msgRes = await client.query(
                    'INSERT INTO public.messages (lead_id, role, content, source) VALUES ($1, $2, $3, $4) RETURNING *',
                    [leadRecord.id, 'assistant', replyText, 'WhatsApp']
                );
                broadcast('messages:create', msgRes.rows[0]);
            }
        } catch (logErr) {
            console.error('[Aria Log Error] Assistant response:', logErr.message);
        }

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
    } finally {
        client.release();
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

/**
 * Send a media message via Evolution API.
 */
export async function sendWhatsAppMedia(remoteJid, base64Data, mimetype, fileName, caption, instanceName) {
    const evoUrlSource = process.env.EVOLUTION_API_URL || '';
    const evoUrl = evoUrlSource.endsWith('/') ? evoUrlSource.slice(0, -1) : evoUrlSource;
    const evoKey = process.env.EVOLUTION_API_KEY;

    if (!evoUrl || !evoKey) {
        console.error('[Aria] Missing Evolution API credentials. Cannot send media.');
        return false;
    }

    try {
        const cleanNumber = remoteJid.replace('+', '').replace('@s.whatsapp.net', '');
        
        let mediatype = 'document';
        if (mimetype.startsWith('image/')) mediatype = 'image';
        else if (mimetype.startsWith('video/')) mediatype = 'video';
        else if (mimetype.startsWith('audio/')) mediatype = 'audio';

        const bodyPayload = {
            number: cleanNumber,
            options: { delay: 1200, presence: 'composing' },
            mediaMessage: {
                mediatype,
                media: base64Data
            }
        };

        if (fileName) bodyPayload.mediaMessage.fileName = fileName;
        if (caption) bodyPayload.mediaMessage.caption = caption;

        const response = await fetch(`${evoUrl}/message/sendMedia/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
            body: JSON.stringify(bodyPayload)
        });
        
        if (response.ok) {
            console.log(`[Aria] ✅ Sent media reply to ${cleanNumber}`);
            return true;
        }
        
        const errBody = await response.text();
        console.error(`[Aria] ❌ Failed to send media. Status: ${response.status}`, errBody);
        return false;
    } catch (err) {
        console.error('[Aria] ❌ Send media error:', err.message);
        return false;
    }
}

export function clearAriaSession(phone) {
    sessions.delete(phone);
}

export function getAriaSessionCount() {
    return sessions.size;
}
