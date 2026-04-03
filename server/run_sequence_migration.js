import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function runMigration() {
    console.log('🔄 Starting Database Migration for Sequence Builder...');
    try {
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        
        try {
            await pb.collection('_superusers').authWithPassword(email, password);
        } catch (e) {
            await pb.admins.authWithPassword(email, password);
        }

        // 1. Get Sequences Collection ID
        let sequences;
        try {
            sequences = await pb.collections.getOne('sequences');
            console.log('✅ Found sequences collection: ' + sequences.id);
        } catch (e) {
            console.log('➕ Creating sequences collection...');
            const users = await pb.collections.getOne('users');
            sequences = await pb.collections.create({
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
            });
            console.log('🎉 Created sequences collection: ' + sequences.id);
        }

        // 2. Get Leads Collection and Update Schema
        const leads = await pb.collections.getOne('leads');
        const currentSchema = leads.schema || leads.fields || [];
        
        if (!currentSchema.some(f => f.name === 'sequence')) {
            console.log('➕ Adding sequence relation to leads...');
            const newField = {
                name: 'sequence',
                type: 'relation',
                required: false,
                options: {
                    maxSelect: 1,
                    collectionId: sequences.id,
                    cascadeDelete: false
                }
            };
            
            // PB 0.21 uses 'schema' property
            // We'll append to the existing schema to avoid breaking other fields
            const updatedSchema = [...currentSchema, newField];
            
            await pb.collections.update(leads.id, {
                schema: updatedSchema
            });
            console.log('🎉 SUCCESS: Leads schema updated!');
        } else {
            console.log('✅ Leads schema already has sequence field.');
        }

    } catch (err) {
        console.error('❌ MIGRATION FAILED:', err.message);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
    }
}

runMigration();
