import * as dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const API_KEY = process.env.CALCOM_API_KEY;
const EVENT_TYPE_ID = process.env.CALCOM_EVENT_TYPE_ID;
const BASE_URL = 'https://api.cal.com/v2';

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

    const url = `${BASE_URL}/slots?start=${startTime}&end=${endTime}&eventTypeId=${EVENT_TYPE_ID}`;
    
    console.log(`[Cal.com] Fetching slots for ${date}...`);
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'cal-api-version': '2024-09-04'
        }
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Cal.com Error: ${err}`);
    }

    const resJson = await response.json();
    const data = resJson.data || resJson;
    const daySlots = data[date] || data.slots?.[date] || [];
    return daySlots.map(s => s.start || s.time || s);
}

/**
 * Create a booking in Cal.com.
 * @param {object} bookingData - { name, email, phone, start }
 */
export async function createBooking(bookingData) {
    if (!API_KEY) throw new Error('Cal.com API Key missing');

    const url = `${BASE_URL}/bookings`;
    
    const payload = {
        start: bookingData.start,
        eventTypeId: parseInt(EVENT_TYPE_ID),
        attendee: {
            name: bookingData.name,
            email: bookingData.email,
            timeZone: 'Asia/Kolkata',
            language: 'en',
            phoneNumber: bookingData.phone
        }
    };

    console.log(`[Cal.com] Creating booking for ${bookingData.name} at ${bookingData.start}...`);
    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'cal-api-version': '2024-09-04'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Cal.com Booking Error: ${err}`);
    }

    return await response.json();
}
