import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function run() {
    try {
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        
        try {
            await pb.collection('_superusers').authWithPassword(email, password);
        } catch (e) {
            await pb.admins.authWithPassword(email, password);
        }

        const leads = await pb.collection('leads').getFullList({
            filter: 'status="Follow Up" && (followup_active=false || followup_active=null)'
        });

        console.log(`Activating ${leads.length} leads...`);
        for (const l of leads) {
            await pb.collection('leads').update(l.id, { 
                followup_active: true, 
                followup_count: 0 
            });
            console.log(`✅ Activated: ${l.name}`);
        }
        console.log('Done!');
    } catch (err) {
        console.error('Error:', err.message);
    }
}
run();
