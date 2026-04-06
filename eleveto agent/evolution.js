require('dotenv').config();

/**
 * Sends a WhatsApp message via the Evolution API
 * @param {string} remoteJid - The recipient's phone number or JID
 * @param {string} text - The message text to send
 * @param {string} instanceName - The Evolution API instance name
 */
async function sendMessage(remoteJid, text, instanceName) {
    const evoUrlSource = process.env.EVOLUTION_API_URL || '';
    const evoUrl = evoUrlSource.endsWith('/') ? evoUrlSource.slice(0, -1) : evoUrlSource;
    const evoKey = process.env.EVOLUTION_API_KEY;

    if (!evoUrl || !evoKey) {
        console.error("❌ Evolution API keys missing in .env. Cannot send message.");
        return false;
    }

    try {
        const cleanNumber = remoteJid.replace('+', '').replace('@s.whatsapp.net', '');
        console.log(`📡 Sending message to ${cleanNumber} via instance ${instanceName}...`);

        // Calculate dynamic delay to simulate human typing
        // Assuming ~60ms per character to be realistic (min 5s, max 15s delay)
        const typingDelay = Math.max(5000, Math.min(15000, text.length * 60));

        // FORCE Node.js to actually wait for this amount of time before even sending the request to Evolution API.
        // This guarantees the delay happens even if the API server ignores the delay parameter.
        await new Promise(resolve => setTimeout(resolve, typingDelay));

        const response = await fetch(`${evoUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evoKey
            },
            body: JSON.stringify({
                number: cleanNumber,
                options: {
                    delay: typingDelay,
                    presence: "composing",
                    linkPreview: false
                },
                text: text
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("✅ Message sent successfully!");
            return true;
        } else {
            console.error("❌ Failed to send message. HTTP", response.status);
            console.error("❌ Evolution API Error:", JSON.stringify(data, null, 2));
            return false;
        }
    } catch (error) {
        console.error("❌ Error sending message:", error);
        return false;
    }
}

module.exports = { sendMessage };
