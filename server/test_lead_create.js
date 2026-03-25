import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function run() {
    await pb.collection('_superusers').authWithPassword(
        process.env.PB_ADMIN_EMAIL,
        process.env.PB_ADMIN_PASSWORD
    );

    // 1. Show full schema with required fields
    const c = await pb.collections.getOne('leads');
    console.log('\n=== LEADS SCHEMA ===');
    c.fields.forEach(f => {
        const req = f.required ? ' [REQUIRED]' : '';
        const opts = f.options ? ` opts=${JSON.stringify(f.options)}` : '';
        console.log(`  ${f.name} (${f.type})${req}${opts}`);
    });

    // 2. Try a minimal insert exactly as aria_service.js does it
    console.log('\n=== MINIMAL INSERT TEST (same as aria_service) ===');
    const testPhone = '919999000111';
    try {
        // First clean up any existing test lead
        try {
            const existing = await pb.collection('leads').getFirstListItem(`whatsapp="${testPhone}"`);
            await pb.collection('leads').delete(existing.id);
            console.log('Cleaned up old test lead.');
        } catch (e) { /* none existing */ }

        // Simulate what aria_service.js creates
        const data = {
            name: 'Test Lead',
            whatsapp: testPhone,
            country: 'India',
            investment: '50k',
            interest: 'AI automation for furniture business',
            notes: 'Test from diagnostic script',
            email: '',
            status: 'Qualified',
        };

        console.log('Creating with data:', JSON.stringify(data, null, 2));
        const record = await pb.collection('leads').create(data);
        console.log('✅ Lead created successfully! ID:', record.id);

        // Clean up
        await pb.collection('leads').delete(record.id);
        console.log('✅ Cleaned up.');
    } catch (err) {
        console.error('❌ CREATE FAILED:', err.message);
        if (err.data?.data) {
            Object.entries(err.data.data).forEach(([field, info]) => {
                console.error(`   Field "${field}": ${info.message} (code: ${info.code})`);
            });
        }
        console.error('Full error data:', JSON.stringify(err.data));
    }
}

run().catch(e => console.error('Fatal:', e.message));
