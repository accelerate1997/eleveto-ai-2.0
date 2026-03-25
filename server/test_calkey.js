import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const apiKey = process.env.CALCOM_API_KEY;
console.log('Using key:', apiKey?.substring(0, 15) + '...');

const res = await fetch(`https://api.cal.com/v1/bookings?apiKey=${apiKey}&status=upcoming`);
console.log('Status:', res.status);
const data = await res.json();
if (data.bookings) {
    console.log(`✅ Key is VALID. Found ${data.bookings.length} bookings.`);
    data.bookings.slice(0, 3).forEach(b => console.log(`  - ${b.title} | ${b.startTime} | ${b.status}`));
} else {
    console.log('❌ Key issue:', JSON.stringify(data));
}
