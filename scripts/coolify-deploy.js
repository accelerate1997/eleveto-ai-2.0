import fetch from 'node-fetch';

/**
 * Trigger a Coolify rebuild via API
 * Usage: node scripts/coolify-deploy.js <API_KEY> <RESOURCE_UUID>
 */

const COOLIFY_API_KEY = process.argv[2] || process.env.COOLIFY_API_KEY;
const RESOURCE_UUID = process.argv[3] || process.env.COOLIFY_RESOURCE_UUID;

if (!COOLIFY_API_KEY || !RESOURCE_UUID) {
    console.error('❌ Missing COOLIFY_API_KEY or COOLIFY_RESOURCE_UUID');
    process.exit(1);
}

async function deploy() {
    console.log(`🚀 Triggering Coolify deployment for resource: ${RESOURCE_UUID}...`);
    
    try {
        const response = await fetch(`https://app.coolify.io/api/v1/deploy?uuid=${RESOURCE_UUID}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${COOLIFY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Deployment failed: ${error}`);
        }

        const result = await response.json();
        console.log('✅ Deployment triggered successfully!');
        console.log('🔗 Detailed logs available in your Coolify dashboard.');
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

deploy();
