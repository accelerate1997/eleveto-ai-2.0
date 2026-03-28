import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function updateSchema() {
    console.log('🔄 Updating Leads collection schema for 7-day follow-up...');
    try {
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        
        try {
            await pb.collection('_superusers').authWithPassword(email, password);
        } catch (e) {
            await pb.admins.authWithPassword(email, password);
        }

        const collection = await pb.collections.getOne('leads');
        
        // Add fields if they don't exist
        const fieldsToAdd = [
            { name: 'followup_count', type: 'number', options: { min: 0 } },
            { name: 'last_followup_sent', type: 'date' },
            { name: 'followup_active', type: 'bool', options: {} }
        ];

        let schemaChanged = false;
        for (const field of fieldsToAdd) {
            const exists = collection.schema ? collection.schema.some(f => f.name === field.name) : collection.fields.some(f => f.name === field.name);
            if (!exists) {
                console.log(`➕ Adding field: ${field.name}`);
                if (collection.schema) {
                    collection.schema.push(field);
                } else {
                    collection.fields.push(field);
                }
                schemaChanged = true;
            } else {
                console.log(`✅ Field ${field.name} already exists.`);
            }
        }

        if (schemaChanged) {
            await pb.collections.update(collection.id, collection);
            console.log('🎉 Schema updated successfully!');
        } else {
            console.log('ℹ️ No changes needed.');
        }

    } catch (err) {
        console.error('❌ Schema update failed:', err.message);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
    }
}

updateSchema();
