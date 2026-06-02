import pool from './db.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';
import { sendWhatsAppMessage } from './aria_service.js';
import { broadcast } from './socket.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a personalized follow-up message using AI.
 */
async function generateFollowupMessage(lead, history) {
    const step = (lead.followup_count || 0) + 1;
    
    let directive = "";
    if (step <= 2) {
        directive = "Friendly check-in. Mention their initial interest and ask if they had any more thoughts on it. Keep it very short and casual.";
    } else if (step <= 4) {
        directive = "Provide a quick insight or value related to AI automation. Ask if they'd like to see a demo or book a quick strategy call.";
    } else if (step <= 6) {
        directive = "Address potential hesitation. Mention that we help similar businesses save 20+ hours a week. Ask if they are still looking for a solution.";
    } else {
        directive = "Final check-in. Just asking if they want us to keep them in the loop or if we should stop reaching out for now. Polite 'break-up' style.";
    }

    const systemPrompt = `You are Aria, a friendly AI assistant for Eleveto AI. 
You are following up with a lead via WhatsApp.
Current Follow-up Step: ${step} of 7.
Directive: ${directive}

Lead Name: ${lead.name}
Lead Interest: ${lead.interest || lead.notes || 'AI Automation'}

[CONVERSATION HISTORY]
${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

[TASK]
Write a personalized WhatsApp message for Step ${step}. 
- Use their name.
- Be friendly, professional, and concise.
- Max 2-3 sentences.
- Do NOT use formal letters or subjects. Just the message text.
- NEVER use the word 'budget'. Use 'Investment' if needed.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }],
            temperature: 0.7,
        });
        return completion.choices[0].message.content.trim();
    } catch (err) {
        console.error(`[Follow-up Agent] AI Generation Error for ${lead.name}:`, err.message);
        return null;
    }
}

/**
 * Generate an AI message based on a sequence step directive.
 */
async function generateSequenceStepMessage(lead, stepContent, history) {
    const systemPrompt = `You are Aria, a friendly AI assistant for Eleveto AI. 
You are following up with a lead via WhatsApp as part of a custom sequence.

Directive for this message: ${stepContent}

Lead Name: ${lead.name}
Lead Interest: ${lead.interest || lead.notes || 'AI Automation'}

[CONVERSATION HISTORY]
${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

[TASK]
Write a personalized WhatsApp message following the directive above.
- Be friendly, professional, and concise.
- Max 2 sentences.
- Do NOT use formal letters or subjects. Just the message text.
- NEVER use the word 'budget'. Use 'Investment' if needed.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }],
            temperature: 0.7,
        });
        return completion.choices[0].message.content.trim();
    } catch (err) {
        console.error(`[Follow-up Agent] Sequence Step AI Error:`, err.message);
        return null;
    }
}

/**
 * Main logic to check and send follow-ups.
 */
