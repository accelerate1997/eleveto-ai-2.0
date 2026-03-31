import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const url = process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/';
const email = process.env.PB_ADMIN_EMAIL;
const password = process.env.PB_ADMIN_PASSWORD;

async function verifyStatus() {
    const pb = new PocketBase(url);
    console.log(`🔍 Checking PocketBase: ${url}`);

    try {
        console.log('🔑 Attempting auth with _superusers...');
        try {
            await pb.collection('_superusers').authWithPassword(email, password);
            console.log('✅ Auth with _superusers SUCCESS!');
        } catch (e1) {
            console.error('❌ Auth with _superusers FAILED:', e1.message);
            console.log('🔑 Attempting fallback auth with admins...');
            try {
                await pb.admins.authWithPassword(email, password);
                console.log('✅ Auth with admins SUCCESS!');
            } catch (e2) {
                console.error('❌ Auth with admins FAILED:', e2.message);
                throw new Error('All auth methods failed.');
            }
        }

        const collections = await pb.collections.getFullList();
        console.log('\n📦 Collections Found:', collections.map(c => c.name));

        const leads = collections.find(c => c.name === 'leads');
        if (!leads) {
            console.error('❌ Missing "leads" collection!');
        } else {
            console.log('\n📋 Leads Schema:', JSON.stringify(leads.fields || leads.schema, null, 2));
            
            const requiredFields = ['followup_count', 'last_followup_sent', 'followup_active'];
            const schemaFields = leads.fields || leads.schema;
            requiredFields.forEach(f => {
                const exists = schemaFields.some(sf => sf.name === f);
                if (exists) {
                    console.log(`✅ Field "${f}" EXISTS.`);
                } else {
                    console.error(`❌ Field "${f}" MISSING!`);
                }
            });
        }

        const messages = collections.find(c => c.name === 'messages');
        if (!messages) {
            console.error('❌ Missing "messages" collection!');
        } else {
            const hasSource = (messages.fields || messages.schema).some(f => f.name === 'source');
            console.log(hasSource ? '✅ Field "source" EXISTS in messages.' : '❌ Field "source" MISSING in messages.');
        }

    } catch (err) {
        console.error('\n🛑 Fatal Diagnostic Error:', err.message);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
    }
}

verifyStatus();
