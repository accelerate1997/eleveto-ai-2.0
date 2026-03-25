async function testLiveWarning() {
    try {
        console.log('Fetching live debug endpoint on elevetoai.com...');
        const res = await fetch('https://elevetoai.com/api/debug/lead?key=test1234');
        const text = await res.text();
        console.log('--- RESPONSE ---');
        console.log('HTTP Status:', res.status);
        try {
            console.log(JSON.stringify(JSON.parse(text), null, 2));
        } catch (e) {
            console.log('Raw text:', text);
        }
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

testLiveWarning();
