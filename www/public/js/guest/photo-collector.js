/**
 * Photo Collector – Aid page
 * Features: drag-and-drop upload, thumbnail preview, single-select, rename, remove.
 * Rename format: newName(originalName).ext
 * Max 12 images, 5 MB each.
 */

const MAX_PHOTOS = 12;
const MAX_BYTES  = 5 * 1024 * 1024; // 5 MB

const dropzone     = document.getElementById('photoDropzone');
const fileInput    = document.getElementById('photoInput');
const photoGrid    = document.getElementById('photoGrid');
const photoCount   = document.getElementById('photoCount');
const photoActions = document.getElementById('photoActions');
const identifyBtn  = document.getElementById('identifyBtn');
const clearBtn     = document.getElementById('clearBtn');

/**
 * @typedef {{ file: File, url: string, label: string, originalName: string, ext: string, selected: boolean }} PhotoEntry
 * @type {PhotoEntry[]}
 */
let photos = [];

// ─── State helpers ───────────────────────────────────────────────

function updateUI() {
  photoCount.textContent = `${photos.length} / ${MAX_PHOTOS}`;
  photoActions.hidden = photos.length === 0;
  dropzone.style.display = photos.length >= MAX_PHOTOS ? 'none' : '';

  // Button is only active when exactly one photo is selected
  const selected = photos.filter(p => p.selected);
  const hasOne   = selected.length === 1;

  identifyBtn.textContent = hasOne
    ? `Identify "${selected[0].label}"`
    : 'Select a photo to identify';

  identifyBtn.disabled = !hasOne;
}

function getEntry(url) {
  return photos.find(p => p.url === url);
}

// ─── Add photos ──────────────────────────────────────────────────

function addPhotos(files) {
  const remaining = MAX_PHOTOS - photos.length;
  const accepted  = Array.from(files).slice(0, remaining);

  for (const file of accepted) {
    if (!file.type.startsWith('image/')) continue;
    if (file.size > MAX_BYTES) {
      modalAlert(`"${file.name}" exceeds the 5 MB limit and was skipped.`, 'File Too Large', 'error');
      continue;
    }

    const url = URL.createObjectURL(file);
    // Strip extension for the default label
    const dotIdx = file.name.lastIndexOf('.');
    const originalName = dotIdx !== -1 ? file.name.slice(0, dotIdx) : file.name;
    const ext          = dotIdx !== -1 ? file.name.slice(dotIdx)     : '';
    photos.push({ file, url, label: originalName, originalName, ext, selected: false });
    renderThumb(url);
  }

  updateUI();
}

// ─── Render ──────────────────────────────────────────────────────

