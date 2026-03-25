import * as dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const API_KEY = process.env.CALCOM_API_KEY;
const EVENT_TYPE_ID = process.env.CALCOM_EVENT_TYPE_ID;
const BASE_URL = 'https://api.cal.com/v1';

/**
 * Get available slots for a specific date.
 * @param {string} date - ISO date string (YYYY-MM-DD)
 */
export async function getAvailableSlots(date) {
    if (!API_KEY || !EVENT_TYPE_ID) {
        throw new Error('Cal.com credentials missing');
    }

    const startTime = `${date}T00:00:00Z`;
    const endTime = `${date}T23:59:59Z`;

    const url = `${BASE_URL}/slots?apiKey=${API_KEY}&eventTypeId=${EVENT_TYPE_ID}&startTime=${startTime}&endTime=${endTime}`;
    
    console.log(`[Cal.com] Fetching slots for ${date}...`);
    const response = await fetch(url);
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Cal.com Error: ${err}`);
    }

    const data = await response.json();
    const daySlots = data.slots[date] || [];
    return daySlots.map(s => s.time);
}

/**
 * Create a booking in Cal.com.
 * @param {object} bookingData - { name, email, phone, start }
 */
export async function createBooking(bookingData) {
    if (!API_KEY) throw new Error('Cal.com API Key missing');

    const url = `${BASE_URL}/bookings?apiKey=${API_KEY}`;
    
    const payload = {
        eventTypeId: parseInt(EVENT_TYPE_ID),
        start: bookingData.start,
        responses: {
            name: bookingData.name,
            email: bookingData.email,
            attendeePhoneNumber: bookingData.phone,
            title: `Strategy Meeting with ${bookingData.name}`,
        },
        timeZone: 'Asia/Kolkata',
        language: 'en',
        metadata: {},
    };

    console.log(`[Cal.com] Creating booking for ${bookingData.name} at ${bookingData.start}...`);
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Cal.com Booking Error: ${err}`);
    }

    return await response.json();
}
