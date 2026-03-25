import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

async function checkMessages() {
    const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');
    try {
        await pb.collection('_superusers').authWithPassword(
            process.env.PB_ADMIN_EMAIL, 
            process.env.PB_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
        );
        const messages = await pb.collection('messages').getFullList({
            filter: 'lead = "oe97w0g918zpuc"'
        });
        console.log('Messages for Jia:', messages.length);
        if (messages.length > 0) {
            console.log('Last message:', messages[messages.length - 1].content);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkMessages();
