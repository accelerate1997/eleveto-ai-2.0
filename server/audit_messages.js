import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

async function auditMessages() {
    const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');
    try {
        await pb.collection('_superusers').authWithPassword(
            process.env.PB_ADMIN_EMAIL, 
            process.env.PB_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
        );
        const messages = await pb.collection('messages').getFullList({
            expand: 'lead'
        });
        console.log('Total messages in DB:', messages.length);
        messages.forEach(m => {
            console.log(`- Lead: ${m.expand?.lead?.name || 'Unknown'} (${m.lead}), Role: ${m.role}, Content: ${m.content.substring(0, 30)}...`);
        });
    } catch (err) {
        console.error('Error:', err.message);
    }
}

auditMessages();
