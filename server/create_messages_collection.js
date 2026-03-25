import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

async function createCollection() {
    const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');
    try {
        await pb.collection('_superusers').authWithPassword(
            process.env.PB_ADMIN_EMAIL, 
            process.env.PB_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
        );

        // Check if collection already exists
        try {
            await pb.collections.getOne('messages');
            console.log('Collection "messages" already exists.');
            return;
        } catch (e) {
            // Table doesn't exist, proceed to create
        }

        const collection = {
            name: 'messages',
            type: 'base',
            schema: [
                {
                    name: 'lead',
                    type: 'relation',
                    required: true,
                    options: {
                        collectionId: (await pb.collections.getOne('leads')).id,
                        cascadeDelete: true,
                        maxSelect: 1
                    }
                },
                {
                    name: 'role',
                    type: 'text',
                    required: true,
                },
                {
                    name: 'content',
                    type: 'text',
                    required: true,
                }
            ],
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '', // Allow system to create
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
        };

        await pb.collections.create(collection);
        console.log('✅ Collection "messages" created successfully!');
    } catch (err) {
        console.error('Error:', err.message);
        if (err.data) console.error('Data:', JSON.stringify(err.data));
    }
}

createCollection();
