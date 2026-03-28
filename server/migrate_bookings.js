import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://pbeleveto.elevetoai.com/');

async function migrate() {
    await pb.collection('_superusers').authWithPassword(
        process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL,
        process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
    );

    const collection = await pb.collections.getOne('bookings');
    console.log('--- COLLECTION DETAILS ---');
    console.log('Keys:', Object.keys(collection));
    
    // Check if it's .schema or .fields
    const fields = collection.fields || collection.schema || [];
    console.log('Fields count:', fields.length);

    const fieldsToAdd = [
        { name: 'reschedule_link', type: 'text' },
        { name: 'reminders_sent', type: 'json' }
    ];

    let updated = false;
    for (const field of fieldsToAdd) {
        if (!fields.find(f => f.name === field.name)) {
            console.log(`➕ Adding field: ${field.name}`);
            fields.push(field);
            updated = true;
        } else {
            console.log(`✅ Field already exists: ${field.name}`);
        }
    }

    if (updated) {
        // Prepare the update object
        const updateData = {};
        if (collection.fields) updateData.fields = fields;
        else updateData.schema = fields;

        await pb.collections.update(collection.id, updateData);
        console.log('🎉 Migration successful!');
    } else {
        console.log('😎 No changes needed.');
    }
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err.message);
    if (err.data) console.error(JSON.stringify(err.data, null, 2));
});
