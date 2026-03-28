import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { checkAndSendReminders } from './reminder_service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function verify() {
    console.log('--- VERIFICATION START ---');
    try {
        console.log(`🔑 Attempting auth to ${pb.baseUrl} as ${process.env.PB_ADMIN_EMAIL}...`);
        
        // Try new superuser auth first
        try {
            await pb.collection('_superusers').authWithPassword(
                process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL,
                process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
            );
            console.log('✅ Auth successful via _superusers');
        } catch (e) {
            console.warn('⚠️ _superusers auth failed, trying legacy admins...');
            await pb.admins.authWithPassword(
                process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL,
                process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
            );
            console.log('✅ Auth successful via legacy admins');
        }

        // 1. Check recent bookings
        const records = await pb.collection('bookings').getList(1, 5, { sort: '-created' });
        console.log(`\n📊 Checking last 5 bookings:`);
        records.items.forEach(r => {
            console.log(`- ID: ${r.id} | Notes: ${r.notes.substring(0, 30)}...`);
            console.log(`  Link: ${r.reschedule_link || 'MISSING'}`);
            console.log(`  Sent: ${JSON.stringify(r.reminders_sent)}`);
        });

        // 2. Trigger a manual reminder check (it will log results)
        console.log('\n🔔 Triggering manual reminder check...');
        await checkAndSendReminders();
        
        console.log('\n--- VERIFICATION DONE ---');
    } catch (err) {
        console.error('❌ Verification failed:', err.message);
        if (err.data) console.error('Data:', JSON.stringify(err.data));
    }
}

verify();
