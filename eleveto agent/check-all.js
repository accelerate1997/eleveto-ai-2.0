const fs = require('fs');
require('dotenv').config({ path: '../.env' });

async function checkAll() {
    const evoUrlSource = process.env.EVOLUTION_API_URL || '';
    const evoUrl = evoUrlSource.endsWith('/') ? evoUrlSource.slice(0, -1) : evoUrlSource;
    const evoKey = process.env.EVOLUTION_API_KEY;

    try {
        const response = await fetch(`${evoUrl}/instance/fetchInstances`, {
            headers: { 'apikey': evoKey }
        });
        const instances = await response.json();
        
        const results = [];
        for (const inst of instances) {
            const name = inst.instance?.instanceName || inst.name || inst.instanceName;
            if (!name) continue;
            
            // fetch webhook for this instance
            let webhook = null;
            try {
                const whRes = await fetch(`${evoUrl}/webhook/find/${name}`, { headers: { 'apikey': evoKey } });
                if (whRes.ok) webhook = await whRes.json();
            } catch (e) {}

            results.push({ name, status: inst.instance?.status || inst.status || 'unknown', webhook });
        }
        
        fs.writeFileSync('instances_clean.json', JSON.stringify(results, null, 2), 'utf8');
        console.log('Saved to instances_clean.json');
    } catch (e) {
        console.error(e.message);
    }
}
checkAll();
