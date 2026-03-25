import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pbeleveto.elevetoai.com/');

async function check() {
    try {
        await pb.collection('_superusers').authWithPassword('jashavantgoswami@gmail.com', '@Eleveto199704');
        const lead = await pb.collection('leads').getOne('dyouoalx5b5fqny');
        Object.keys(lead).forEach(k => {
            console.log('KEY:' + k + ' VALUE:' + lead[k]);
        });
    } catch (err) {
        console.error(err.message);
    }
}

check();
