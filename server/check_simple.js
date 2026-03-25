import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pbeleveto.elevetoai.com/');

async function check() {
    try {
        console.log('Authenticating...');
        await pb.collection('_superusers').authWithPassword('jashavantgoswami@gmail.com', '@Eleveto199704');
        console.log('Success!');
        const col = await pb.collections.getOne('leads');
        console.log('Fields:', col.fields.map(f => f.name));
    } catch (err) {
        console.error(err.message);
    }
}

check();
