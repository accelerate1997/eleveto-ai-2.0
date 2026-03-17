import PocketBase from 'pocketbase';

const pb = new PocketBase('http://pocketbase-do4kggwkosg0oow8c8wsgws4.31.97.231.139.sslip.io/');

pb.admins.authWithPassword('jashavantgoswami@gmail.com', '@Eleveto199704')
    .then(async () => {
        try {
            await pb.collections.getOne('invites');
            console.log('Invites collection already exists');
        } catch (e) {
            if (e.status === 404) {
                const users = await pb.collections.getOne('users');
                const newCollection = {
                    name: 'invites',
                    type: 'base',
                    listRule: '@request.auth.id != ""',
                    viewRule: '@request.auth.id != ""',
                    createRule: '@request.auth.id != ""',
                    updateRule: '@request.auth.id != ""',
                    deleteRule: null,
                    fields: [
                        { name: 'token', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
                        { name: 'used', type: 'bool', required: false, options: {} },
                        { name: 'created_by', type: 'relation', required: false, options: { maxSelect: 1, collectionId: users.id, cascadeDelete: false } }
                    ]
                };
                await pb.collections.create(newCollection);
                console.log('SUCCESS: invites collection created');
            } else {
                console.error('Error fetching collection:', e.message);
            }
        }
    })
    .catch(err => {
        console.error('FAILED:', err.message);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
    });
