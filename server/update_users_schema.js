import PocketBase from 'pocketbase';

const pb = new PocketBase('http://pocketbase-do4kggwkosg0oow8c8wsgws4.31.97.231.139.sslip.io/');

pb.admins.authWithPassword('jashavantgoswami@gmail.com', '@Eleveto199704')
    .then(async () => {
        try {
            const usersCollection = await pb.collections.getOne('users');

            // Update rules
            usersCollection.listRule = '@request.auth.id != ""';
            usersCollection.viewRule = '@request.auth.id != ""';

            // Check if fields exist, if not add them
            const hasRole = usersCollection.fields.find(f => f.name === 'role');
            if (!hasRole) {
                usersCollection.fields.push({
                    name: 'role',
                    type: 'select',
                    required: false,
                    options: { maxSelect: 1, values: ['owner', 'employee'] }
                });
            }

            const hasActive = usersCollection.fields.find(f => f.name === 'active');
            if (!hasActive) {
                usersCollection.fields.push({
                    name: 'active',
                    type: 'bool',
                    required: false,
                    options: {}
                });
            }

            await pb.collections.update('users', usersCollection);
            console.log('SUCCESS: Users schema updated');
        } catch (err) {
            console.error('Update FAILED:', err.message);
            if (err.data) console.error(JSON.stringify(err.data, null, 2));
        }
    })
    .catch(err => {
        console.error('Auth FAILED:', err.message);
    });
