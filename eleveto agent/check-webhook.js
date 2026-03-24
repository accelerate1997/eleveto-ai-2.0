require('dotenv').config({ path: '../.env' });

async function checkWebhook() {
    const evoUrlSource = process.env.EVOLUTION_API_URL || '';
    const evoUrl = evoUrlSource.endsWith('/') ? evoUrlSource.slice(0, -1) : evoUrlSource;
    const evoKey = process.env.EVOLUTION_API_KEY;
    const instanceName = process.env.INSTANCE_NAME || 'Eleveto_Global';

    if (!evoUrl || !evoKey) {
        console.error('❌ Missing required env vars: EVOLUTION_API_URL, EVOLUTION_API_KEY');
        process.exit(1);
    }

    console.log(`\n🔍 Checking webhook for instance: ${instanceName}`);
    console.log(`📡 Evolution API URL: ${evoUrl}`);

    try {
        const response = await fetch(`${evoUrl}/webhook/find/${instanceName}`, {
            method: 'GET',
            headers: {
                'apikey': evoKey
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Webhook configuration:');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.error('❌ Failed to fetch webhook:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkWebhook();
