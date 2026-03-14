// ============================================
//  PromptForge — app.js
// ============================================

const state = {
  platform: 'midjourney',
  subject: '',
  negative: '',
  tags: {
    style: null, mood: null, lighting: null,
    camera: null, quality: null, ar: null
  }
};

const PRESETS = {
  fantasy: {
    subject: 'an epic medieval castle on a cliff at sunset, with dragons flying overhead',
    tags: { style: 'concept art', mood: 'dramatic', lighting: 'golden hour', camera: 'wide angle shot', quality: 'masterpiece', ar: '--ar 16:9' }
  },
  portrait: {
    subject: 'a confident woman with silver hair, wearing elegant black attire',
    tags: { style: 'photorealistic', mood: 'cinematic', lighting: 'studio lighting', camera: 'close-up portrait', quality: 'hyperrealistic', ar: '--ar 4:3' }
  },
  scifi: {
    subject: 'a futuristic megacity on a distant planet, with flying vehicles and neon signs',
    tags: { style: 'cyberpunk', mood: 'ethereal', lighting: 'neon lights', camera: 'aerial view', quality: '8k ultra detailed', ar: '--ar 21:9' }
  },
  nature: {
    subject: 'a breathtaking misty forest waterfall at dawn, with rays of light through the trees',
    tags: { style: 'digital art', mood: 'peaceful', lighting: 'soft diffused light', camera: 'wide angle shot', quality: 'award winning photography', ar: '--ar 4:3' }
  },
  abstract: {
    subject: 'an abstract explosion of color and geometry, infinite fractal patterns',
    tags: { style: 'surrealism', mood: 'vibrant and energetic', lighting: 'volumetric fog', camera: null, quality: 'trending on artstation', ar: '--ar 1:1' }
  },
  architecture: {
    subject: 'a minimalist zen temple surrounded by cherry blossom trees in spring',
    tags: { style: 'concept art', mood: 'peaceful', lighting: 'golden hour', camera: 'low angle', quality: 'masterpiece', ar: '--ar 16:9' }
  }
};

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('subject').addEventListener('input', e => {
    state.subject = e.target.value.trim();
    updatePrompt();
  });
  document.getElementById('negative').addEventListener('input', e => {
    state.negative = e.target.value.trim();
    updatePrompt();
  });

  // Tag clicks
  document.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', () => toggleTag(tag));
  });

  // Platform buttons
  document.querySelectorAll('.platform-btn').forEach(btn => {
    btn.addEventListener('click', () => selectPlatform(btn));
  });

  updatePrompt();
});

// ── Tag Toggle ────────────────────────────────
function toggleTag(tag) {
  const cat = tag.dataset.cat;
  const val = tag.dataset.val;

  if (state.tags[cat] === val) {
    // Deselect
    state.tags[cat] = null;
    tag.classList.remove('active');
  } else {
    // Deselect previous in category
    if (state.tags[cat]) {
      const prev = document.querySelector(`.tag[data-cat="${cat}"][data-val="${state.tags[cat]}"]`);
      if (prev) prev.classList.remove('active');
    }
    state.tags[cat] = val;
    tag.classList.add('active');
  }
  updatePrompt();
}

// ── Platform Select ────────────────────────────
function selectPlatform(btn) {
  document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.platform = btn.dataset.platform;
  document.getElementById('platformBadge').textContent = btn.textContent;
  updatePrompt();
}

// ── Build Prompt ───────────────────────────────
function buildPrompt() {
  const parts = [];

  if (state.subject) parts.push(state.subject);

  const orderedCats = ['style', 'mood', 'lighting', 'camera', 'quality'];
  orderedCats.forEach(cat => {
    if (state.tags[cat]) parts.push(state.tags[cat]);
  });

  let prompt = parts.join(', ');

  // Platform-specific additions
  if (state.platform === 'midjourney') {
    if (state.tags.ar) prompt += ' ' + state.tags.ar;
    if (state.negative) prompt += ` --no ${state.negative}`;
    prompt += ' --v 6';
  } else if (state.platform === 'sd') {
    // Negative handled separately in SD
  } else if (state.platform === 'dalle') {
    // DALL-E doesn't use special syntax
  } else if (state.platform === 'flux') {
    if (state.tags.ar) {
      const arMap = { '--ar 1:1': 'square', '--ar 16:9': 'landscape', '--ar 9:16': 'portrait' };
      const arLabel = arMap[state.tags.ar];
      if (arLabel) prompt += `, ${arLabel} format`;
    }
  }

  return prompt;
}

// ── Update UI ──────────────────────────────────
function updatePrompt() {
  const prompt = buildPrompt();
  const display = document.getElementById('promptDisplay');

  if (!prompt.trim()) {
    display.innerHTML = '<span class="prompt-placeholder">Your prompt will appear here as you build it...</span>';
  } else {
    display.textContent = prompt;
  }

  // Char & word count
  document.getElementById('charCount').textContent = prompt.length + ' chars';
  document.getElementById('wordCount').textContent = prompt.split(/\s+/).filter(Boolean).length + ' words';

  // Active tags chips
  updateActiveTags();
}

function updateActiveTags() {
  const container = document.getElementById('activeTags');
  const tagCount = document.getElementById('tagCount');
  const allActive = Object.entries(state.tags).filter(([,v]) => v !== null);

  tagCount.textContent = allActive.length;

  if (allActive.length === 0) {
    container.innerHTML = '<span class="no-tags-msg">Select options from the left panel →</span>';
    return;
  }

  container.innerHTML = allActive.map(([cat, val]) => `
    <span class="active-tag-chip">
      ${val}
      <button onclick="removeTag('${cat}')" title="Remove">×</button>
    </span>
  `).join('');
}

function removeTag(cat) {
  if (state.tags[cat]) {
    const tagEl = document.querySelector(`.tag[data-cat="${cat}"][data-val="${state.tags[cat]}"]`);
    if (tagEl) tagEl.classList.remove('active');
    state.tags[cat] = null;
    updatePrompt();
  }
}

// ── Copy ───────────────────────────────────────
function copyPrompt() {
  const prompt = buildPrompt();
  if (!prompt.trim()) return;

  navigator.clipboard.writeText(prompt).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
      btn.classList.remove('copied');
    }, 2000);
  });
}

// ── Reset ──────────────────────────────────────
function resetAll() {
  state.subject = '';
  state.negative = '';
  Object.keys(state.tags).forEach(k => state.tags[k] = null);

  document.getElementById('subject').value = '';
  document.getElementById('negative').value = '';
  document.querySelectorAll('.tag.active').forEach(t => t.classList.remove('active'));

  updatePrompt();
}

// ── Load Preset ────────────────────────────────
function loadPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;

  // Reset first
  resetAll();

  // Set subject
  state.subject = preset.subject;
  document.getElementById('subject').value = preset.subject;

  // Set tags
  Object.entries(preset.tags).forEach(([cat, val]) => {
    if (val) {
      state.tags[cat] = val;
      const tagEl = document.querySelector(`.tag[data-cat="${cat}"][data-val="${val}"]`);
      if (tagEl) tagEl.classList.add('active');
    }
  });

  updatePrompt();

  // Scroll to builder
  document.getElementById('builder').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
