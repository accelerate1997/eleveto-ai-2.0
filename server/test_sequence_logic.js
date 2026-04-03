import { runFollowupCycle } from './followup_service.js';
import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function testSequence() {
    console.log('🧪 Testing Sequence Follow-up Logic...');
    
    try {
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        
        try {
            await pb.collection('_superusers').authWithPassword(email, password);
        } catch (e) {
            await pb.admins.authWithPassword(email, password);
        }

        // 1. Find or create a test lead
        let testLead;
        try {
            const records = await pb.collection('leads').getList(1, 1, {
                filter: 'name="Test Lead Sequence"'
            });
            if (records.total > 0) testLead = records.items[0];
        } catch (e) {}

        if (!testLead) {
            testLead = await pb.collection('leads').create({
                name: 'Test Lead Sequence',
                whatsapp: '1234567890',
                status: 'Follow Up',
                followup_active: true,
                followup_count: 0
            });
        }

        // 2. Assign a sequence if not already assigned
        const sequences = await pb.collection('sequences').getList(1, 1);
        if (sequences.total > 0) {
            await pb.collection('leads').update(testLead.id, {
                sequence: sequences.items[0].id,
                followup_count: 0,
                last_followup_sent: '2000-01-01 00:00:00' // Force it to be due
            });
            console.log(`✅ Assigned sequence "${sequences.items[0].name}" to test lead.`);
        }

        // 3. Run the cycle
        console.log('🚀 Running Cycle...');
        await runFollowupCycle();
        
        // 4. Check results (log will show if it used the sequence)
        console.log('🏁 Test completed. Check logs above.');

    } catch (err) {
        console.error('❌ Test failed:', err.message);
    }
}

testSequence();
