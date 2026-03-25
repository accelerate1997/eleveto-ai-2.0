import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pbeleveto.elevetoai.com/');

async function check() {
    try {
        await pb.collection('_superusers').authWithPassword('jashavantgoswami@gmail.com', '@Eleveto199704');
        const col = await pb.collections.getOne('leads');
        console.log('FIELDS_START[' + col.fields.map(f => f.name).join(',') + ']FIELDS_END');
    } catch (err) {
        console.error(err.message);
    }
}

check();
