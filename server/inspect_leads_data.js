import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

async function inspectLeads() {
    const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');
    try {
        await pb.collection('_superusers').authWithPassword(
            process.env.PB_ADMIN_EMAIL, 
            process.env.PB_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
        );
        const leads = await pb.collection('leads').getFullList();
        console.log('Leads:', JSON.stringify(leads.map(l => ({ 
            id: l.id, 
            name: l.name, 
            whatsapp: l.whatsapp 
        })), null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

inspectLeads();