function renderThumb(url) {
  const entry = getEntry(url);

  const wrap = document.createElement('div');
  wrap.className = 'photo-thumb';
  wrap.dataset.url = url;
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', entry.label);
  wrap.draggable = true;                          // ← make thumbnail draggable

  // Carry the collector URL so the left panel knows which entry to select
  wrap.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/x-collector-url', url);
    e.dataTransfer.effectAllowed = 'copy';
    wrap.classList.add('is-dragging');
  });
  wrap.addEventListener('dragend', () => wrap.classList.remove('is-dragging'));

  // ── Image (click = select / deselect) ──
  const img = document.createElement('img');
  img.src = url;
  img.alt = entry.label;
  img.loading = 'lazy';
  img.title = 'Click to select / deselect';
  img.addEventListener('click', () => toggleSelect(url));

  // ── Selection tick ──
  const tick = document.createElement('span');
  tick.className = 'photo-thumb__tick';
  tick.setAttribute('aria-hidden', 'true');
  tick.innerHTML = '&#10003;';

  // ── Toolbar (send-to-panel + rename + remove) shown on hover ──
  const toolbar = document.createElement('div');
  toolbar.className = 'photo-thumb__toolbar';

  // Send to 75% panel button (top of toolbar — primary action)
  const sendBtn = document.createElement('button');
  sendBtn.className = 'photo-thumb__action photo-thumb__action--send';
  sendBtn.type = 'button';
  sendBtn.setAttribute('aria-label', `Send ${entry.label} to identification panel`);
  sendBtn.title = 'Send to ID panel';
  sendBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="15 3 21 3 21 9"/>
      <path d="M10 14L21 3"/>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    </svg>`;
  sendBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const target = getEntry(url);
    if (target) loadMidPhoto(target.file);
  });

  const renameBtn = document.createElement('button');
  renameBtn.className = 'photo-thumb__action';
  renameBtn.type = 'button';
  renameBtn.setAttribute('aria-label', `Rename ${entry.label}`);
  renameBtn.title = 'Rename';
  renameBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`;
  renameBtn.addEventListener('click', (e) => { e.stopPropagation(); startRename(url, wrap); });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'photo-thumb__action photo-thumb__action--remove';
  removeBtn.type = 'button';
  removeBtn.setAttribute('aria-label', `Remove ${entry.label}`);
  removeBtn.title = 'Remove';
  removeBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
  removeBtn.addEventListener('click', (e) => { e.stopPropagation(); removePhoto(url); });

  toolbar.appendChild(sendBtn);
  toolbar.appendChild(renameBtn);
  toolbar.appendChild(removeBtn);

  // ── Label shown below the image ──
  const labelEl = document.createElement('span');
  labelEl.className = 'photo-thumb__label';
  labelEl.textContent = entry.label;
  labelEl.title = entry.label;

  wrap.appendChild(img);
  wrap.appendChild(tick);
  wrap.appendChild(toolbar);
  wrap.appendChild(labelEl);
  photoGrid.appendChild(wrap);
}

// ─── Select / deselect (single selection) ───────────────────────

function toggleSelect(url) {
  // PC selection is locked while a MID photo is loaded in the 75% panel
  if (midPhoto) return;

  const entry = getEntry(url);
  if (!entry) return;

  if (entry.selected) {
    entry.selected = false;
    const wrap = photoGrid.querySelector(`[data-url="${CSS.escape(url)}"]`);
    if (wrap) wrap.classList.remove('is-selected');
    updateUI();
  } else {
    selectOnly(url);
  }
}

// ─── Inline rename ───────────────────────────────────────────────

function startRename(url, wrap) {
  const entry = getEntry(url);
  if (!entry) return;

  const labelEl = wrap.querySelector('.photo-thumb__label');

  // Build an inline input inside the label slot
  const input = document.createElement('input');
  input.className = 'photo-thumb__rename-input';
  input.type = 'text';
  input.value = entry.label;
  input.maxLength = 64;
  input.setAttribute('aria-label', 'Rename photo');

  labelEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const typed = input.value.trim();
    // Build: typed(originalName).ext  — if user cleared the field, keep original
    const newLabel = typed && typed !== entry.originalName
      ? `${typed}(${entry.originalName})${entry.ext}`
      : `${entry.originalName}${entry.ext}`;

    entry.label = newLabel;

    const newLabelEl = document.createElement('span');
    newLabelEl.className = 'photo-thumb__label';
    newLabelEl.textContent = newLabel;
    newLabelEl.title = newLabel;

    input.replaceWith(newLabelEl);

    // Keep img alt and aria-label in sync
    const img = wrap.querySelector('img');
    if (img) img.alt = newLabel;
    wrap.setAttribute('aria-label', newLabel);
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = entry.originalName; input.blur(); }
  });
}

// ─── Remove ──────────────────────────────────────────────────────

function removePhoto(url) {
  const entry = getEntry(url);
  if (entry) URL.revokeObjectURL(entry.url);

  photos = photos.filter(p => p.url !== url);

  const thumb = photoGrid.querySelector(`[data-url="${CSS.escape(url)}"]`);
  if (thumb) thumb.remove();

  updateUI();
}

