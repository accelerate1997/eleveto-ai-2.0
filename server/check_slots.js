import { getAvailableSlots } from './cal_service.js';

async function check() {
    try {
        const slots = await getAvailableSlots('2026-03-30');
        console.log('Available slots:', JSON.stringify(slots, null, 2));
    } catch (err) {
        console.error('FAILED:', err.message);
    }
}

check();
