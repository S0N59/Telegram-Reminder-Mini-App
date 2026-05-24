fetch('https://backend-one-pied-79.vercel.app/api/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    callback_query: {
      id: "123",
      data: "status_progress_9999",
      message: {
        message_id: 1,
        chat: { id: 123 }
      }
    }
  })
}).then(r => r.json()).then(console.log).catch(console.error);
