import pool from './db.js';

const DDL_STATEMENTS = [
    // 2. Create Users Table
    `CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'employee', -- 'owner', 'employee'
        active BOOLEAN DEFAULT TRUE,
        cal_api_key TEXT,
        cal_username TEXT,
        google_meet_link TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );`,

    // 3. Create Sequences Table
    `CREATE TABLE IF NOT EXISTS public.sequences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        steps JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );`,

    // 4. Create Leads Table
    `CREATE TABLE IF NOT EXISTS public.leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT,
        whatsapp TEXT UNIQUE,
        country TEXT,
        industry TEXT,
        investment TEXT,
        status TEXT DEFAULT 'Lead',
        source TEXT DEFAULT 'Meta Ads',
        notes TEXT,
        ai_disabled BOOLEAN DEFAULT FALSE,
        sequence_id UUID REFERENCES public.sequences(id) ON DELETE SET NULL,
        followup_date TIMESTAMP WITH TIME ZONE,
        followup_active BOOLEAN DEFAULT TRUE,
        followup_count INTEGER DEFAULT 0,
        last_followup_sent TIMESTAMP WITH TIME ZONE,
        custom_followup TEXT DEFAULT '',
        created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );`,

    // 5. Create Messages Table
    `CREATE TABLE IF NOT EXISTS public.messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
        role TEXT NOT NULL, -- 'user', 'assistant', 'manual'
        content TEXT,
        attachment_path TEXT,
        source TEXT DEFAULT 'WhatsApp',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );`,

    // 6. Create Bookings Table
    `CREATE TABLE IF NOT EXISTS public.bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        duration INTEGER DEFAULT 30,
        status TEXT DEFAULT 'Scheduled',
        notes TEXT,
        meeting_link TEXT,
        reschedule_link TEXT,
        lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
        reminders_sent JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );`,

    // 7. Create Invites Table
    `CREATE TABLE IF NOT EXISTS public.invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        role TEXT DEFAULT 'employee',
        token TEXT UNIQUE NOT NULL,
        consumed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );`,

    // 8. Create Client Credentials Table
    `CREATE TABLE IF NOT EXISTS public.client_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
        platform_name TEXT NOT NULL,
        platform_id TEXT,
        password TEXT,
        api_keys TEXT,
        platform_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );`,

    // 9. Create Portfolios Table (named Portoflio to match frontend spelling)
    `CREATE TABLE IF NOT EXISTS public.portfolios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_name TEXT NOT NULL,
        description TEXT,
        project_images JSONB DEFAULT '[]'::jsonb,
        project_thumbnail TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );`
];

export async function initDb() {
    console.log('🔄 Checking and initializing PostgreSQL tables...');
    const client = await pool.connect();
    try {
        for (const statement of DDL_STATEMENTS) {
            await client.query(statement);
        }
        console.log('✅ PostgreSQL database schema check complete (all tables created or validated).');
    } catch (err) {
        console.error('❌ Database Initialization Error:', err.message);
        throw err;
    } finally {
        client.release();
    }
}

// Run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
    initDb().then(() => process.exit(0)).catch(() => process.exit(1));
}
