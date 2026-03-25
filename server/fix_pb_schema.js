import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pbeleveto.elevetoai.com/');

async function fixSchema() {
    try {
        console.log('Authenticating...');
        await pb.collection('_superusers').authWithPassword('jashavantgoswami@gmail.com', '@Eleveto199704');
        console.log('Auth Success!');

        const collection = await pb.collections.getOne('leads');
        const field = collection.fields.find(f => f.name === 'investment_');
        
        if (field) {
            console.log('Found field investment_. Renaming to investment...');
            field.name = 'investment';
            await pb.collections.update('leads', collection);
            console.log('✅ Collection updated successfully!');
        } else {
            console.log('Field investment_ not found. Checking for investment...');
            const hasInvestment = collection.fields.find(f => f.name === 'investment');
            if (hasInvestment) {
                console.log('✅ Field investment already exists.');
            } else {
                console.log('❌ Neither investment_ nor investment found!');
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
    }
}

fixSchema();
