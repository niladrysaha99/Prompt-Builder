// =============================================
//  MASK CANVAS — mask.js
//  Converted from MaskCanvas.tsx to vanilla JS
// =============================================

const maskState = {
  imageUrl: null,
  imageEl: null,
  lines: [],           // [{ points: [x,y,x,y,...], color, size }]
  isDrawing: false,
  drawing: false,
  mode: 'draw',        // 'draw' | 'pan'
  brushSize: 10,
  brushColor: '#ff3b3b',
  canvasW: 0,
  canvasH: 0,
  geminiKey: '',
  maskPrompt: '',
  // pan support
  panStart: null,
  scrollStart: null,
};

let canvas, ctx, wrapper;

window.addEventListener('DOMContentLoaded', () => {
  canvas  = document.getElementById('mask-canvas');
  ctx     = canvas.getContext('2d');
  wrapper = document.getElementById('canvas-wrapper');

  // Mouse events
  canvas.addEventListener('mousedown',  onMouseDown);
  canvas.addEventListener('mousemove',  onMouseMove);
  canvas.addEventListener('mouseup',    onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);

  // Touch support
  canvas.addEventListener('touchstart',  onTouchStart, { passive: false });
  canvas.addEventListener('touchmove',   onTouchMove,  { passive: false });
  canvas.addEventListener('touchend',    onTouchEnd);

  // Brush cursor follow
  canvas.addEventListener('mousemove', moveBrushCursor);
  canvas.addEventListener('mouseleave', hideBrushCursor);
  canvas.addEventListener('mouseenter', showBrushCursor);

  // Drag & drop on upload zone
  const zone = document.getElementById('upload-zone');
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.style.borderColor = '#10b981'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImageFile(file);
  });
});

// ── Image Loading ─────────────────────────────
function loadImage(event) {
  const file = event.target.files[0];
  if (file) loadImageFile(file);
}

function loadImageFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    maskState.imageEl  = img;
    maskState.imageUrl = url;
    maskState.lines    = [];

    // Fit to max 900px wide
    const maxW = 900;
    let w = img.naturalWidth, h = img.naturalHeight;
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    maskState.canvasW = w;
    maskState.canvasH = h;

    canvas.width  = w;
    canvas.height = h;

    document.getElementById('canvas-empty').style.display   = 'none';
    document.getElementById('canvas-wrapper').style.display = 'flex';
    document.getElementById('canvas-footer').style.display  = 'flex';
    document.getElementById('canvas-info').textContent      = `${img.naturalWidth} × ${img.naturalHeight}px · ${file.name}`;

    redraw();
    updateStrokeCount();
  };
  img.src = url;
}

// ── Redraw ────────────────────────────────────
function redraw() {
  if (!maskState.imageEl) return;
  ctx.clearRect(0, 0, maskState.canvasW, maskState.canvasH);
  ctx.drawImage(maskState.imageEl, 0, 0, maskState.canvasW, maskState.canvasH);

  maskState.lines.forEach(line => {
    if (line.points.length < 2) return;
    ctx.strokeStyle = line.color || '#ff3b3b';
    ctx.lineWidth   = line.size  || 10;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(line.points[0], line.points[1]);
    for (let i = 2; i < line.points.length; i += 2) {
      ctx.lineTo(line.points[i], line.points[i+1]);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  updateCoverage();
}

// ── Mouse Events ──────────────────────────────
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top)  * scaleY
  };
}

function onMouseDown(e) {
  if (!maskState.imageEl) return;
  if (maskState.mode === 'pan') {
    maskState.drawing     = false;
    maskState.panStart    = { x: e.clientX, y: e.clientY };
    maskState.scrollStart = { x: wrapper.scrollLeft, y: wrapper.scrollTop };
    return;
  }
  maskState.drawing = true;
  const { x, y } = getPos(e);
  maskState.lines.push({ points: [x, y], color: maskState.brushColor, size: maskState.brushSize });
}

