import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function checkSchema() {
    await pb.collection('_superusers').authWithPassword(
        process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL,
        process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
    );

    const c = await pb.collections.getOne('bookings');
    console.log('SCHEMA_START');
    console.log(JSON.stringify(c.schema.map(f => ({ name: f.name, type: f.type }))));
    console.log('SCHEMA_END');
}

checkSchema().catch(console.error);
