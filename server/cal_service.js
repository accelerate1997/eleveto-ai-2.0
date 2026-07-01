import * as dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

/**
 * Get available slots for a specific date (local booking engine).
 * Generates slots from 10:00 AM to 6:00 PM IST (Asia/Kolkata).
 * Excludes slots that conflict with existing scheduled bookings.
 * @param {string} date - ISO date string (YYYY-MM-DD)
 */
export async function getAvailableSlots(date) {
    console.log(`[Custom Booking Engine] Generating slots for ${date}...`);
    
    // 1. Generate all possible 30-minute slots in IST (10:00 AM to 6:00 PM)
    const possibleSlots = [];
    const startHour = 10;
    const endHour = 18;

    for (let hour = startHour; hour < endHour; hour++) {
        for (const minute of [0, 30]) {
            // Generate time string in IST
            const dateStr = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
            // Parse in IST (+05:30) and get UTC ISO string
            const dateObj = new Date(`${dateStr}+05:30`);
            possibleSlots.push(dateObj.toISOString());
        }
    }

    // 2. Fetch existing active bookings on that day
    const dayStart = new Date(`${date}T00:00:00+05:30`).toISOString();
    const dayEnd = new Date(`${date}T23:59:59+05:30`).toISOString();
    
    const query = `
        SELECT date, duration 
        FROM public.bookings 
        WHERE status != 'Cancelled' 
          AND date >= $1 
          AND date <= $2
    `;
    const dbRes = await pool.query(query, [dayStart, dayEnd]);

    // 3. Filter out slots that overlap with any existing booking
    const availableSlots = possibleSlots.filter(slot => {
        const slotStartMs = new Date(slot).getTime();
        const slotEndMs = slotStartMs + 30 * 60 * 1000; // 30 mins slot duration

        const hasConflict = dbRes.rows.some(booking => {
            const bookingStartMs = new Date(booking.date).getTime();
            const bookingEndMs = bookingStartMs + (booking.duration || 30) * 60 * 1000;
            // Standard overlap check
            return slotStartMs < bookingEndMs && bookingStartMs < slotEndMs;
        });

        return !hasConflict;
    });

    console.log(`[Custom Booking Engine] Found ${availableSlots.length} available slots.`);
    return availableSlots;
}

/**
 * Create mock booking details for local CRM persistence (local booking engine).
 * @param {object} bookingData - { name, email, phone, start }
 */
export async function createBooking(bookingData) {
    console.log(`[Custom Booking Engine] Creating booking template for ${bookingData.name} at ${bookingData.start}...`);
    
    let meetingLink = '';
    try {
        const ownerRes = await pool.query("SELECT google_meet_link FROM public.users WHERE role = 'owner' LIMIT 1");
        if (ownerRes.rows.length > 0 && ownerRes.rows[0].google_meet_link) {
            meetingLink = ownerRes.rows[0].google_meet_link.trim();
            console.log(`[Custom Booking Engine] Using owner's static Google Meet link: ${meetingLink}`);
        }
    } catch (err) {
        console.warn(`[Custom Booking Engine] Failed to fetch owner's Google Meet link:`, err.message);
    }

    if (!meetingLink) {
        const cleanName = bookingData.name.replace(/[^a-zA-Z0-9]/g, '-');
        const randomSuffix = Math.random().toString(36).substring(2, 7);
        const meetingId = `Eleveto-Strategy-${cleanName}-${randomSuffix}`;
        meetingLink = `https://meet.jit.si/${meetingId}`;
        console.log(`[Custom Booking Engine] Fallback to Jitsi Meet link: ${meetingLink}`);
    }

    const bookingId = 'local-' + Math.random().toString(36).substring(2, 9);

    return {
        status: 'success',
        data: {
            id: bookingId,
            uid: bookingId,
            title: `Strategy Meeting with ${bookingData.name}`,
            startTime: bookingData.start,
            status: 'Scheduled',
            meetingUrl: meetingLink,
            attendees: [
                {
                    name: bookingData.name,
                    email: bookingData.email,
                    phoneNumber: bookingData.phone
                }
            ]
        }
    };
}
