require('dotenv').config({ path: '../.env' });

async function listInstances() {
    const evoUrlSource = process.env.EVOLUTION_API_URL || '';
    const evoUrl = evoUrlSource.endsWith('/') ? evoUrlSource.slice(0, -1) : evoUrlSource;
    const evoKey = process.env.EVOLUTION_API_KEY;

    try {
        const response = await fetch(`${evoUrl}/instance/fetchInstances`, {
            method: 'GET',
            headers: { 'apikey': evoKey }
        });

        const data = await response.json();
        // data usually looks like [{ instance: { instanceName: "..." } }] or [{ name: "..." }]
        data.forEach((item, index) => {
            console.log(`Instance ${index + 1}:`, item.instance?.instanceName || item.instanceName || item.name || item);
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

listInstances();
