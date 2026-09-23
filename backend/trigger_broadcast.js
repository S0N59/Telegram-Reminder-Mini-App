async function triggerRailwayBroadcast() {
  const backendUrl = "https://backend-dev-production-77ac.up.railway.app";
  
  const englishMessage = `✨ <b>Remigram Update · What’s New</b> ✨\n\n` +
    `We’ve packed this update with major new features, refreshed UI design, and smoother interactions!\n\n` +
    `👥 <b>Collaborative Group Reminders (New!)</b>\n` +
    `You can now create and send a single reminder to multiple friends at once! Track everyone’s progress live — see who is working on the task and who has completed their part.\n\n` +
    `⏰ <b>Redesigned Time Wheel Picker</b>\n` +
    `Setting dates and times is now smoother than ever. Enjoy an intuitive time wheel picker with tactile feedback and instant smart scheduling.\n\n` +
    `🎨 <b>Refined Card Design & Smooth Animations</b>\n` +
    `Experience modern task cards in Inbox with satisfying micro-animations when transitioning status from <i>In Progress</i> 🟡 to <i>Done</i> 🟢.\n\n` +
    `📱 <b>Mobile Experience & Navigation Fixes</b>\n` +
    `Enhanced responsiveness across all devices with smart bottom navigation that never gets in your way.\n\n` +
    `⚡ <b>Performance & Bug Fixes</b>\n` +
    `General stability optimizations to make task management faster, lighter, and more reliable.\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `🚀 <i>Tap below to explore the update!</i>`;

  console.log(`Triggering broadcast on ${backendUrl}/api/broadcast with English text...`);
  
  try {
    const res = await fetch(`${backendUrl}/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: englishMessage
      })
    });
    
    const data = await res.json();
    console.log('Broadcast API Response:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

triggerRailwayBroadcast();
