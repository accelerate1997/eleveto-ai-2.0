import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function finalDbSetup() {
    console.log('🔄 Finalizing Database Setup for Sequences...');
    try {
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        
        try {
            await pb.collection('_superusers').authWithPassword(email, password);
        } catch (e) {
            await pb.admins.authWithPassword(email, password);
        }

        // 1. Ensure Sequences collection exists
        let sequences;
        try {
            sequences = await pb.collections.getOne('sequences');
            console.log('✅ Found sequences collection.');
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
            console.log('🎉 Created sequences collection!');
        }

        // 2. Add sequence field to leads
        console.log('🔄 Updating Leads schema...');
        const leads = await pb.collections.getOne('leads');
        const currentSchema = leads.schema || leads.fields || [];
        
        const sequenceFieldExists = currentSchema.some(f => f.name === 'sequence');
        if (!sequenceFieldExists) {
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
            
            // Rebuild schema carefully
            const updatedSchema = [...currentSchema, newField];
            
            // Clean up schema items (remove internal PB properties if present)
            const cleanedSchema = updatedSchema.map(f => {
                const { id, system, ...rest } = f; // some versions might fail if id/system are sent back
                return rest;
            });

            await pb.collections.update(leads.id, {
                schema: cleanedSchema
            });
            console.log('🎉 SUCCESS: Leads schema updated!');
        } else {
            console.log('✅ Leads schema already has sequence field.');
        }

        // 3. Create a Default Sequence
        const existingDefault = await pb.collection('sequences').getList(1, 1, { filter: 'name = "Default AI Sequence"' });
        if (existingDefault.total === 0) {
            console.log('➕ Creating Default AI Sequence...');
            await pb.collection('sequences').create({
                name: 'Default AI Sequence',
                description: 'The standard 7-day AI follow-up cycle.',
                steps: [
                    { day: 1, mode: 'ai_directive', content: 'Friendly check-in. Mention their initial interest.' },
                    { day: 3, mode: 'ai_directive', content: 'Provide AI value insight or value. Ask for a demo.' },
                    { day: 5, mode: 'ai_directive', content: 'Address potential hesitation. Mention saving 20+ hours.' },
                    { day: 7, mode: 'ai_directive', content: 'Final "break-up" check-in. Ask if we should stop following up.' }
                ]
            });
            console.log('🎉 Created Default AI Sequence!');
        } else {
            console.log('✅ Default AI Sequence exists.');
        }

    } catch (err) {
        console.error('❌ FATAL ERROR:', err.message);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
    }
}

finalDbSetup();
