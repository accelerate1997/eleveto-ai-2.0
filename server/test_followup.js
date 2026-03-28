import { runFollowupCycle } from './followup_service.js';

console.log('🧪 Starting Follow-up sequence test...');

runFollowupCycle()
    .then(() => {
        console.log('✅ Test cycle completed. Check logs for processing details.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Test failed:', err);
        process.exit(1);
    });
