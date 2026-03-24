require('dotenv').config({ path: '../.env' });

async function fixWebhookPublic() {
    const evoUrlSource = process.env.EVOLUTION_API_URL || '';
    const evoUrl = evoUrlSource.endsWith('/') ? evoUrlSource.slice(0, -1) : evoUrlSource;
    const evoKey = process.env.EVOLUTION_API_KEY;
    const instanceName = 'Eleveto_gx3yachgic1mjxv'; // The active instance the user created

    const publicWebhookUrl = 'http://31.97.231.139:3001/webhook';
    console.log(`\n🔧 Registering public webhook for instance: ${instanceName}`);
    console.log(`📡 Webhook URL: ${publicWebhookUrl}`);

    try {
        const response = await fetch(`${evoUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
            body: JSON.stringify({
                webhook: {
                    enabled: true,
                    url: publicWebhookUrl,
                    webhookByEvents: false,
                    webhookBase64: false,
                    events: ['MESSAGES_UPSERT']
                }
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
fixWebhookPublic();
