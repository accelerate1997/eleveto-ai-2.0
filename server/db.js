import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

// Use DATABASE_URL from env, with a standard fallback for development
const connectionString = process.env.DATABASE_URL || process.env.Database_url;

if (!connectionString) {
    console.warn('⚠️ WARNING: DATABASE_URL is not set in environment/dotenv. Direct Postgres calls may fail.');
}

const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
});

export default pool;
