import fs from 'fs';

const filePath = 'aria_service.js';
const content = fs.readFileSync(filePath, 'utf8');

const oldCode = `                    // Build the booking record — only include meeting_link if it's a real URL
                    const videoCallUrl = booking.metadata?.videoCallUrl;
                    const bookingRecord = {
                        title: \`Strategy Meeting with \${args.name}\`,
                        date: args.start,
                        duration: 30,
                        status: 'Scheduled',
                        notes: \`Booked by Aria via Cal.com (ID: \${booking.id || 'N/A'})\`,
                    };
                    // Only add optional fields if they have valid values
                    if (leadId) bookingRecord.lead_id = leadId;
                    if (videoCallUrl && videoCallUrl.startsWith('http')) bookingRecord.meeting_link = videoCallUrl;

                    await pb.collection('bookings').create(bookingRecord);
                    console.log(\`   ✅ Booking synced successfully!\`);`;

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
                        reminders_sent: JSON.stringify(['confirmed']) // Mark confirmed as sent
                    };
                    // Only add optional fields if they have valid values
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

// Standardize line endings for the match
const normalizedOld = oldCode.replace(/\r\n/g, '\n').trim();
const normalizedContent = content.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedOld)) {
    const updatedContent = normalizedContent.replace(normalizedOld, newCode.trim());
    fs.writeFileSync(filePath, updatedContent);
    console.log('✅ Update successful!');
} else {
    console.error('❌ Could not find the old code block in the file.');
    // Log a bit of the file for debug
    const startIdx = normalizedContent.indexOf('// Build the booking record');
    if (startIdx !== -1) {
        console.log('Found start at:', startIdx);
        console.log('Snippet:', JSON.stringify(normalizedContent.substring(startIdx, startIdx + 200)));
    }
}
