import { createBooking } from './cal_service.js';
import fs from 'fs';

async function test() {
    try {
        const res = await createBooking({
            name: 'Test User',
            email: 'test@example.com',
            phone: '+918268919143',
            start: '2026-03-30T10:00:00Z'
        });
        fs.writeFileSync('cal_res.json', JSON.stringify(res, null, 2));
        console.log('SUCCESS saved to cal_res.json');
    } catch (err) {
        fs.writeFileSync('cal_err.txt', err.message);
        console.error('FAILED saved to cal_err.txt');
    }
}

test();
