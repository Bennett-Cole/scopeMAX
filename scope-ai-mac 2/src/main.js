const { app, BrowserWindow, ipcMain, desktopCapturer, safeStorage, clipboard, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
const configPath = () => path.join(app.getPath('userData'), 'scope-config.json');
function readConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    if (raw.encryptedKey && safeStorage.isEncryptionAvailable()) {
      raw.apiKey = safeStorage.decryptString(Buffer.from(raw.encryptedKey, 'base64'));
    }
    return raw;
  } catch { return {}; }
}
function writeConfig(config) {
  const clean = { model: config.model || 'gemini-3.5-flash', language: config.language || '' };
  if (config.apiKey && safeStorage.isEncryptionAvailable()) {
    clean.encryptedKey = safeStorage.encryptString(config.apiKey).toString('base64');
  } else if (config.apiKey) {
    clean.apiKey = config.apiKey;
  }
  fs.writeFileSync(configPath(), JSON.stringify(clean, null, 2), { mode: 0o600 });
}
function createWindow() {
  win = new BrowserWindow({
    width: 420, height: 650, minWidth: 360, minHeight: 460,
    title: 'Scope AI', frame: false, transparent: false,
    alwaysOnTop: true, resizable: true, show: false,
    icon: path.join(__dirname, '../assets/scope-icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.setAlwaysOnTop(true, 'floating');
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });

ipcMain.handle('scope:config:get', () => {
  const c = readConfig(); return { model: c.model || 'gemini-3.5-flash', language: c.language || '', hasKey: !!c.apiKey };
});
ipcMain.handle('scope:config:save', (_e, config) => {
  const previous = readConfig(); writeConfig({ ...previous, ...config, apiKey: config.apiKey || previous.apiKey });
  return { ok: true, hasKey: !!(config.apiKey || previous.apiKey) };
});
ipcMain.handle('scope:capture:screens', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1600, height: 1000 }, fetchWindowIcons: false });
  return sources.map(s => ({ id: s.id, name: s.name, dataUrl: s.thumbnail.toDataURL() }));
});
ipcMain.handle('scope:clipboard:copy', (_e, text) => { clipboard.writeText(String(text || '')); return { ok: true }; });
ipcMain.handle('scope:gemini:ask', async (event, { imageDataUrl, prompt, history = [] }) => {
  const config = readConfig(); const key = String(config.apiKey || '').trim();
  if (!key) return { error: 'Add your Gemini API key in Scope settings to begin.' };
  if (!imageDataUrl) return { error: 'Capture your browser screen first.' };
  const match = imageDataUrl.match(/^data:image\/(png|jpeg|webp);base64,(.*)$/);
  if (!match) return { error: 'Screen image could not be read.' };
  const model = config.model || 'gemini-3.5-flash';
  const system = 'You are Scope AI, a visual assistant for browser workflows. Observe the screen image supplied by the user and answer in a helpful, concise way. You may explain webpages, read visible text, solve visible questions, and assist with browser tasks. Do not claim to click or type unless an automation action was actually performed. If the user requests a ready-to-paste response, return the content directly. ' + (config.language ? `Always reply in ${config.language}.` : '');
  const contents = [...history, { role: 'user', parts: [{ inline_data: { mime_type: `image/${match[1]}`, data: match[2] } }, { text: String(prompt || 'Describe what is on my screen and how you can help.') }] }];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents }) });
  } catch (err) { return { error: `Network error: ${err.message}` }; }
  if (!res.ok) {
    let message = res.statusText; try { message = (await res.json()).error?.message || message; } catch {}
    return { error: `Gemini error (${res.status}): ${message}` };
  }
  const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = '', fullText = '';
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim(); if (!payload || payload === '[DONE]') continue;
      try {
        const data = JSON.parse(payload);
        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const p of parts) if (p.text) { fullText += p.text; event.sender.send('scope:gemini:delta', p.text); }
      } catch {}
    }
  }
  return { text: fullText };
});
ipcMain.on('scope:window:minimize', () => win?.minimize());
ipcMain.on('scope:window:close', () => win?.hide());
