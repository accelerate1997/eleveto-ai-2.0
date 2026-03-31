import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const url = process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/';
const email = process.env.PB_ADMIN_EMAIL;
const password = process.env.PB_ADMIN_PASSWORD;

async function run() {
    const pb = new PocketBase(url);
    try {
        console.log('Authenticating...');
        await pb.collection('_superusers').authWithPassword(email, password);
        console.log('✅ Auth Success!');

        console.log('\n--- Checking leads collection schema ---');
        const leadsColl = await pb.collections.getOne('leads');
        console.log(JSON.stringify(leadsColl.fields || leadsColl.schema, null, 2));

        console.log('\n--- Checking messages collection schema ---');
        const msgColl = await pb.collections.getOne('messages');
        console.log(JSON.stringify(msgColl.fields || msgColl.schema, null, 2));

        console.log('\n--- Checking Lead "Jash" ---');
        const leads = await pb.collection('leads').getFullList({
            filter: 'name ~ "Jash" || whatsapp ~ "919967832916"'
        });
        console.log('Found leads:', JSON.stringify(leads, null, 2));

        if (leads.length > 0) {
            const leadId = leads[0].id;
            console.log(`\n--- Last 5 messages for lead ${leadId} ---`);
            const msgs = await pb.collection('messages').getList(1, 5, {
                filter: `lead="${leadId}"`,
                sort: '-created'
            });
            console.log(JSON.stringify(msgs.items, null, 2));
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
    }
}

run();