function clearAll() {
  photos.forEach(p => URL.revokeObjectURL(p.url));
  photos = [];
  photoGrid.innerHTML = '';
  fileInput.value = '';
  updateUI();
}

// ─── Event wiring ────────────────────────────────────────────────

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) addPhotos(fileInput.files);
  fileInput.value = '';
});

dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));

dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) addPhotos(e.dataTransfer.files);
});

dropzone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

clearBtn.addEventListener('click', clearAll);

identifyBtn.addEventListener('click', () => {
  const selected = photos.filter(p => p.selected);
  if (selected.length !== 1) return;

  const target = selected[0];
  // TODO: send target.file to identification API
  console.log('Identify:', { name: target.label, file: target.file.name });
  modalAlert(
    `Identifying "${target.label}"…\n\nAPI integration is pending — results will appear here once the model is connected.`,
    'Identification Pending',
    'info'
  );
});

// ─── MID – direct upload to the 75% panel ───────────────────────
// MID opens a file picker; the chosen image loads straight into the
// left panel preview without going through the Photo Collector (PC).

const midBtn   = document.getElementById('midBtn');
const midInput = document.getElementById('midInput');

/** @type {{ file: File, url: string } | null} */
let midPhoto = null;

midBtn.addEventListener('click', () => midInput.click());

midInput.addEventListener('change', () => {
  if (!midInput.files.length) return;
  loadMidPhoto(midInput.files[0]);
  midInput.value = '';
});

function loadMidPhoto(file) {
  if (!file.type.startsWith('image/')) return;
  if (file.size > MAX_BYTES) {
    modalAlert(`"${file.name}" exceeds the 5 MB limit.`, 'File Too Large', 'error');
    return;
  }

  // Revoke any previous MID object URL
  if (midPhoto) URL.revokeObjectURL(midPhoto.url);

  midPhoto = { file, url: URL.createObjectURL(file) };

  // Lock the PC — deselect anything currently selected first
  photos.forEach(p => {
    if (p.selected) {
      p.selected = false;
      const w = photoGrid.querySelector(`[data-url="${CSS.escape(p.url)}"]`);
      if (w) w.classList.remove('is-selected');
    }
  });
  photoGrid.classList.add('pc-locked');
  updateUI();

  renderMidPreview();
}

function renderMidPreview() {
  const prompt  = document.getElementById('aidIdPrompt');
  let   preview = document.getElementById('midPreview');

  // Hide the prompt, show the preview
  prompt.hidden = true;

  if (!preview) {
    preview = document.createElement('div');
    preview.id        = 'midPreview';
    preview.className = 'mid-preview';
    preview.setAttribute('aria-label', 'MID photo preview');

    // ── Left: uploaded image ──
    const img = document.createElement('img');
    img.className = 'mid-preview__img';
    img.alt       = midPhoto.file.name;

    // ── Right: MID button + actions ──
    const aside = document.createElement('div');
    aside.className = 'mid-preview__aside';

    // Small MID button (same icon, compact)
    const midCircle = document.createElement('button');
    midCircle.className = 'mid-preview__mid-btn';
    midCircle.type      = 'button';
    midCircle.id        = 'midIdentifyBtn';
    midCircle.setAttribute('aria-label', 'Identify via MID');
    midCircle.title = 'Identify';
    midCircle.innerHTML = `
      <img src="../icons/favicon.png" alt="" aria-hidden="true">
      <span class="mid-preview__mid-label">Identify</span>`;
    midCircle.addEventListener('click', () => {
      if (!midPhoto) return;
      // TODO: send midPhoto.file to identification API
      console.log('MID Identify:', midPhoto.file.name);
      modalAlert(
        `Identifying "${midPhoto.file.name}"…\n\nAPI integration is pending — results will appear here once the model is connected.`,
        'Identification Pending',
        'info'
      );
    });

    // Filename
    const nameEl = document.createElement('span');
    nameEl.className = 'mid-preview__name';

    // Change photo button
    const changeBtn = document.createElement('button');
    changeBtn.className = 'btn btn-secondary mid-preview__change';
    changeBtn.type      = 'button';
    changeBtn.textContent = 'Change photo';
    changeBtn.addEventListener('click', () => midInput.click());

    // Clear button
    const clearMidBtn = document.createElement('button');
    clearMidBtn.className = 'btn mid-preview__clear';
    clearMidBtn.type      = 'button';
    clearMidBtn.textContent = 'Clear';
    clearMidBtn.addEventListener('click', clearMid);

    aside.appendChild(midCircle);
    aside.appendChild(nameEl);
    aside.appendChild(changeBtn);
    aside.appendChild(clearMidBtn);

    preview.appendChild(img);
    preview.appendChild(aside);
    mainBody.appendChild(preview);
  }

  const img    = preview.querySelector('.mid-preview__img');
  const nameEl = preview.querySelector('.mid-preview__name');
  img.src      = midPhoto.url;
  img.alt      = midPhoto.file.name;
  nameEl.textContent = midPhoto.file.name;
  nameEl.title       = midPhoto.file.name;
}

