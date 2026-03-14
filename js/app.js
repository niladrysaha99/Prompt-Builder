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

// =============================================
//  IMAGE REFERENCES — Gemini Vision Auto-Prompt
// =============================================

const refs = {
  character: { url: null, base64: null, mimeType: null, aiPrompt: '' },
  background: { url: null, base64: null, mimeType: null, aiPrompt: '' },
  element:    { url: null, base64: null, mimeType: null, aiPrompt: '' }
};

const refInstructions = {
  character: 'Analyze this character reference image. Generate a concise, detailed AI image generation prompt describing the character\'s appearance: face, hair, skin tone, clothing, style, pose, expression. Write only the prompt text, no intro or explanation. Max 60 words.',
  background: 'Analyze this background/environment reference image. Generate a concise, detailed AI image generation prompt describing the setting: location, architecture, time of day, weather, atmosphere, colors, mood. Write only the prompt text, no intro or explanation. Max 60 words.',
  element: 'Analyze this element/prop reference image. Generate a concise, detailed AI image generation prompt describing the object: its material, texture, style, color, condition, details. Write only the prompt text, no intro or explanation. Max 50 words.'
};

// ── Load image & trigger AI ───────────────────
function loadRef(type, event) {
  const file = event.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);

  // Read as base64 for Gemini Vision
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result.split(',')[1];
    refs[type] = { url, base64, mimeType: file.type, aiPrompt: '' };

    // Show preview
    showRefPreview(type, url);
    updateRefBadge(type);

    // Auto-generate AI prompt
    await autoGenerateRefPrompt(type);
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// ── Show preview thumbnail ────────────────────
function showRefPreview(type, url) {
  const prefixes = { character: 'char', background: 'bg', element: 'el' };
  const p = prefixes[type];

  // Inline (builder tab)
  const singleWrap  = document.getElementById(`${p}-preview-single`);
  const singleImg   = document.getElementById(`${p}-preview-img`);
  if (singleWrap && singleImg) { singleImg.src = url; singleWrap.style.display = 'flex'; }

  // Full (refs tab)
  const fullWrap = document.getElementById(`${p}-full-preview-wrap`);
  const fullImg  = document.getElementById(`${p}-full-preview-img`);
  if (fullWrap && fullImg) { fullImg.src = url; fullWrap.style.display = 'flex'; }
}

// ── Auto-generate with Gemini Vision ─────────
async function autoGenerateRefPrompt(type) {
  const key = state.geminiKey || localStorage.getItem('gemini_key') || '';
  const prefixes = { character: 'char', background: 'bg', element: 'el' };
  const p = prefixes[type];

  // Show output boxes with loading state
  const inlineBox  = document.getElementById(`${p}-ai-output`);
  const inlineText = document.getElementById(`${p}-ai-text`);
  const fullBox    = document.getElementById(`${p}-full-ai-box`);
  const fullText   = document.getElementById(`${p}-full-ai-text`);

  if (inlineBox)  inlineBox.style.display  = 'block';
  if (fullBox)    fullBox.style.display    = 'block';

  const loadingHtml = '<span class="thinking-text">✦ Analyzing image...</span>';
  if (inlineText) inlineText.innerHTML = loadingHtml;
  if (fullText)   fullText.innerHTML   = loadingHtml;

  if (!key) {
    const noKeyMsg = '<span style="color:#f87171;font-size:0.8rem">⚠ Add your Gemini API key to auto-generate prompts</span>';
    if (inlineText) inlineText.innerHTML = noKeyMsg;
    if (fullText)   fullText.innerHTML   = noKeyMsg;
    return;
  }

  try {
    const body = {
      contents: [{
        parts: [
          { text: refInstructions[type] },
          { inline_data: { mime_type: refs[type].mimeType, data: refs[type].base64 } }
        ]
      }]
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    refs[type].aiPrompt = text;

    if (inlineText) inlineText.textContent = text;
    if (fullText)   fullText.textContent   = text;

    updateCombinedRefPrompt();
    updateRawPrompt();

  } catch (err) {
    const errMsg = `<span style="color:#f87171;font-size:0.8rem">❌ ${err.message}</span>`;
    if (inlineText) inlineText.innerHTML = errMsg;
    if (fullText)   fullText.innerHTML   = errMsg;
  }
}

// ── Regenerate ────────────────────────────────
async function regenRefAI(type) {
  if (!refs[type].base64) return;
  await autoGenerateRefPrompt(type);
}

// ── Copy individual ref prompt ────────────────
function copyRefAI(type) {
  const text = refs[type].aiPrompt;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    // Find all copy buttons for this type and flash them
    const prefixes = { character: 'char', background: 'bg', element: 'el' };
    const p = prefixes[type];
    document.querySelectorAll(`#${p}-ai-output .ref-ai-copy, #${p}-full-ai-box .ref-ai-copy`).forEach(btn => {
      btn.textContent = '✓ Copied!'; btn.style.color = '#10b981';
      setTimeout(() => { btn.textContent = 'Copy'; btn.style.color = ''; }, 2000);
    });
  });
}

