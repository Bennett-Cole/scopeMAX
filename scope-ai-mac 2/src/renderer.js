const $ = (id) => document.getElementById(id);
let screenData = null; let history = []; let busy = false;
function bubble(type, text) { const el = document.createElement('div'); el.className = `bubble ${type}`; el.textContent = text; $('messages').appendChild(el); $('messages').scrollTop = $('messages').scrollHeight; return el; }
async function capture() {
  $('capture').disabled = true; $('capture').textContent = 'Capturing…'; $('footstatus').textContent = 'Requesting screen access';
  try {
    const screens = await window.scope.getScreens();
    if (!screens.length) throw new Error('No display was available to capture.');
    screenData = screens[0].dataUrl; $('preview').src = screenData; $('preview').hidden = false; document.querySelector('.empty-preview').hidden = true;
    $('screen-label').textContent = screens[0].name || 'Screen captured'; $('screen-label').previousElementSibling.classList.add('active');
    $('hint').textContent = 'Screen context ready · ⌘ Enter to send'; $('footstatus').textContent = 'Screen captured';
  } catch (e) { bubble('error', `Screen capture failed: ${e.message}\nOn macOS, allow Scope AI under System Settings → Privacy & Security → Screen Recording, then restart the app.`); $('footstatus').textContent = 'Capture permission needed'; }
  finally { $('capture').disabled = false; $('capture').textContent = 'Capture screen'; }
}
async function ask(prompt) {
  if (busy || !prompt.trim()) return;
  if (!screenData) { bubble('error', 'Capture your browser screen before asking Scope AI.'); return; }
  busy = true; $('send').disabled = true; bubble('user', prompt.trim()); $('prompt').value = '';
  const live = bubble('ai', ''); let accumulated = '';
  const off = window.scope.onDelta(delta => { accumulated += delta; live.textContent = accumulated; $('messages').scrollTop = $('messages').scrollHeight; });
  const result = await window.scope.ask({ imageDataUrl: screenData, prompt: prompt.trim(), history }); off();
  if (result.error) { live.className = 'bubble error'; live.textContent = result.error; }
  else { live.textContent = result.text || 'No response received.'; history.push({ role: 'user', parts: [{ text: prompt.trim() }] }, { role: 'model', parts: [{ text: result.text }] }); const copy = document.createElement('button'); copy.textContent = 'Copy answer'; copy.style.marginTop = '7px'; copy.onclick = () => window.scope.copy(result.text); live.appendChild(document.createElement('br')); live.appendChild(copy); }
  busy = false; $('send').disabled = false; $('footstatus').textContent = result.error ? 'Needs attention' : 'Answer ready';
}
$('capture').onclick = capture; $('ask-form').onsubmit = e => { e.preventDefault(); ask($('prompt').value); };
$('prompt').addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); ask($('prompt').value); } });
document.querySelectorAll('[data-prompt]').forEach(b => b.onclick = () => ask(b.dataset.prompt));
$('settings-toggle').onclick = () => $('settings').hidden = !$('settings').hidden;
$('save').onclick = async () => { const apiKey = $('api-key').value.trim(); await window.scope.saveConfig({ apiKey, model: $('model').value.trim() || 'gemini-3.5-flash', language: $('language').value.trim() }); $('api-key').value = ''; $('key-status').textContent = apiKey ? 'Gemini key saved securely on this Mac.' : 'Settings saved.'; $('footstatus').textContent = 'Settings saved'; };
$('min').onclick = () => window.scope.minimize(); $('close').onclick = () => window.scope.close();
(async () => { const config = await window.scope.getConfig(); $('model').value = config.model; $('language').value = config.language; $('key-status').textContent = config.hasKey ? 'Gemini key is saved on this Mac.' : 'Add your Gemini API key to enable AI.'; })();
