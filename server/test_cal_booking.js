import { createBooking } from './cal_service.js';

async function test() {
    try {
        const res = await createBooking({
            name: 'Test User',
            email: 'test@example.com',
            phone: '+918268919143',
            start: '2026-03-30T10:00:00Z'
        });
        console.log('SUCCESS:', JSON.stringify(res, null, 2));
    } catch (err) {
        console.error('FAILED:', err.message);
    }
}

test();
