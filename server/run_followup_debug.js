import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function ensureAuth() {
    try {
        if (pb.authStore.isValid) return;
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        if (!email || !password) throw new Error('Missing PB credentials');

        try {
            await pb.collection('_superusers').authWithPassword(email, password);
        } catch (e) {
            await pb.admins.authWithPassword(email, password);
        }
    } catch (err) {
        console.error('[Follow-up DEBUG] PB Auth Error:', err.message);
        throw err;
    }
}

async function sendWhatsAppMessage(remoteJid, text) {
    const evoUrlSource = process.env.EVOLUTION_API_URL || '';
    const evoUrl = evoUrlSource.endsWith('/') ? evoUrlSource.slice(0, -1) : evoUrlSource;
    const evoKey = process.env.EVOLUTION_API_KEY;
    const instanceName = process.env.INSTANCE_NAME || 'Eleveto_gx3yachgic1mjxv';

    if (!evoUrl || !evoKey) {
        console.error('[Follow-up DEBUG] Missing Evolution API credentials');
        return false;
    }

    try {
        const cleanNumber = remoteJid.replace('+', '').replace('@s.whatsapp.net', '');
        console.log(`[Follow-up DEBUG] Attempting send to ${cleanNumber}...`);
        const response = await fetch(`${evoUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
            body: JSON.stringify({
                number: cleanNumber,
                options: { delay: 1200, presence: 'composing', linkPreview: false },
                text
            })
        });
        const resData = await response.json();
        if (response.ok) {
            console.log(`[Follow-up DEBUG] ✅ Sent to ${cleanNumber}`);
            return true;
        }
        console.error(`[Follow-up DEBUG] ❌ Failed. Status: ${response.status}`, JSON.stringify(resData));
        return false;
    } catch (err) {
        console.error('[Follow-up DEBUG] ❌ Send error:', err.message);
        return false;
    }
}

async function generateFollowupMessage(lead, history) {
    const step = (lead.followup_count || 0) + 1;
    let directive = step <= 2 ? "Friendly check-in." : step <= 4 ? "Provide AI value/insight." : "Polite check-in or break-up.";

    const systemPrompt = `You are Aria, a friendly AI assistant for Eleveto AI. Follow up with ${lead.name} (Step ${step}/7). 
Directive: ${directive}
Interest: ${lead.interest || lead.notes || 'AI Automation'}
Context: ${history.map(m => `${m.role}: ${m.content}`).join('\n')}
Max 2 sentences. No 'budget'. Use 'Investment'.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }],
            temperature: 0.7,
        });
        return completion.choices[0].message.content.trim();
    } catch (err) {
        console.error(`[Follow-up DEBUG] AI Error:`, err.message);
        return null;
    }
}

async function runOnce() {
    console.log('🚀 [Follow-up DEBUG] Starting standalone cycle...');
    try {
        await ensureAuth();
        const leads = await pb.collection('leads').getFullList({
            filter: 'status="Follow Up" && followup_active=true && followup_count < 7'
        });
        console.log(`[Follow-up DEBUG] Leads found: ${leads.length}`);

        const now = new Date();
        const INTERVAL_MS = 48 * 60 * 60 * 1000;

        for (const lead of leads) {
            console.log(`[Follow-up DEBUG] 🧐 Checking: ${lead.name}`);
            
            if (lead.followup_date && new Date(lead.followup_date) > now) {
                console.log(`[Follow-up DEBUG]    Scheduled for future. Skipping.`);
                continue;
            }

            let lastSent = lead.last_followup_sent ? new Date(lead.last_followup_sent) : null;
            if (lastSent && (now - lastSent) < INTERVAL_MS) {
                console.log(`[Follow-up DEBUG]    Sent recently. Skipping.`);
                continue;
            }

            const historyRecords = await pb.collection('messages').getList(1, 5, { filter: `lead="${lead.id}"`, sort: '-created' });
            const history = historyRecords.items.reverse().map(m => ({ role: m.role, content: m.content }));

            const msg = await generateFollowupMessage(lead, history);
            if (!msg) continue;

            const success = await sendWhatsAppMessage(lead.whatsapp, msg);
            if (success) {
                await pb.collection('messages').create({ lead: lead.id, role: 'assistant', content: msg, source: 'Automation' });
                await pb.collection('leads').update(lead.id, { 
                    followup_count: (lead.followup_count || 0) + 1,
                    last_followup_sent: now.toISOString()
                });
                console.log(`[Follow-up DEBUG] ✅ Success for ${lead.name}`);
            }
        }
        console.log('🏁 [Follow-up DEBUG] Cycle finished.');
    } catch (err) {
        console.error('❌ [Follow-up DEBUG] Fatal:', err.message);
    }
}

runOnce();
