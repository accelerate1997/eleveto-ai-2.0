const MOCK_PAYLOAD = {
  triggerEvent: "BOOKING_CREATED",
  payload: {
    startTime: "2026-04-15T10:00:00.000Z",
    attendees: [
      {
        name: "Automation Test User",
        email: "automation_test@elevetoai.com",
        phoneNumber: "918268919143"
      }
    ],
    videoCallUrl: "https://meet.google.com/test-meeting-link"
  }
};

async function testWebhook() {
  console.log('🚀 Sending mock Cal.com webhook to http://localhost:3001/api/webhooks/cal...');
  
  try {
    const response = await fetch('http://localhost:3001/api/webhooks/cal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(MOCK_PAYLOAD)
    });

    const data = await response.json();
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n🌟 Test Passed! The lead should be synced and the message triggered.');
    } else {
      console.log('\n❌ Test Failed:', data.message);
    }
  } catch (err) {
    console.error('\n❌ Could not connect to server. Is it running on port 3001?', err.message);
  }
}

testWebhook();
