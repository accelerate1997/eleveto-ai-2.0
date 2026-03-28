import fs from 'fs';

const filePath = 'aria_service.js';
let content = fs.readFileSync(filePath, 'utf8');

// Use regex to find the block regardless of exact spaces/tabs
const regex = /\/\/\s*Build the booking record[^\n]*\n\s*const videoCallUrl = booking\.metadata\?\.videoCallUrl;\n\s*const bookingRecord = \{[^}]*\};[^\n]*\n\s*\/\/\s*Only add optional fields if they have valid values\n\s*if\s*\(leadId\)\s*bookingRecord\.lead_id\s*=\s*leadId;\n\s*if\s*\(videoCallUrl\s*&&\s*videoCallUrl\.startsWith\('http'\)\)\s*bookingRecord\.meeting_link\s*=\s*videoCallUrl;\n\n\s*await\s*pb\.collection\('bookings'\)\.create\(bookingRecord\);\n\s*console\.log\(`\s*✅\s*Booking synced successfully!\s*`\);/g;

const newCode = `                    // Build the booking record
                    const videoCallUrl = booking.metadata?.videoCallUrl || booking.videoCallUrl;
                    const rescheduleUrl = \`https://cal.com/reschedule/\${booking.uid}\`;
                    
                    const bookingRecord = {
                        title: \`Strategy Meeting with \${args.name}\`,
                        date: args.start,
                        duration: 30,
                        status: 'Scheduled',
                        notes: \`Booked by Aria via Cal.com (ID: \${booking.id || 'N/A'})\`,
                        reschedule_link: rescheduleUrl,
                        reminders_sent: JSON.stringify(['confirmed'])
                    };
                    if (leadId) bookingRecord.lead_id = leadId;
                    if (videoCallUrl && videoCallUrl.startsWith('http')) bookingRecord.meeting_link = videoCallUrl;

                    await pb.collection('bookings').create(bookingRecord);
                    console.log(\`   ✅ Booking synced successfully!\`);

                    // --- Immediate Confirmation Message ---
                    const formattedTime = new Date(args.start).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'full',
                        timeStyle: 'short'
                    });

                    const confirmationText = \`✅ *Meeting Confirmed!*\\n\\nHi \${args.name}, your Strategy Meeting is booked.\\n\\n📅 *Date:* \${formattedTime}\\n🔗 *Meeting Link:* \${videoCallUrl || 'Sent via email'}\\n🔄 *Reschedule:* \${rescheduleUrl}\\n\\nI'll send you a few reminders before we start. See you then! 👋\`;
                    
                    await sendWhatsAppMessage(phone, confirmationText, 'Aria');
                    console.log(\`   📱 Confirmation sent to \${phone}\`);`;

if (regex.test(content)) {
    content = content.replace(regex, newCode);
    fs.writeFileSync(filePath, content);
    console.log('✅ Regex patch applied successfully!');
} else {
    console.error('❌ Regex did not match any content.');
    // Try a very simple regex to see where it breaks
    const simpleRegex = /\/\/\s*Build the booking record/g;
    const matches = content.match(simpleRegex);
    console.log('Partial matches for "// Build the booking record":', matches ? matches.length : 0);
}
