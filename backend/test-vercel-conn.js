import https from 'https';
https.get('https://api.vercel.com', (r) => {
  console.log('OK', r.statusCode);
}).on('error', (e) => {
  console.log('ERR', e.message, e.code);
});
