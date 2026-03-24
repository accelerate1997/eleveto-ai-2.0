/**
 * test_aria.js
 * Local test utility to simulate a conversation with Aria.
 * Usage: node test_aria.js
 */
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import readline from 'readline';
import { processAriaMessage } from './aria_service.js';

// Load environment variables
dotenv.config({ path: '../.env' });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const TEST_PHONE = '919876543210';

console.log('--- 🤖 Aria Local Test Environment ---');
console.log('Type your message to Aria (type "exit" to quit)');
console.log(`Simulating phone: ${TEST_PHONE}\n`);

async function chat() {
    rl.question('User: ', async (userInput) => {
        if (userInput.toLowerCase() === 'exit') {
            rl.close();
            return;
        }

        try {
            console.log('Aria is thinking...');
            const reply = await processAriaMessage(openai, userInput, TEST_PHONE);
            console.log(`\nAria: ${reply}\n`);
            chat(); // Continue conversation
        } catch (err) {
            console.error('Error:', err.message);
            rl.close();
        }
    });
}

chat();
