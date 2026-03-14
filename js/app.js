// =============================================
//  GET YOUR PROMPT — app.js
// =============================================

const state = {
  subject: '',
  camera: '', lens: '', angle: '', ar: '',
  options: {},
  geminiKey: localStorage.getItem('gemini_key') || '',
  generatedPrompt: ''
};

window.addEventListener('DOMContentLoaded', () => {
  if (state.geminiKey) document.getElementById('api-key-input').value = state.geminiKey;
  document.getElementById('subject').addEventListener('input', e => {
    state.subject = e.target.value;
    updateRawPrompt();
  });
  document.querySelectorAll('.pill').forEach(p => p.addEventListener('click', () => togglePill(p)));
  updateActiveChips();
  updateRawPrompt();
});

// ── Tab switching ──────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  event.currentTarget.classList.add('active');
}

// ── API Key ───────────────────────────────────
function saveKey() {
  const val = document.getElementById('api-key-input').value.trim();
  state.geminiKey = val;
  localStorage.setItem('gemini_key', val);
  const btn = document.querySelector('.btn-save-key');
  btn.textContent = '✓ Saved'; btn.style.color = '#10b981'; btn.style.borderColor = 'rgba(16,185,129,0.5)';
  setTimeout(() => { btn.textContent = 'Save'; btn.style.color = ''; btn.style.borderColor = ''; }, 2000);
}

// ── Dropdowns ─────────────────────────────────
function onSelect(type, el) {
  state[type] = el.value;
  el.classList.toggle('active', !!el.value);
  updateActiveChips(); updateRawPrompt();
}

// ── Pills ─────────────────────────────────────
function togglePill(pill) {
  const group = pill.dataset.group, val = pill.dataset.val;
  if (group === 'ar') {
    const same = state.ar === val;
    document.querySelectorAll('.pill[data-group="ar"]').forEach(p => p.classList.remove('active'));
    state.ar = same ? '' : val;
    if (!same) pill.classList.add('active');
  } else {
    const same = state.options[group] === val;
    document.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
    if (same) delete state.options[group];
    else { state.options[group] = val; pill.classList.add('active'); }
  }
  updateActiveChips(); updateRawPrompt();
}

function removeSelection(type, isOption) {
  if (isOption) { delete state.options[type]; document.querySelectorAll(`.pill[data-group="${type}"]`).forEach(p => p.classList.remove('active')); }
  else if (type === 'ar') { state.ar = ''; document.querySelectorAll('.pill[data-group="ar"]').forEach(p => p.classList.remove('active')); }
  else { state[type] = ''; const s = document.getElementById('sel-' + type); if (s) { s.value = ''; s.classList.remove('active'); } }
  updateActiveChips(); updateRawPrompt();
}

// ── Build Prompt ──────────────────────────────
function buildRawPrompt() {
  const parts = [];
  if (state.subject.trim()) parts.push(state.subject.trim());
  if (state.camera) parts.push(`shot on ${state.camera}`);
  if (state.lens)   parts.push(`using ${state.lens}`);
  if (state.angle)  parts.push(`${state.angle} shot`);
  Object.values(state.options).forEach(v => { if (v) parts.push(v); });
  let p = parts.join(', ');
  if (state.ar) p += ` --ar ${state.ar}`;
  return p;
}

function updateRawPrompt() {
  const raw = buildRawPrompt();
  const el = document.getElementById('raw-prompt');
  el.innerHTML = raw ? '' : '<span class="output-placeholder">Start selecting options...</span>';
  if (raw) el.textContent = raw;
}

// ── Active Chips ──────────────────────────────
function updateActiveChips() {
  const container = document.getElementById('active-chips');
  const badge = document.getElementById('active-count');
  const items = [];
  if (state.camera) items.push({ label: '📷 ' + state.camera, key: 'camera', isOption: false });
  if (state.lens)   items.push({ label: '🔭 ' + state.lens,   key: 'lens',   isOption: false });
  if (state.angle)  items.push({ label: '🎬 ' + state.angle,  key: 'angle',  isOption: false });
  if (state.ar)     items.push({ label: '⬛ ' + state.ar,     key: 'ar',     isOption: false });
  Object.entries(state.options).forEach(([k, v]) => { if (v) items.push({ label: v, key: k, isOption: true }); });
  badge.textContent = items.length;
  container.innerHTML = items.length === 0
    ? '<span class="placeholder-chips">Nothing selected yet</span>'
    : items.map(i => `<span class="chip">${i.label}<button onclick="removeSelection('${i.key}',${i.isOption})">×</button></span>`).join('');
}

// ── Gemini API ────────────────────────────────
async function callGemini(promptText) {
  const key = state.geminiKey || document.getElementById('api-key-input').value.trim();
  if (!key) throw new Error('No API key — please enter your Gemini key above.');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contents:[{ parts:[{ text: promptText }] }] }) }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Generate ──────────────────────────────────
async function generatePrompt() {
  if (!state.subject.trim()) { shakeInput(); return; }
  const raw = buildRawPrompt();
  const instruction = `Create a professional cinematic AI image generation prompt based on: ${raw}. Make it vivid, detailed, optimized for AI image generation. Return only the prompt text.`;
  const btn = document.getElementById('btn-generate');
  const genIcon = document.getElementById('gen-icon');
  const genLabel = document.getElementById('gen-label');
  const outputBody = document.getElementById('output-body');
  const outputFooter = document.getElementById('output-footer');
  btn.disabled = true;
  genIcon.innerHTML = '<span class="spinner"></span>';
  genLabel.textContent = 'Generating...';
  outputBody.innerHTML = '<span class="thinking-text">✦ AI is crafting your prompt...</span>';
  outputFooter.style.display = 'none';
  try {
    const result = await callGemini(instruction);
    state.generatedPrompt = result;
    outputBody.textContent = result;
    outputFooter.style.display = 'flex';
    document.getElementById('stat-chars').textContent = result.length + ' chars';
    document.getElementById('stat-words').textContent = result.split(/\s+/).filter(Boolean).length + ' words';
  } catch (err) {
    outputBody.innerHTML = `<span style="color:#f87171">❌ ${err.message}</span>`;
    state.generatedPrompt = '';
  }
  btn.disabled = false; genIcon.textContent = '✦'; genLabel.textContent = 'Generate';
}

function copyPrompt() {
  const text = state.generatedPrompt || buildRawPrompt();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-copy');
    const label = document.getElementById('copy-label');
    btn.classList.add('copied'); label.textContent = 'Copied!';
    setTimeout(() => { btn.classList.remove('copied'); label.textContent = 'Copy'; }, 2000);
  });
}

function resetAll() {
  state.subject = ''; state.camera = ''; state.lens = ''; state.angle = ''; state.ar = '';
  state.options = {}; state.generatedPrompt = '';
  document.getElementById('subject').value = '';
  ['sel-camera','sel-lens','sel-angle'].forEach(id => { const el = document.getElementById(id); if(el){el.value='';el.classList.remove('active');} });
  document.querySelectorAll('.pill.active').forEach(p => p.classList.remove('active'));
  document.getElementById('output-body').innerHTML = '<span class="output-placeholder">Your AI-enhanced prompt will appear here...</span>';
  document.getElementById('output-footer').style.display = 'none';
  updateActiveChips(); updateRawPrompt();
}

function shakeInput() {
  const el = document.getElementById('subject');
  el.style.borderColor = '#f87171';
  el.placeholder = 'Please describe your image idea first!';
  setTimeout(() => { el.style.borderColor = ''; el.placeholder = 'e.g. A lone astronaut on Mars, dust storm approaching, lantern in hand...'; }, 2000);
}
