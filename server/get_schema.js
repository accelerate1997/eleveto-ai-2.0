import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function getSchema() {
    try {
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        
        try {
            await pb.collection('_superusers').authWithPassword(email, password);
        } catch (e) {
            await pb.admins.authWithPassword(email, password);
        }

        const leads = await pb.collections.getOne('leads');
        console.log(JSON.stringify(leads, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

getSchema();
