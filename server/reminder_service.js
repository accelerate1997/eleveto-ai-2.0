import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sendWhatsAppMessage } from './aria_service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function ensureAuth() {
    try {
        if (pb.authStore.isValid) return;
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        if (!email || !password) return;

        try {
            await pb.collection('_superusers').authWithPassword(email, password);
        } catch (e) {
            // Fallback for older PocketBase versions
            await pb.admins.authWithPassword(email, password);
        }
    } catch (err) {
        console.error('[Reminder Service] PB Auth Error:', err.message);
    }
}

/**
 * Check and send reminders for scheduled meetings.
 */
export async function checkAndSendReminders() {
    console.log(`[Reminder Service] 🔍 Checking for upcoming reminders... (${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
    
    try {
        await ensureAuth();
        
        // Fetch ALL scheduled bookings (we'll filter in JS to be safe with timezones)
        const bookings = await pb.collection('bookings').getFullList({ 
            filter: 'status="Scheduled"', 
            expand: 'lead_id',
            sort: 'date'
        });
        
        console.log(`[Reminder Service] 📝 Found ${bookings.length} upcoming scheduled bookings.`);

        const now = new Date(); // Re-initialize strictly to ensure freshness

        for (const booking of bookings) {
            const meetingDate = new Date(booking.date);
            const diffMs = meetingDate - now;
            const diffHours = diffMs / (1000 * 60 * 60);
            
            console.log(`[Reminder Service]   - Booking ${booking.id}: T-minus ${diffHours.toFixed(2)}h`);

            // Skip past meetings
            if (diffHours < 0) continue;
            // Only consider meetings in the next 30 hours
            if (diffHours > 30) continue;

            let sent = [];
            try {
                if (Array.isArray(booking.reminders_sent)) {
                    sent = booking.reminders_sent;
                } else if (booking.reminders_sent && typeof booking.reminders_sent === 'string') {
                    // Try parsing if it's a string, handle empty/malformed
                    if (booking.reminders_sent.trim().startsWith('[')) {
                        sent = JSON.parse(booking.reminders_sent);
                    }
                }
            } catch (e) { 
                console.warn(`[Reminder Service] ⚠️ Failed to parse reminders_sent for booking ${booking.id}:`, e.message);
                sent = []; 
            }

            const lead = booking.expand?.lead_id;
            const phone = lead?.whatsapp;
            const name = lead?.name || 'there';

            if (!phone) {
                console.log(`[Reminder Service] ⏭️ Skipping booking ${booking.id} (No phone number)`);
                continue;
            }

            // Thresholds for reminders
            const thresholds = [
                { id: '24h', hours: 24, label: 'tomorrow' },
                { id: '12h', hours: 12, label: 'in 12 hours' },
                { id: '6h', hours: 6, label: 'in 6 hours' },
                { id: '1h', hours: 1, label: 'in 1 hour' }
            ];

            for (const threshold of thresholds) {
                // If we are within the threshold (e.g., less than target hours but not too far past)
                // We use a 45-minute window for the 15-minute interval check to be safe
                const windowSize = 0.75; 
                const isWithinWindow = diffHours <= threshold.hours && diffHours > (threshold.hours - windowSize);
                
                if (isWithinWindow && !sent.includes(threshold.id)) {
                    
                    console.log(`[Reminder Service] 🚨 Sending ${threshold.id} reminder to ${name} (${phone}) for meeting at ${meetingDate.toISOString()}`);
                    
                    const formattedTime = meetingDate.toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit', minute: '2-digit', hour12: true
                    });
                    const formattedDate = meetingDate.toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium'
                    });

                    const msg = `🔔 *Reminder:* Hi ${name}, your Strategy Meeting is scheduled for *${threshold.label}* at ${formattedTime} (${formattedDate}).\n\n🔗 *Meeting Link:* ${booking.meeting_link || 'Sent via email'}\n🔄 *Reschedule:* ${booking.reschedule_link || 'Check your email'}\n\nSee you soon! 👋`;
                    
                    const instanceName = process.env.INSTANCE_NAME || 'Eleveto_Global';
                    const success = await sendWhatsAppMessage(phone, msg, instanceName);
                    if (success) {
                        sent.push(threshold.id);
                        await pb.collection('bookings').update(booking.id, { reminders_sent: sent });
                        console.log(`   ✅ ${threshold.id} reminder logged as sent.`);
                    } else {
                        console.error(`   ❌ Failed to send ${threshold.id} reminder to ${phone}`);
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Reminder Service] Error:', err.message);
    }
}

/**
 * Start the reminder loop.
 */
export function startReminderService(intervalMinutes = 15) {
    console.log(`[Reminder Service] 🚀 Started (Check every ${intervalMinutes} minutes)`);
    // Run immediately on start
    checkAndSendReminders();
    // Then every interval
    setInterval(checkAndSendReminders, intervalMinutes * 60 * 1000);
}
