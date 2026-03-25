import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

async function diagnose() {
    const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');
    
    try {
        await pb.collection('_superusers').authWithPassword(
            process.env.PB_ADMIN_EMAIL, 
            process.env.PB_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
        );
        
        console.log(`Searching for lead with name containing "Ashish"...`);
        let lead;
        try {
            const leads = await pb.collection('leads').getFullList({
                filter: 'name ~ "Ashish"'
            });
            console.log(`Found ${leads.length} leads matching "Ashish".`);
            if (leads.length > 0) {
                console.log('✅ Lead record(s) FOUND:', JSON.stringify(leads, null, 2));
                lead = leads[0];
            } else {
                console.log('❌ No lead found with name "Ashish".');
            }
        } catch (e) {
            console.log('❌ Search failed:', e.message);
        }

        if (lead) {
            console.log(`Checking messages for lead ${lead.id}...`);
            const msgs = await pb.collection('messages').getList(1, 10, { 
                filter: `lead="${lead.id}"`,
                sort: '-id'
            });
            console.log(`Found ${msgs.totalItems} messages.`);
            console.log(JSON.stringify(msgs.items.map(m => `[${m.role}] ${m.content.substring(0, 50)}...`), null, 2));
        }

    } catch (err) {
        console.error('Error:', err.message);
        if (err.data) console.error('Data:', JSON.stringify(err.data));
    }
}

diagnose();
