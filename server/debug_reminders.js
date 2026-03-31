import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sendWhatsAppMessage } from './aria_service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function debug() {
    console.log('--- REMINDER DEBUGGER ---');
    
    // 1. Time Check
    const now = new Date();
    console.log(`Server Time (UTC): ${now.toISOString()}`);
    console.log(`Server Time (IST): ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

    // 2. Auth Check
    try {
        console.log(`\n🔑 Authenticating to ${pb.baseUrl}...`);
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        
        try {
            await pb.collection('_superusers').authWithPassword(email, password);
            console.log('✅ Auth successful via _superusers');
        } catch (e) {
            console.warn('⚠️ _superusers auth failed, trying legacy admins...');
            await pb.admins.authWithPassword(email, password);
            console.log('✅ Auth successful via legacy admins');
        }

        // 3. Fetch Bookings
        console.log(`\n📊 Fetching next 5 upcoming bookings...`);
        const filter = `status="Scheduled"`;
        const bookings = await pb.collection('bookings').getList(1, 5, { filter, sort: 'date', expand: 'lead_id' });
        
        if (bookings.items.length === 0) {
            console.log('❌ No scheduled bookings found.');
        }

        for (const booking of bookings.items) {
            const meetingDate = new Date(booking.date);
            const diffMs = meetingDate - now;
            const diffHours = diffMs / (1000 * 60 * 60);
            
            console.log(`\nBooking ${booking.id}:`);
            console.log(`  Date: ${booking.date} (${meetingDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
            console.log(`  Name: ${booking.expand?.lead_id?.name || 'Unknown'}`);
            console.log(`  Phone: ${booking.expand?.lead_id?.whatsapp || 'N/A'}`);
            console.log(`  Diff: ${diffHours.toFixed(2)} hours`);
            console.log(`  Sent Array: ${JSON.stringify(booking.reminders_sent)}`);

            // Threshold Check
            const thresholds = [24, 12, 6, 1];
            for (const h of thresholds) {
                const windowSize = 0.75;
                const isWithin = diffHours <= h && diffHours > (h - windowSize);
                if (isWithin) {
                    console.log(`  🎯 SHOULD TRIGGER ${h}h reminder!`);
                }
            }
        }

        // 4. Connection Check
        console.log(`\n📱 Testing WhatsApp Connection...`);
        const testPhone = '918268919143'; // User's number from previous logs
        const instanceName = process.env.INSTANCE_NAME || 'Eleveto_gx3yachgic1mjxv';
        console.log(`  Using Instance: ${instanceName}`);
        
        const success = await sendWhatsAppMessage(testPhone, '🔔 *System Check:* If you see this, the server can send reminders to your WhatsApp! ✅', instanceName);
        if (success) {
            console.log('  ✅ WhatsApp test message SENT.');
        } else {
            console.error('  ❌ WhatsApp test message FAILED.');
        }

    } catch (err) {
        console.error('\n❌ Debug failed:', err.message);
        if (err.data) console.error('Data:', JSON.stringify(err.data));
    }
}

debug();
