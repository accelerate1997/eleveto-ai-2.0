import { runFollowupCycle } from './followup_service.js';

console.log('🧪 [Test] Starting Follow-up sequence test script...');

async function test() {
    try {
        console.log('🧪 [Test] Calling runFollowupCycle()...');
        await runFollowupCycle();
        console.log('✅ [Test] Cycle completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ [Test] Cycle failed with error:', err);
        process.exit(1);
    }
}

test();
