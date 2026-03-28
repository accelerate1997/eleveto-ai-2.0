import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function checkBookings() {
    await pb.collection('_superusers').authWithPassword(
        process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL,
        process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
    );

    const records = await pb.collection('bookings').getList(1, 1, { sort: '-created' });
    console.log('--- LATEST BOOKING ---');
    if (records.items.length > 0) {
        console.log(JSON.stringify(records.items[0], null, 2));
    } else {
        console.log('No bookings found.');
    }
}

checkBookings().catch(console.error);
