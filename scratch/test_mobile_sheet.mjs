import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\Noro\\.gemini\\antigravity\\brain\\ba7ca665-a803-443d-8db0-393c65b1a466\\scratch\\chrome_profile_mobile_sheet';
const PORT = 9229;
const TARGET_URL = 'https://frontend-dev-production-b4d9.up.railway.app/?tab=studio&mode=editor';
const ARTIFACT_DIR = 'C:\\Users\\Noro\\.gemini\\antigravity\\brain\\ba7ca665-a803-443d-8db0-393c65b1a466';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Starting Mobile Chrome test...');
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=390,844',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    let wsUrl = null;
    for (let i = 0; i < 20; i++) {
      await sleep(400);
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
        if (res.ok) {
          const json = await res.json();
          wsUrl = json.webSocketDebuggerUrl;
          break;
        }
      } catch (e) {}
    }

    const ws = new WebSocket(wsUrl);
    let id = 1;
    const pending = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const reqId = id++;
        pending.set(reqId, { resolve, reject });
        ws.send(JSON.stringify({ id: reqId, method, params }));
      });
    }

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

    function sendSession(method, params = {}) {
      return new Promise((resolve, reject) => {
        const reqId = id++;
        pending.set(reqId, { resolve, reject });
        ws.send(JSON.stringify({ id: reqId, sessionId, method, params }));
      });
    }

    await sendSession('Page.enable');
    await sendSession('Runtime.enable');

    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sendSession('Emulation.setTouchEmulationEnabled', { enabled: true });

    await sendSession('Page.navigate', { url: TARGET_URL });
    await sleep(4000);

    // Click the + button
    const clickRes = await sendSession('Runtime.evaluate', {
      expression: `
        (function() {
          const btn = document.querySelector('.toolbar-btn-insert, .insert-block-btn');
          if (btn) {
            btn.click();
            return { clicked: true, className: btn.className };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true
    });
    console.log('Click + result:', clickRes.result?.value);
    await sleep(800);

    const ss = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'mobile_insert_bottom_sheet.png'), Buffer.from(ss.data, 'base64'));
    console.log('Saved mobile_insert_bottom_sheet.png');

    ws.close();
  } finally {
    try {
      chromeProcess.kill('SIGKILL');
    } catch {}
  }
}

run().catch(console.error);
