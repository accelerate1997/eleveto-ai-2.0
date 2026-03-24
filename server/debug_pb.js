import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const url = process.env.VITE_PB_URL;
const email = process.env.PB_ADMIN_EMAIL;
const password = process.env.PB_ADMIN_PASSWORD;

console.log('--- PocketBase Debug ---');
console.log('URL:', url);
console.log('Email:', email);
console.log('Password length:', password ? password.length : 0);

const variations = [
    "https://pbeleveto.elevetoai.com/pb/",
    "http://pbeleveto.elevetoai.com/pb/",
    "https://pbeleveto.elevetoai.com/",
    "http://pbeleveto.elevetoai.com/",
    "http://pocketbase-do4kggwkosg0oow8c8wsgws4.31.97.231.139.sslip.io/",
    "http://31.97.231.139:8090/",
    "https://pbeleveto.elevetoai.com/pb",
];

async function test() {
    for (const url of variations) {
        console.log(`\n--- Testing URL: ${url} ---`);
        const pb = new PocketBase(url);
        try {
            console.log('Trying pb.admins...');
            await pb.admins.authWithPassword(email, password);
            console.log('✅ Admins Auth Success!');
            return;
        } catch (err) {
            console.error('❌ Admins Fail:', err.message);
            try {
                console.log('Trying pb.collection("_superusers")...');
                await pb.collection('_superusers').authWithPassword(email, password);
                console.log('✅ Superusers Auth Success!');
                return;
            } catch (err2) {
                console.error('❌ Superusers Fail:', err2.message);
            }
        }
    }
}

test();