// ── Use ref prompt in main subject ───────────
function useRefPrompt(type) {
  const text = refs[type].aiPrompt;
  if (!text) return;
  const subjectEl = document.getElementById('subject');
  const current = subjectEl.value.trim();
  subjectEl.value = current ? current + ', ' + text : text;
  state.subject = subjectEl.value;
  updateRawPrompt();
  // Switch to builder tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-builder').classList.add('active');
  document.querySelector('.tab-btn:first-child').classList.add('active');
  subjectEl.scrollIntoView({ behavior: 'smooth' });
}

function useAllRefsInPrompt() {
  const parts = ['character','background','element'].map(t => refs[t].aiPrompt).filter(Boolean);
  if (!parts.length) return;
  const subjectEl = document.getElementById('subject');
  const current = subjectEl.value.trim();
  subjectEl.value = current ? current + ', ' + parts.join(', ') : parts.join(', ');
  state.subject = subjectEl.value;
  updateRawPrompt();
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-builder').classList.add('active');
  document.querySelector('.tab-btn:first-child').classList.add('active');
}

// ── Clear individual ref ──────────────────────
function clearRef(type) {
  const prefixes = { character: 'char', background: 'bg', element: 'el' };
  const p = prefixes[type];
  refs[type] = { url: null, base64: null, mimeType: null, aiPrompt: '' };

  [`${p}-preview-single`, `${p}-full-preview-wrap`].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  [`${p}-ai-output`, `${p}-full-ai-box`].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  [`${p}-ai-text`, `${p}-full-ai-text`].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
  updateRefBadge(type);
  updateCombinedRefPrompt();
  updateRawPrompt();
}

// ── Clear all refs ────────────────────────────
function clearAllRefs() {
  ['character','background','element'].forEach(clearRef);
}

// ── Badge ─────────────────────────────────────
function updateRefBadge(type) {
  const badgeMap = { character: 'char-ref-badge', background: 'bg-ref-badge', element: 'el-ref-badge' };
  const badge = document.getElementById(badgeMap[type]);
  if (!badge) return;
  const has = !!refs[type].url;
  badge.textContent = has ? '1' : '0';
  badge.style.display = has ? 'inline' : 'none';
}

// ── Combined ref prompt ───────────────────────
function getRefContext() {
  return ['character','background','element']
    .map(t => refs[t].aiPrompt)
    .filter(Boolean);
}

function updateCombinedRefPrompt() {
  const el = document.getElementById('combined-ref-prompt');
  if (!el) return;
  const parts = getRefContext();
  if (!parts.length) {
    el.innerHTML = '<span class="output-placeholder">Upload references — AI prompts will combine here automatically...</span>';
  } else {
    el.textContent = parts.join(', ');
  }
}

function copyRefPrompt() {
  const parts = getRefContext();
  if (!parts.length) return;
  navigator.clipboard.writeText(parts.join(', ')).then(() => {
    const btn = event.currentTarget;
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  });
}

// ── Drag & drop setup ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ['char-upload-zone','bg-upload-zone','el-upload-zone'].forEach(zoneId => {
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    const type = zoneId.includes('char') ? 'character' : zoneId.includes('bg') ? 'background' : 'element';
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.style.borderColor = '#10b981'; zone.style.background = 'rgba(16,185,129,0.08)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; zone.style.background = ''; });
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.style.borderColor = ''; zone.style.background = '';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const fakeEvent = { target: { files: [file], value: '' }, preventDefault: ()=>{} };
        loadRef(type, fakeEvent);
      }
    });
  });
});

// ── Patch buildRawPrompt to include refs ──────
const _origBuildRaw = buildRawPrompt;
buildRawPrompt = function() {
  let base = _origBuildRaw();
  const refParts = getRefContext();
  if (refParts.length) base += (base ? ', ' : '') + refParts.join(', ');
  return base;
};
