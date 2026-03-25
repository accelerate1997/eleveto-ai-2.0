import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

async function getFields() {
    const key = process.env.CALCOM_API_KEY;
    const id = process.env.CALCOM_EVENT_TYPE_ID;
    const url = `https://api.cal.com/v1/event-types/${id}?apiKey=${key}`;
    console.log('Fetching:', url);
    
    try {
        const r = await fetch(url);
        const d = await r.json();
        fs.writeFileSync('event_type_fields.json', JSON.stringify(d, null, 2));
        console.log('Saved to event_type_fields.json');
    } catch (err) {
        console.error(err.message);
    }
}

getFields();