function onMouseMove(e) {
  if (!maskState.imageEl) return;
  if (maskState.mode === 'pan' && maskState.panStart) {
    wrapper.scrollLeft = maskState.scrollStart.x - (e.clientX - maskState.panStart.x);
    wrapper.scrollTop  = maskState.scrollStart.y - (e.clientY - maskState.panStart.y);
    return;
  }
  if (!maskState.drawing) return;
  const { x, y } = getPos(e);
  const last = maskState.lines[maskState.lines.length - 1];
  last.points.push(x, y);
  redraw();
}

function onMouseUp() {
  maskState.drawing  = false;
  maskState.panStart = null;
  updateStrokeCount();
}

function onMouseLeave() {
  maskState.drawing  = false;
  maskState.panStart = null;
}

// ── Touch Events ──────────────────────────────
function getTouchPos(e) {
  const rect = canvas.getBoundingClientRect();
  const t = e.touches[0];
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
}

function onTouchStart(e) {
  e.preventDefault();
  if (!maskState.imageEl || maskState.mode !== 'draw') return;
  maskState.drawing = true;
  const { x, y } = getTouchPos(e);
  maskState.lines.push({ points: [x, y], color: maskState.brushColor, size: maskState.brushSize });
}

function onTouchMove(e) {
  e.preventDefault();
  if (!maskState.drawing) return;
  const { x, y } = getTouchPos(e);
  const last = maskState.lines[maskState.lines.length - 1];
  last.points.push(x, y);
  redraw();
}

function onTouchEnd() {
  maskState.drawing = false;
  updateStrokeCount();
}

// ── Brush Cursor ──────────────────────────────
function moveBrushCursor(e) {
  if (maskState.mode !== 'draw') return;
  const cursor = document.getElementById('brush-cursor');
  const rect   = canvas.getBoundingClientRect();
  cursor.style.display = 'block';
  cursor.style.left    = (e.clientX - rect.left + wrapper.scrollLeft) + 'px';
  cursor.style.top     = (e.clientY - rect.top  + wrapper.scrollTop)  + 'px';
  const size = maskState.brushSize;
  cursor.style.width   = size + 'px';
  cursor.style.height  = size + 'px';
}
function hideBrushCursor()  { document.getElementById('brush-cursor').style.display = 'none'; }
function showBrushCursor()  { if (maskState.mode === 'draw') document.getElementById('brush-cursor').style.display = 'block'; }

// ── Controls ──────────────────────────────────
function updateBrush() {
  const val = document.getElementById('brush-size').value;
  maskState.brushSize = parseInt(val);
  document.getElementById('brush-size-val').textContent = val + 'px';
  const cursor = document.getElementById('brush-cursor');
  cursor.style.width  = val + 'px';
  cursor.style.height = val + 'px';
}

function setBrushColor(btn) {
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  btn.classList.add('active');
  maskState.brushColor = btn.dataset.color;
}

function setMode(mode) {
  maskState.mode = mode;
  document.getElementById('mode-draw').classList.toggle('active', mode === 'draw');
  document.getElementById('mode-pan').classList.toggle('active',  mode === 'pan');
  wrapper.classList.toggle('pan-mode', mode === 'pan');
  hideBrushCursor();
}

// ── Undo / Clear ──────────────────────────────
function undoLast() {
  if (maskState.lines.length === 0) return;
  maskState.lines.pop();
  redraw();
  updateStrokeCount();
}

function clearMask() {
  maskState.lines = [];
  redraw();
  updateStrokeCount();
}

// ── Stats ─────────────────────────────────────
function updateStrokeCount() {
  document.getElementById('stroke-count').textContent = maskState.lines.length + ' strokes';
}