function clearMid() {
  if (midPhoto) { URL.revokeObjectURL(midPhoto.url); midPhoto = null; }

  const preview = document.getElementById('midPreview');
  if (preview) preview.remove();

  // Unlock the PC
  photoGrid.classList.remove('pc-locked');
  updateUI();

  document.getElementById('aidIdPrompt').hidden = false;
}

// ─── Left panel drop target ──────────────────────────────────────

const mainBody = document.getElementById('speciesResults');

// Track enter/leave depth to avoid flicker on child elements
let dragDepth = 0;

mainBody.addEventListener('dragenter', e => {
  e.preventDefault();
  dragDepth++;
  mainBody.classList.add('drop-active');
});

mainBody.addEventListener('dragleave', () => {
  dragDepth--;
  if (dragDepth <= 0) {
    dragDepth = 0;
    mainBody.classList.remove('drop-active');
  }
});

mainBody.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

mainBody.addEventListener('drop', e => {
  e.preventDefault();
  dragDepth = 0;
  mainBody.classList.remove('drop-active');

  // ── Case 1: dragged from the Photo Collector ───────────────────
  const collectorUrl = e.dataTransfer.getData('text/x-collector-url');
  if (collectorUrl) {
    const entry = getEntry(collectorUrl);
    if (entry) {
      // Load the PC photo directly into the MID preview
      loadMidPhoto(entry.file);
    }
    return;
  }

  // ── Case 2: dragged from local filesystem → load directly into MID ──
  if (e.dataTransfer.files.length) {
    const file = e.dataTransfer.files[0]; // MID handles one photo at a time
    loadMidPhoto(file);
  }
});

/** Select one photo by URL, deselecting everything else. */
function selectOnly(url) {
  photos.forEach(p => {
    if (p.selected) {
      p.selected = false;
      const w = photoGrid.querySelector(`[data-url="${CSS.escape(p.url)}"]`);
      if (w) w.classList.remove('is-selected');
    }
  });

  const entry = getEntry(url);
  if (!entry) return;
  entry.selected = true;
  const wrap = photoGrid.querySelector(`[data-url="${CSS.escape(url)}"]`);
  if (wrap) wrap.classList.add('is-selected');

  updateUI();
}

// Init
updateUI();

// ─── Camera capture ───────────────────────────────────────────────
//
// Strategy:
//   1. If the browser supports getUserMedia (modern desktop & mobile),
//      open the live camera modal with a shutter button.
//   2. If getUserMedia is NOT available (e.g. old browser, HTTP on
//      desktop without HTTPS), fall back to the native
//      <input capture="environment"> which hands off to the OS camera.
//
// On Android/iOS in a WebView (Capacitor), getUserMedia works normally
// once camera permission is granted.

const captureBtn   = document.getElementById('captureBtn');
const captureInput = document.getElementById('captureInput');

