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

        const filter = 'status="Follow Up" && followup_active=true && followup_count < 7';
        console.log(`🔍 Querying leads with filter: ${filter}`);
        
        const leads = await pb.collection('leads').getFullList({
            filter,
            sort: '-created'
        });

        console.log(`📊 Found ${leads.length} leads matching the criteria.`);
        for (const l of leads) {
            console.log(`  - ${l.name} (${l.id}): status=${l.status}, active=${l.followup_active}, count=${l.followup_count}`);
        }
    } catch (err) {
        console.error('❌ Query Error:', err.message);
    }
}
run();
