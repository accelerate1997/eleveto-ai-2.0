import bcrypt from 'bcryptjs';
import pool from './db.js';

const USERS_TO_SEED = [
    {
        email: 'jashavantgoswami@gmail.com',
        name: 'jashavant goswami',
        password: '@Eleveto199704', // Seed with owner password from env
        role: 'owner'
    },
    {
        email: 'test_user_666@test.com',
        name: 'Test User',
        password: '@ElevetoTemporary123',
        role: 'employee'
    },
    {
        email: 'test@example.com',
        name: 'Test Agent',
        password: '@ElevetoTemporary123',
        role: 'employee'
    },
    {
        email: 'team@elevetoai.com',
        name: 'testing team',
        password: '@ElevetoTemporary123',
        role: 'employee'
    }
];

export async function seedUsers() {
    console.log('🌱 Seeding user accounts into PostgreSQL...');
    const client = await pool.connect();
    try {
        for (const user of USERS_TO_SEED) {
            // Check if user already exists
            const checkRes = await client.query('SELECT id FROM public.users WHERE email = $1', [user.email]);
            if (checkRes.rows.length > 0) {
                console.log(`   ⏭️ User ${user.email} already exists. Skipping.`);
                continue;
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(user.password, salt);

            await client.query(
                'INSERT INTO public.users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
                [user.email, passwordHash, user.name, user.role]
            );
            console.log(`   ✅ Seeded user: ${user.email} (Role: ${user.role})`);
        }
        console.log('🎉 Seeding complete!');
    } catch (err) {
        console.error('❌ Seeding Error:', err.message);
        throw err;
    } finally {
        client.release();
    }
}

// Run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
    seedUsers().then(() => process.exit(0)).catch(() => process.exit(1));
}
