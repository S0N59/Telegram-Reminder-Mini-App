import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\Noro\\.gemini\\antigravity\\brain\\ba7ca665-a803-443d-8db0-393c65b1a466\\scratch\\chrome_profile_redesign';
const PORT = 9228;
const TARGET_URL = 'https://frontend-dev-production-b4d9.up.railway.app/?tab=studio&mode=editor';
const ARTIFACT_DIR = 'C:\\Users\\Noro\\.gemini\\antigravity\\brain\\ba7ca665-a803-443d-8db0-393c65b1a466';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Starting Chrome for testing Remigram Studio redesign...');
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1280,850',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    let wsUrl = null;
    for (let i = 0; i < 25; i++) {
      await sleep(500);
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
        if (res.ok) {
          const json = await res.json();
          wsUrl = json.webSocketDebuggerUrl;
          break;
        }
      } catch (e) {}
    }

    if (!wsUrl) throw new Error('Chrome remote debugging did not respond');

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
    await sendSession('DOM.enable');

    console.log(`Navigating to ${TARGET_URL}...`);
    await sendSession('Page.navigate', { url: TARGET_URL });
    await sleep(3000);

    // Ensure we are on the Studio tab and post editor is open
    const initScript = `
      (function() {
        // Find and click Studio tab if needed
        const buttons = Array.from(document.querySelectorAll('button, [role="tab"]'));
        const studioBtn = buttons.find(b => b.textContent && b.textContent.includes('Studio'));
        if (studioBtn) studioBtn.click();
        
        // If there is an editor button or composer button, click it
        setTimeout(() => {
          const composerBtns = Array.from(document.querySelectorAll('button'));
          const openEditor = composerBtns.find(b => b.textContent && (b.textContent.includes('Post Composer') || b.textContent.includes('New Post') || b.textContent.includes('Compose')));
          if (openEditor) openEditor.click();
        }, 500);
      })()
    `;
    await sendSession('Runtime.evaluate', { expression: initScript });
    await sleep(2000);

    // Ensure we are on the Studio tab and post editor is open
    await sendSession('Network.clearBrowserCache');
    
    const checkEditor = await sendSession('Runtime.evaluate', {
      expression: `!!document.querySelector('.telegram-post-editor-page, .docs-formatting-toolbar')`
    });
    console.log('Editor present on desktop:', checkEditor.value);

    // Take screenshot 1: Desktop Editor Canvas
    const ss1 = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'desktop_editor_canvas.png'), Buffer.from(ss1.data, 'base64'));
    console.log('Captured desktop_editor_canvas.png');

    // Toggle formatting shelf (Aa)
    await sendSession('Runtime.evaluate', {
      expression: `
        const toggle = document.querySelector('.toolbar-btn-format, .toolbar-toggle-btn');
        if (toggle) toggle.click();
      `
    });
    await sleep(600);
    const ss2 = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'desktop_format_shelf.png'), Buffer.from(ss2.data, 'base64'));
    console.log('Captured desktop_format_shelf.png');

    // Open [+] Insert block popover
    await sendSession('Runtime.evaluate', {
      expression: `
        const insertBtn = document.querySelector('.toolbar-btn-insert, .insert-block-btn');
        if (insertBtn) insertBtn.click();
      `
    });
    await sleep(600);
    const ss3 = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'desktop_insert_popover.png'), Buffer.from(ss3.data, 'base64'));
    console.log('Captured desktop_insert_popover.png');

    // Close insert menu
    await sendSession('Runtime.evaluate', {
      expression: `
        const closeBtn = document.querySelector('.sheet-close-btn, .insert-block-backdrop');
        if (closeBtn) closeBtn.click();
      `
    });
    await sleep(400);

    // Switch to Mobile Viewport (iPhone 14/15 Pro: 390x844)
    console.log('Switching to mobile viewport (390x844)...');
    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sendSession('Emulation.setTouchEmulationEnabled', { enabled: true });
    await sleep(1000);

    // Close any opened shelf so we capture clean mobile canvas
    await sendSession('Runtime.evaluate', {
      expression: `
        const toggle = document.querySelector('.toolbar-btn-format.is-open');
        if (toggle) toggle.click();
      `
    });
    await sleep(500);

    const ssMobile1 = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'mobile_editor_canvas.png'), Buffer.from(ssMobile1.data, 'base64'));
    console.log('Captured mobile_editor_canvas.png');

    // Mobile: open [+] Insert bottom sheet
    await sendSession('Runtime.evaluate', {
      expression: `
        const insertBtn = document.querySelector('.toolbar-btn-insert, .insert-block-btn');
        if (insertBtn) insertBtn.click();
      `
    });
    await sleep(700);
    const ssMobile2 = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'mobile_insert_bottom_sheet.png'), Buffer.from(ssMobile2.data, 'base64'));
    console.log('Captured mobile_insert_bottom_sheet.png');

    // Close bottom sheet
    await sendSession('Runtime.evaluate', {
      expression: `
        const closeBtn = document.querySelector('.sheet-close-btn, .insert-block-backdrop');
        if (closeBtn) closeBtn.click();
      `
    });
    await sleep(400);

    // Mobile: Open Preview modal
    await sendSession('Runtime.evaluate', {
      expression: `
        const previewBtn = document.querySelector('.mobile-preview-toggle-btn');
        if (previewBtn) previewBtn.click();
      `
    });
    await sleep(700);
    const ssMobile3 = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'mobile_preview_sheet.png'), Buffer.from(ssMobile3.data, 'base64'));
    console.log('Captured mobile_preview_sheet.png');

    console.log('All tests completed successfully!');
    ws.close();
  } finally {
    try {
      chromeProcess.kill('SIGKILL');
    } catch {}
  }
}

run().catch(console.error);
