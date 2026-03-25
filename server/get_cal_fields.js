import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

async function getFields() {
    const key = process.env.CALCOM_API_KEY;
    const id = process.env.CALCOM_EVENT_TYPE_ID;
    const url = `https://api.cal.com/v1/event-types/${id}?apiKey=${key}`;
    
    try {
        const r = await fetch(url);
        const d = await r.json();
        console.log(JSON.stringify(d.event_type.bookingFields, null, 2));
    } catch (err) {
        console.error(err.message);
    }
}

getFields();
