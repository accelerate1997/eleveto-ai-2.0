/**
 * set-webhook.js
 * Run this ONCE after deployment to register the agent's webhook URL
 * with your Evolution API instance.
 *
 * Usage: node set-webhook.js
 */

require('dotenv').config();

async function setWebhook() {
    const evoUrlSource = process.env.EVOLUTION_API_URL || '';
    const evoUrl = evoUrlSource.endsWith('/') ? evoUrlSource.slice(0, -1) : evoUrlSource;
    const evoKey = process.env.EVOLUTION_API_KEY;
    const instanceName = process.env.INSTANCE_NAME || 'Eleveto_Global';
    const agentUrl = process.env.AGENT_PUBLIC_URL;

    if (!evoUrl || !evoKey || !agentUrl) {
        console.error('❌ Missing required env vars: EVOLUTION_API_URL, EVOLUTION_API_KEY, AGENT_PUBLIC_URL');
        process.exit(1);
    }

    const webhookUrl = `${agentUrl}/webhook`;
    console.log(`\n🔧 Registering webhook for instance: ${instanceName}`);
    console.log(`📡 Webhook URL: ${webhookUrl}`);

    try {
        const response = await fetch(`${evoUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evoKey
            },
            body: JSON.stringify({
                url: webhookUrl,
                webhook_by_events: false,
                webhook_base64: false,
                events: ['messages.upsert']
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Webhook registered successfully!');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.error('❌ Failed to register webhook:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

setWebhook();