export async function runFollowupCycle() {
    console.log(`[Follow-up Agent] 🤖 Cycle started... (${new Date().toLocaleString()})`);
    const client = await pool.connect();
    
    try {
        // Find leads in 'Follow Up' status who are active and haven't finished the sequence
        const leadsRes = await client.query(
            'SELECT * FROM public.leads WHERE status = \'Follow Up\' AND followup_active = true ORDER BY created_at DESC'
        );
        const leads = leadsRes.rows;

        console.log(`[Follow-up Agent] 🔍 Found ${leads.length} active follow-up leads.`);

        const now = new Date();
        const INTERVAL_MS = 48 * 60 * 60 * 1000; // 48 Hours

        for (const lead of leads) {
            console.log(`[Follow-up Agent] 🧐 Checking lead: ${lead.name}`);
            
            // Check manual follow-up date if set
            if (lead.followup_date) {
                const targetDate = new Date(lead.followup_date);
                if (targetDate > now) {
                    console.log(`[Follow-up Agent] ⏭️ Skipping ${lead.name} (Scheduled for ${targetDate.toLocaleDateString()})`);
                    continue;
                }
            }

            let lastSent = lead.last_followup_sent ? new Date(lead.last_followup_sent) : null;
            
            // If we sent one recently (less than 48 hours ago), skip
            if (lastSent && (now - lastSent) < INTERVAL_MS) {
                const hoursLeft = ((INTERVAL_MS - (now - lastSent)) / (1000 * 60 * 60)).toFixed(1);
                console.log(`[Follow-up Agent] ⏭️ Skipping ${lead.name} (Waiting ${hoursLeft}h)`);
                continue;
            }

            console.log(`[Follow-up Agent] 🚀 Generating Step ${lead.followup_count + 1} for ${lead.name}...`);

            // 1. Get Conversation History (Last 10 messages)
            const historyRes = await client.query(
                'SELECT role, content FROM public.messages WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 10',
                [lead.id]
            );
            // Reverse so they are chronological
            const history = historyRes.rows.reverse();
            console.log(`[Follow-up Agent]    Found ${history.length} previous messages for context.`);
            
            let messageText = null;
            let sequenceFinished = false;

            // 2. Logic Selection: Manual > Sequence > Default AI
            if (lead.custom_followup && lead.custom_followup.trim() !== '') {
                console.log(`[Follow-up Agent]    📝 Using manual personalized message...`);
                messageText = lead.custom_followup;
            } else if (lead.sequence_id) {
                try {
                    const seqRes = await client.query('SELECT * FROM public.sequences WHERE id = $1', [lead.sequence_id]);
                    const seq = seqRes.rows[0];
                    const nextStepIndex = lead.followup_count || 0;
                    
                    // Parse steps JSONB
                    const steps = Array.isArray(seq?.steps) ? seq.steps : JSON.parse(seq?.steps || '[]');
                    const step = steps[nextStepIndex];

                    if (step) {
                        console.log(`[Follow-up Agent]    ⚡ Using Sequence Step ${nextStepIndex + 1}: ${step.mode}`);
                        if (step.mode === 'fixed') {
                            messageText = step.content;
                        } else {
                            messageText = await generateSequenceStepMessage(lead, step.content, history);
                        }
                        
                        if (nextStepIndex + 1 >= steps.length) {
                            sequenceFinished = true;
                        }
                    } else {
                        console.log(`[Follow-up Agent]    🏁 Sequence exhausted for ${lead.name}.`);
                        sequenceFinished = true;
                    }
                } catch (e) {
                    console.error(`[Follow-up Agent]    ❌ Failed to fetch sequence ${lead.sequence_id}:`, e.message);
                }
            } else {
                // Fallback: Old 7-day AI logic
                if (lead.followup_count >= 7) {
                    console.log(`[Follow-up Agent]    🏁 Default 7-day sequence finished for ${lead.name}.`);
                    sequenceFinished = true;
                } else {
                    console.log(`[Follow-up Agent]    🤖 Using Default AI Generation...`);
                    messageText = await generateFollowupMessage(lead, history);
                }
            }

            if (!messageText && !sequenceFinished) {
                console.error(`[Follow-up Agent]    ❌ Failed to determine message for ${lead.name}`);
                continue;
            }

            if (sequenceFinished) {
                const updateRes = await client.query(
                    'UPDATE public.leads SET followup_active = false WHERE id = $1 RETURNING *',
                    [lead.id]
                );
                broadcast('leads:update', updateRes.rows[0]);
                console.log(`[Follow-up Agent]    🏁 Marking ${lead.name} as finished (followup_active=false).`);
                continue;
            }

            console.log(`[Follow-up Agent]    Message determined: "${messageText.substring(0, 50)}..."`);

            // 3. Send via WhatsApp
            const instanceName = process.env.INSTANCE_NAME || 'Eleveto_gx3yachgic1mjxv';
            console.log(`[Follow-up Agent]    Sending via WhatsApp (Instance: ${instanceName})...`);
            const success = await sendWhatsAppMessage(lead.whatsapp, messageText, instanceName);

            if (success) {
                console.log(`[Follow-up Agent]    ✅ Message sent! Updating database...`);
                // 4. Log the message in the 'messages' table
                const msgRes = await client.query(
                    'INSERT INTO public.messages (lead_id, role, content, source) VALUES ($1, \'assistant\', $2, \'Automation\') RETURNING *',
                    [lead.id, messageText]
                );
                broadcast('messages:create', msgRes.rows[0]);

                // 5. Update Lead Record
                const updateQuery = `
                    UPDATE public.leads
                    SET followup_count = $1, last_followup_sent = $2, custom_followup = '', followup_active = $3
                    WHERE id = $4
                    RETURNING *
                `;
                const finalActiveState = !sequenceFinished;
                const leadUpdateRes = await client.query(updateQuery, [
                    (lead.followup_count || 0) + 1,
                    now.toISOString(),
                    finalActiveState,
                    lead.id
                ]);
                broadcast('leads:update', leadUpdateRes.rows[0]);
                console.log(`[Follow-up Agent]    🎉 Database updated for ${lead.name}.`);
            } else {
                console.error(`[Follow-up Agent]    ❌ Failed to send WhatsApp message to ${lead.whatsapp}`);
            }
        }
    } catch (err) {
        console.error('[Follow-up Agent] Cycle Error:', err.message);
    } finally {
        client.release();
    }
}

/**
 * Start the follow-up service.
 */
export function startFollowupService(intervalHours = 2) {
    console.log(`[Follow-up Agent] 🚀 Started (Checking every ${intervalHours} hours)`);
    // Run cycle once on start
    runFollowupCycle();
    // Then on interval
    setInterval(runFollowupCycle, intervalHours * 60 * 60 * 1000);
}