function updateCoverage() {
  if (!maskState.canvasW || !maskState.canvasH) return;
  try {
    const imgData  = ctx.getImageData(0, 0, maskState.canvasW, maskState.canvasH);
    const original = new ImageData(new Uint8ClampedArray(imgData.data), maskState.canvasW, maskState.canvasH);
    // Approximate coverage by sampling drawn pixels
    let painted = 0;
    const total  = maskState.canvasW * maskState.canvasH;
    const sample = 4;
    for (let i = 0; i < imgData.data.length; i += 4 * sample) {
      const r = imgData.data[i], g = imgData.data[i+1], b = imgData.data[i+2];
      // If pixel looks painted (not natural image color) — simple heuristic
      if (maskState.lines.length > 0) painted = maskState.lines.reduce((acc, l) => acc + Math.floor(l.points.length / 2), 0);
    }
    const pct = maskState.lines.length === 0 ? 0 : Math.min(100, Math.round((painted / total) * maskState.brushSize * 2));
    document.getElementById('mask-coverage').textContent = 'Coverage: ~' + Math.min(pct, 100) + '%';
  } catch(e) { /* cross-origin */ }
}

// ── Export Mask ───────────────────────────────
function exportMask() {
  if (!maskState.imageEl) { alert('Upload an image first!'); return; }

  // Create a pure B&W mask canvas
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width  = maskState.canvasW;
  maskCanvas.height = maskState.canvasH;
  const mCtx = maskCanvas.getContext('2d');

  mCtx.fillStyle = '#000000';
  mCtx.fillRect(0, 0, maskState.canvasW, maskState.canvasH);

  mCtx.strokeStyle = '#ffffff';
  mCtx.lineCap = 'round';
  mCtx.lineJoin = 'round';

  maskState.lines.forEach(line => {
    if (line.points.length < 2) return;
    mCtx.lineWidth = line.size || 10;
    mCtx.beginPath();
    mCtx.moveTo(line.points[0], line.points[1]);
    for (let i = 2; i < line.points.length; i += 2) {
      mCtx.lineTo(line.points[i], line.points[i+1]);
    }
    mCtx.stroke();
  });

  const link = document.createElement('a');
  link.download = 'mask.png';
  link.href = maskCanvas.toDataURL('image/png');
  link.click();
}

// ── Send to Prompt Tab ────────────────────────
function sendMaskToPrompt() {
  document.getElementById('mask-prompt-card').style.display = 'block';
  document.getElementById('mask-prompt-text').focus();
  document.getElementById('mask-prompt-text').scrollIntoView({ behavior: 'smooth' });
}

// ── Generate Inpaint Prompt ───────────────────
async function generateMaskPrompt() {
  const desc = document.getElementById('mask-prompt-text').value.trim();
  if (!desc) { document.getElementById('mask-prompt-text').style.borderColor = '#f87171'; setTimeout(() => document.getElementById('mask-prompt-text').style.borderColor = '', 2000); return; }

  const key = localStorage.getItem('gemini_key') || '';
  if (!key) { alert('Please enter your Gemini API key in the Prompt Builder tab first!'); return; }

  const instruction = `Create a professional AI inpainting prompt for Stable Diffusion or DALL-E inpainting. The user wants to replace the masked area with: "${desc}". Create a detailed, specific prompt that describes exactly what should appear in that region, keeping it photorealistic and seamless with the surrounding image. Return only the prompt text.`;

  const outputCard = document.getElementById('mask-output-card');
  const outputBody = document.getElementById('mask-output-body');
  outputCard.style.display = 'block';
  outputBody.innerHTML = '<span class="thinking-text">✦ Crafting inpaint prompt...</span>';

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contents:[{ parts:[{ text: instruction }] }] }) }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    outputBody.textContent = text;
    maskState.maskPrompt = text;
  } catch(err) {
    outputBody.innerHTML = `<span style="color:#f87171">❌ ${err.message}</span>`;
  }
}

function copyMaskPrompt() {
  if (!maskState.maskPrompt) return;
  navigator.clipboard.writeText(maskState.maskPrompt).then(() => {
    const btn = document.querySelector('#mask-output-card .btn-copy');
    btn.classList.add('copied'); btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy'; }, 2000);
  });
}
