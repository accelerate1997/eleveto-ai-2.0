import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const url = process.env.VITE_PB_URL;
const email = process.env.PB_ADMIN_EMAIL;
const password = process.env.PB_ADMIN_PASSWORD;

async function checkSchema() {
    const pb = new PocketBase(url);
    try {
        console.log('Authenticating...');
        await pb.collection('_superusers').authWithPassword(email, password);
        console.log('Auth Success!');

        const collection = await pb.collections.getOne('leads');
        console.log('Collection: leads');
        console.log('Fields:', JSON.stringify(collection.fields || collection.schema, null, 2));
        
        // Also fetch the last lead created
        const lastLeads = await pb.collection('leads').getList(1, 1, { sort: '-created' });
        if (lastLeads.items.length > 0) {
            console.log('\nLast Lead Data:', JSON.stringify(lastLeads.items[0], null, 2));
        }
    } catch (err) {
        console.error('Error:', err.message);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
    }
}

checkSchema();