const cameraModal      = document.getElementById('cameraModal');
const cameraBackdrop   = document.getElementById('cameraBackdrop');
const cameraCloseBtn   = document.getElementById('cameraCloseBtn');
const cameraVideo      = document.getElementById('cameraVideo');
const cameraShutterBtn = document.getElementById('cameraShutterBtn');
const cameraSwitchBtn  = document.getElementById('cameraSwitchBtn');
const cameraCanvas     = document.getElementById('cameraCanvas');
const cameraFlash      = document.getElementById('cameraFlash');
const cameraError      = document.getElementById('cameraError');
const cameraErrorMsg   = document.getElementById('cameraErrorMsg');

/** Currently active MediaStream, or null */
let cameraStream = null;

/** 'user' (front) | 'environment' (back). Start with rear camera. */
let facingMode = 'environment';

/** True while the flash animation is running (blocks double-shutter). */
let shutterLocked = false;

// ── Open / close ──────────────────────────────────────────────────

captureBtn.addEventListener('click', () => {
  // Prefer live camera modal when getUserMedia is supported
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    openCameraModal();
  } else {
    // Fallback: let the OS handle it via the capture attribute
    captureInput.click();
  }
});

// Fallback: native file-input with capture="environment"
captureInput.addEventListener('change', () => {
  if (captureInput.files.length) {
    addPhotos(captureInput.files);
    captureInput.value = '';
  }
});

function openCameraModal() {
  cameraModal.hidden = false;
  document.body.style.overflow = 'hidden';
  cameraError.hidden = true;
  startStream();
}

function closeCameraModal() {
  stopStream();
  cameraModal.hidden = true;
  document.body.style.overflow = '';
}

cameraCloseBtn.addEventListener('click', closeCameraModal);
cameraBackdrop.addEventListener('click', closeCameraModal);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !cameraModal.hidden) closeCameraModal();
});

// ── Stream management ─────────────────────────────────────────────

async function startStream() {
  stopStream(); // clean up any previous stream first

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    cameraVideo.srcObject = cameraStream;
    cameraError.hidden = true;
  } catch (err) {
    // Permission denied or no camera available
    cameraError.hidden = false;
    cameraErrorMsg.textContent = err.name === 'NotAllowedError'
      ? 'Camera access was denied. Please allow camera permission and try again.'
      : err.name === 'NotFoundError'
        ? 'No camera was found on this device.'
        : `Camera error: ${err.message}`;
  }
}

function stopStream() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  cameraVideo.srcObject = null;
}

// ── Switch camera (front ↔ back) ──────────────────────────────────

cameraSwitchBtn.addEventListener('click', () => {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  startStream();
});

// ── Shutter — snap the current frame ─────────────────────────────

cameraShutterBtn.addEventListener('click', () => {
  if (shutterLocked || !cameraStream) return;

  const video = cameraVideo;
  if (video.readyState < 2) return; // video not ready yet

  shutterLocked = true;

  // Flash animation
  cameraFlash.classList.add('flash-active');
  setTimeout(() => cameraFlash.classList.remove('flash-active'), 150);

  // Draw the current frame onto the hidden canvas
  const w = video.videoWidth;
  const h = video.videoHeight;
  cameraCanvas.width  = w;
  cameraCanvas.height = h;

  const ctx = cameraCanvas.getContext('2d');

  // Mirror horizontally if using the front camera (selfie flip)
  if (facingMode === 'user') {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, 0, 0, w, h);

  // Convert canvas to a Blob (JPEG, 0.92 quality) then to a File
  cameraCanvas.toBlob(blob => {
    if (!blob) {
      shutterLocked = false;
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = new File([blob], `capture-${timestamp}.jpg`, { type: 'image/jpeg' });

    addPhotos([file]);        // reuse existing addPhotos()
    closeCameraModal();
    shutterLocked = false;
  }, 'image/jpeg', 0.92);
});
