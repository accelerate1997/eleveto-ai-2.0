import { processAriaMessage, clearAriaSession } from './aria_service.js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const openai = new OpenAI();
const testPhone = '919999000222';

async function runTest() {
    console.log('=== STARTING ARIA TEST ===');
    clearAriaSession(testPhone);

    const messages = [
        "Hi, I want to automate my business.",
        "My name is John Doe, from USA.",
        "I run a real estate agency.",
        "I have a budget of $5k.",
        "Yes, let's book a meeting."
    ];

    for (const msg of messages) {
        console.log(`\nUser: ${msg}`);
        const reply = await processAriaMessage(openai, msg, testPhone);
        console.log(`\nAria: ${reply}`);
    }
}

runTest().catch(console.error);
