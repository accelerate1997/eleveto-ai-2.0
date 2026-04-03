import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';
import { sendWhatsAppMessage } from './aria_service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function ensureAuth() {
    try {
        if (pb.authStore.isValid) return;
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        if (!email || !password) return;

        try {
            await pb.collection('_superusers').authWithPassword(email, password);
        } catch (e) {
            await pb.admins.authWithPassword(email, password);
        }
    } catch (err) {
        console.error('[Follow-up Agent] PB Auth Error:', err.message);
    }
}

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
    
    try {
        await ensureAuth();
        
        // Find leads in 'Follow Up' status who are active and haven't finished the sequence
        const leads = await pb.collection('leads').getFullList({
            filter: 'status="Follow Up" && followup_active=true',
            sort: '-created'
        });

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

            // 1. Get Conversation History
            const historyRecords = await pb.collection('messages').getList(1, 10, {
                filter: `lead="${lead.id}"`,
                sort: '-created'
            });
            const history = historyRecords.items.reverse().map(m => ({
                role: m.role || 'user',
                content: m.content
            }));
            console.log(`[Follow-up Agent]    Found ${history.length} previous messages for context.`);
            
            let messageText = null;
            let sequenceFinished = false;

            // 2. Logic Selection: Manual > Sequence > Default AI
            if (lead.custom_followup) {
                console.log(`[Follow-up Agent]    📝 Using manual personalized message...`);
                messageText = lead.custom_followup;
            } else if (lead.sequence) {
                try {
                    const seq = await pb.collection('sequences').getOne(lead.sequence);
                    const nextStepIndex = lead.followup_count || 0;
                    const step = seq.steps?.[nextStepIndex];

                    if (step) {
                        console.log(`[Follow-up Agent]    ⚡ Using Sequence Step ${nextStepIndex + 1}: ${step.mode}`);
                        if (step.mode === 'fixed') {
                            messageText = step.content;
                        } else {
                            messageText = await generateSequenceStepMessage(lead, step.content, history);
                        }
                        
                        if (nextStepIndex + 1 >= seq.steps.length) {
                            sequenceFinished = true;
                        }
                    } else {
                        console.log(`[Follow-up Agent]    🏁 Sequence exhausted for ${lead.name}.`);
                        sequenceFinished = true;
                    }
                } catch (e) {
                    console.error(`[Follow-up Agent]    ❌ Failed to fetch sequence ${lead.sequence}:`, e.message);
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
                await pb.collection('leads').update(lead.id, { followup_active: false });
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
                // 4. Log the message in the 'messages' collection
                await pb.collection('messages').create({
                    lead: lead.id,
                    role: 'assistant',
                    content: messageText,
                    source: 'Automation'
                });

                // 5. Update Lead Record
                const updateData = {
                    followup_count: (lead.followup_count || 0) + 1,
                    last_followup_sent: now.toISOString(),
                    custom_followup: '' // Clear manual override if it was used
                };
                
                if (sequenceFinished) {
                    updateData.followup_active = false;
                }

                await pb.collection('leads').update(lead.id, updateData);
                console.log(`[Follow-up Agent]    🎉 Database updated for ${lead.name}.`);
            } else {
                console.error(`[Follow-up Agent]    ❌ Failed to send WhatsApp message to ${lead.whatsapp}`);
            }
        }
    } catch (err) {
        console.error('[Follow-up Agent] Cycle Error:', err.message);
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
