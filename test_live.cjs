const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

async function testLive() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9555',
    '--user-data-dir=C:\\Users\\Noro\\AppData\\Local\\Temp\\chrome_debug_profile_9555',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  let list = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      list = await new Promise((res, rej) => {
        http.get('http://127.0.0.1:9555/json/list', r2 => {
          let d = '';
          r2.on('data', c => d += c);
          r2.on('end', () => res(JSON.parse(d)));
        }).on('error', rej);
      });
      if (list && list.length) break;
    } catch {}
  }

  const page = list[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise(res => {
    const msgId = id++;
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.id === msgId) {
        ws.off('message', handler);
        res(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  await new Promise(r => ws.on('open', r));

  const errors = [];
  ws.on('message', d => {
    const msg = JSON.parse(d);
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('[LIVE CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[LIVE EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description || '');
      errors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');

  const loadedPromise = new Promise(resolve => {
    const lHandler = (d) => {
      const msg = JSON.parse(d);
      if (msg.method === 'Page.loadEventFired') {
        ws.off('message', lHandler);
        resolve();
      }
    };
    ws.on('message', lHandler);
  });

  console.log('Navigating to live dev...');
  await send('Page.navigate', { url: 'https://frontend-dev-production-b4d9.up.railway.app' });
  await loadedPromise;
  console.log('Page loaded!');
  await new Promise(r => setTimeout(r, 2000));

  const initialCheck = await send('Runtime.evaluate', {
    expression: `(() => ({ url: window.location.href, text: document.body.innerText.slice(0, 150) }))()`,
    returnByValue: true
  });
  console.log('Initial page check:', initialCheck.result.value);

  console.log('Navigating to Studio...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button, a, div[role="button"], .nav-item'));
      const s = btns.find(b => b.textContent && b.textContent.includes('Studio'));
      if (s) s.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Clicking Post Composer...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll('.studio-module-card, div[role="button"], button'));
      const c = cards.find(x => x.textContent && (x.textContent.includes('Telegram Post Composer') || x.textContent.includes('Open Composer')));
      if (c) c.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  const dom = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        hasPostEditor: !!document.querySelector('.telegram-prose-editor'),
        headingText: document.querySelector('h1, h2, .editor-title')?.textContent,
        bodySnippet: document.body.innerText.slice(0, 300)
      };
    })()`,
    returnByValue: true
  });

  console.log('LIVE TEST RESULT:', JSON.stringify(dom.result.value, null, 2));
  console.log('LIVE ERRORS (if any):', errors);

  ws.close();
  chrome.kill();
  process.exit(0);
}

testLive().catch(err => {
  console.error(err);
  process.exit(1);
});
