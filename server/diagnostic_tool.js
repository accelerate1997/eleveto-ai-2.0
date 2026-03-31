import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function checkSystem() {
    console.log('--- ELEVETO SYSTEM DIAGNOSTICS ---');
    console.log(`Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

    // 1. Auth check
    try {
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        console.log(`\n🔑 Checking PB Auth: ${email}...`);
        try {
            await pb.collection('_superusers').authWithPassword(email, password);
            console.log('✅ Auth successful!');
        } catch (e) {
            await pb.admins.authWithPassword(email, password);
            console.log('✅ Auth successful (legacy)!');
        }
    } catch (err) {
        console.error('❌ PB Auth Failed:', err.message);
    }

    // 2. WhatsApp Instance Status
    try {
        const evoUrl = process.env.EVOLUTION_API_URL || 'https://evolution.elevetoai.com';
        const evoKey = process.env.EVOLUTION_API_KEY;
        const instance = process.env.INSTANCE_NAME || 'Eleveto_gx3yachgic1mjxv';
        console.log(`\n📱 Checking WhatsApp Instance: ${instance}...`);
        
        const response = await fetch(`${evoUrl}/instance/connectionState/${instance}`, {
            headers: { 'apikey': evoKey }
        });
        const data = await response.json();
        console.log(`   State: ${data.instance?.state || 'DISCONNECTED'}`);
    } catch (err) {
        console.error('❌ WhatsApp Check Failed:', err.message);
    }

    // 3. Upcoming Reminders
    try {
        console.log('\n📅 Upcoming Reminders (Next 48h):');
        const now = new Date();
        const future = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        
        const bookings = await pb.collection('bookings').getFullList({
            filter: `status="Scheduled" && date >= "${now.toISOString()}"`,
            expand: 'lead_id',
            sort: 'date'
        });

        if (bookings.length === 0) {
            console.log('   (No upcoming bookings)');
        }

        for (const b of bookings) {
            const date = new Date(b.date);
            const diffHours = (date - now) / (1000 * 60 * 60);
            console.log(`   - [${b.id}] ${b.title || 'Meeting'} at ${date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (T-${diffHours.toFixed(1)}h)`);
            console.log(`     Reminders sent: ${JSON.stringify(b.reminders_sent || [])}`);
        }
    } catch (err) {
        console.error('❌ Reminders Check Failed:', err.message);
    }

    // 4. Follow-up Status
    try {
        console.log('\n🤖 Active Lead Follow-ups:');
        const leads = await pb.collection('leads').getFullList({
            filter: 'status="Follow Up" && followup_active=true'
        });

        if (leads.length === 0) {
            console.log('   (No active follow-ups)');
        }

        for (const l of leads) {
            console.log(`   - ${l.name} (${l.whatsapp}): Step ${l.followup_count}/7. Last sent: ${l.last_followup_sent || 'Never'}`);
        }
    } catch (err) {
        console.error('❌ Follow-ups Check Failed:', err.message);
    }

    console.log('\n--- DIAGNOSTICS COMPLETE ---');
}

checkSystem();
