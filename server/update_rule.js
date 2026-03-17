import PocketBase from 'pocketbase';

const pb = new PocketBase('http://pocketbase-do4kggwkosg0oow8c8wsgws4.31.97.231.139.sslip.io/');
pb.admins.authWithPassword('jashavantgoswami@gmail.com', '@Eleveto199704').then(async () => {
    try {
        const users = await pb.collections.getOne('users');
        users.updateRule = 'id = @request.auth.id || @request.auth.role = "owner"';
        await pb.collections.update('users', users);
        console.log('SUCCESS');
    } catch (err) {
        console.error('FAILED:', err.message);
        if (err.data) console.log(JSON.stringify(err.data, null, 2));
    }
});
