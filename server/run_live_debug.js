import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

async function testLiveWarning() {
    try {
        console.log('Fetching live debug endpoint on elevetoai.com...');
        const key = process.env.DEBUG_KEY || 'aria_debug_default_key_99';
        const res = await fetch(`https://elevetoai.com/api/debug/lead?key=${key}`);
        const text = await res.text();
        console.log('--- RESPONSE ---');
        console.log('HTTP Status:', res.status);
        try {
            console.log(JSON.stringify(JSON.parse(text), null, 2));
        } catch (e) {
            console.log('Raw text:', text);
        }
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

testLiveWarning();
