import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function createSequencesCollection() {
    console.log('🔄 Creating Sequences collection...');
    
    try {
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        
        try {
            await pb.collection('_superusers').authWithPassword(email, password);
        } catch (e) {
            await pb.admins.authWithPassword(email, password);
        }

        try {
            await pb.collections.getOne('sequences');
            console.log('✅ Sequences collection already exists.');
        } catch (e) {
            const users = await pb.collections.getOne('users');
            const newCollection = {
                name: 'sequences',
                type: 'base',
                schema: [
                    { name: 'name', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
                    { name: 'description', type: 'text', required: false, options: { min: null, max: null, pattern: '' } },
                    { name: 'steps', type: 'json', required: true, options: {} },
                    { name: 'created_by', type: 'relation', required: false, options: { maxSelect: 1, collectionId: users.id, cascadeDelete: false } }
                ],
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: null
            };
            await pb.collections.create(newCollection);
            console.log('🎉 SUCCESS: sequences collection created!');
        }

        // Now Update Leads schema
        console.log('🔄 Updating Leads schema to include sequence relation...');
        const leads = await pb.collections.getOne('leads');
        const sequences = await pb.collections.getOne('sequences');

        const fieldsToAdd = [
            { name: 'sequence', type: 'relation', options: { maxSelect: 1, collectionId: sequences.id, cascadeDelete: false } }
        ];

        let changed = false;
        // Check both .schema and .fields
        const currentFields = leads.schema || leads.fields || [];
        
        for (const field of fieldsToAdd) {
            const exists = currentFields.some(f => f.name === field.name);
            if (!exists) {
                console.log(`➕ Adding field: ${field.name}`);
                currentFields.push(field);
                changed = true;
            }
        }

        if (changed) {
            if (leads.schema) leads.schema = currentFields;
            else if (leads.fields) leads.fields = currentFields;
            
            await pb.collections.update(leads.id, leads);
            console.log('🎉 SUCCESS: Leads schema updated!');
        } else {
            console.log('✅ Leads schema already up to date.');
        }

    } catch (err) {
        console.error('❌ Failed:', err.message);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
    }
}

createSequencesCollection();
