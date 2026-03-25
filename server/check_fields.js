import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pbeleveto.elevetoai.com/');

async function check() {
    try {
        await pb.collection('_superusers').authWithPassword('jashavantgoswami@gmail.com', '@Eleveto199704');
        const col = await pb.collections.getOne('leads');
        col.fields.forEach(f => {
            console.log('FIELD:' + f.name);
        });
    } catch (err) {
        console.error(err.message);
    }
}

check();
