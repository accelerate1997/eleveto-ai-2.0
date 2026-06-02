import pool from './db.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sendWhatsAppMessage } from './aria_service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

/**
 * Check and send reminders for scheduled meetings.
 */
export async function checkAndSendReminders() {
    console.log(`[Reminder Service] 🔍 Checking for upcoming reminders... (${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
    const client = await pool.connect();
    
    try {
        // Fetch Scheduled bookings with lead whatsapp details
        const queryStr = `
            SELECT b.*, l.whatsapp, l.name as lead_name
            FROM public.bookings b
            LEFT JOIN public.leads l ON b.lead_id = l.id
            WHERE b.status = 'Scheduled'
            ORDER BY b.date ASC
        `;
        const res = await client.query(queryStr);
        const bookings = res.rows;
        
        console.log(`[Reminder Service] 📝 Found ${bookings.length} upcoming scheduled bookings.`);

        const now = new Date();

        for (const booking of bookings) {
            const meetingDate = new Date(booking.date);
            const diffMs = meetingDate - now;
            const diffHours = diffMs / (1000 * 60 * 60);
            
            console.log(`[Reminder Service]   - Booking ${booking.id}: T-minus ${diffHours.toFixed(2)}h`);

            // Skip past meetings or those scheduled way in the future
            if (diffHours < 0 || diffHours > 30) continue;

            let sent = [];
            try {
                if (Array.isArray(booking.reminders_sent)) {
                    sent = booking.reminders_sent;
                } else if (booking.reminders_sent) {
                    sent = typeof booking.reminders_sent === 'string'
                        ? JSON.parse(booking.reminders_sent)
                        : booking.reminders_sent;
                }
            } catch (e) { 
                console.warn(`[Reminder Service] ⚠️ Failed to parse reminders_sent for booking ${booking.id}:`, e.message);
                sent = []; 
            }

            const phone = booking.whatsapp;
            const name = booking.lead_name || 'there';

            if (!phone) {
                console.log(`[Reminder Service] ⏭️ Skipping booking ${booking.id} (No phone number associated)`);
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
                    
                    const instanceName = process.env.INSTANCE_NAME || 'Eleveto_gx3yachgic1mjxv';
                    const success = await sendWhatsAppMessage(phone, msg, instanceName);
                    
                    if (success) {
                        sent.push(threshold.id);
                        await client.query(
                            'UPDATE public.bookings SET reminders_sent = $1 WHERE id = $2',
                            [JSON.stringify(sent), booking.id]
                        );
                        console.log(`   ✅ ${threshold.id} reminder logged as sent.`);
                    } else {
                        console.error(`   ❌ Failed to send ${threshold.id} reminder to ${phone}`);
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Reminder Service] Error:', err.message);
    } finally {
        client.release();
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
