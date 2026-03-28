import { checkAndSendReminders } from './reminder_service.js';

console.log('--- Reminders Service Test ---');
checkAndSendReminders().then(() => {
    console.log('Test completed.');
    process.exit(0);
}).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
