/**
 * Identify page – Users
 *
 * Replicates the guest Aid page behaviour:
 *   • Photo Collector (PC) — drag-and-drop / browse, up to 20 images, 5 MB each
 *   • Single-select thumbnail → Identify Species button activates
 *   • Inline rename (format: newName(originalName).ext)
 *   • Direct-upload panel (left 75%) — bypasses the PC
 *   • Drag from PC thumbnail → left panel
 *   • Camera modal (getUserMedia with front/back switch + shutter)
 *   • Fallback to native <input capture="environment"> when no getUserMedia
 *
 * Offline queueing:
 *   When there is no network connection, identification requests are stored in
 *   IndexedDB (via identify-queue.js) and retried automatically when the
 *   device comes back online. History entries show a "Queued" badge while
 *   pending and are updated to "Done" or "Error" after the retry.
 */

'use strict';

import { identifyImage, findCatalogMatch } from '../../api/identify.api.js';
import { drain, OfflineQueuedError } from '../../utils/identify-queue.js';
import { saveCollectorPhoto, updateCollectorPhotoLabel, removeCollectorPhoto, clearCollectorPhotos, restoreCollectorPhotos } from '../../utils/photo-collector-store.js';

function getCollectorUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('isee_user'));
    return u?.id ?? null;
  } catch { return null; }
}

// ─── Constants ───────────────────────────────────────────────────

const MAX_PHOTOS = 12;
const MAX_BYTES  = 5 * 1024 * 1024; // 5 MB

// ─── DOM refs ────────────────────────────────────────────────────

const dropzone     = document.getElementById('photoDropzone');
const fileInput    = document.getElementById('photoInput');
const photoGrid    = document.getElementById('photoGrid');
const photoCount   = document.getElementById('photoCount');
const photoActions = document.getElementById('photoActions');
const identifyBtn  = document.getElementById('identifyBtn');
const clearBtn     = document.getElementById('clearBtn');
const mainBody     = document.getElementById('speciesResults');

// Direct-upload (left panel)
const directUploadBtn   = document.getElementById('directUploadBtn');
const directUploadInput = document.getElementById('directUploadInput');

// ID title input
const idTitleInput = document.getElementById('idTitleInput');

// Camera
const captureBtn    = document.getElementById('captureBtn');
const captureInput  = document.getElementById('captureInput');

const cameraModal    = document.getElementById('cameraModal');
const cameraBackdrop = document.getElementById('cameraBackdrop');
const cameraCloseBtn = document.getElementById('cameraCloseBtn');
const cameraVideo    = document.getElementById('cameraVideo');
const cameraShutterBtn = document.getElementById('cameraShutterBtn');
const cameraSwitchBtn  = document.getElementById('cameraSwitchBtn');
const cameraCanvas   = document.getElementById('cameraCanvas');
const cameraFlash    = document.getElementById('cameraFlash');
const cameraError    = document.getElementById('cameraError');
const cameraErrorMsg = document.getElementById('cameraErrorMsg');

// ─── Photo Collector state ────────────────────────────────────────

/**
 * @typedef {{ file: File, url: string, label: string, originalName: string, ext: string, selected: boolean }} PhotoEntry
 * @type {PhotoEntry[]}
 */
let photos = [];

// ─── UI helpers ──────────────────────────────────────────────────

function updateUI() {
  photoCount.textContent = `${photos.length} / ${MAX_PHOTOS}`;
  photoActions.hidden    = photos.length === 0;
  dropzone.style.display = photos.length >= MAX_PHOTOS ? 'none' : '';

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

// ─── Add photos to the collector ─────────────────────────────────

function addPhotos(files) {
  const remaining = MAX_PHOTOS - photos.length;
  const accepted  = Array.from(files).slice(0, remaining);

  for (const file of accepted) {
    if (!file.type.startsWith('image/')) continue;
    if (file.size > MAX_BYTES) {
      modalAlert(`"${file.name}" exceeds the 5 MB limit and was skipped.`, 'File Too Large', 'error');
      continue;
    }

    const url      = URL.createObjectURL(file);
    const dotIdx   = file.name.lastIndexOf('.');
    const origName = dotIdx !== -1 ? file.name.slice(0, dotIdx) : file.name;
    const ext      = dotIdx !== -1 ? file.name.slice(dotIdx)     : '';

    const entry = { uuid: crypto.randomUUID(), file, url, label: origName, originalName: origName, ext, selected: false };
    photos.push(entry);
    saveCollectorPhoto({
      uuid:         entry.uuid,
      userId:       getCollectorUserId(),
      imageBlob:    entry.file,
      mimeType:     entry.file.type,
      originalName: entry.originalName,
      label:        entry.label,
      ext:          entry.ext,
      addedAt:      Date.now(),
    }).catch(() => {}); // non-blocking, fire and forget
    renderThumb(url);
  }

  updateUI();
}

// ─── Render a thumbnail ───────────────────────────────────────────

function renderThumb(url) {
  const entry = getEntry(url);

  const wrap = document.createElement('div');
  wrap.className   = 'photo-thumb';
  wrap.dataset.url = url;
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', entry.label);
  wrap.draggable = true;

  // Drag from PC → left panel
  wrap.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/x-collector-url', url);
    e.dataTransfer.effectAllowed = 'copy';
    wrap.classList.add('is-dragging');
  });
  wrap.addEventListener('dragend', () => wrap.classList.remove('is-dragging'));

  // Image — click to select / deselect
  const img   = document.createElement('img');
  img.src     = url;
  img.alt     = entry.label;
  img.loading = 'lazy';
  img.title   = 'Click to select / deselect';
  img.addEventListener('click', () => toggleSelect(url));

  // Selection tick
  const tick = document.createElement('span');
  tick.className = 'photo-thumb__tick';
  tick.setAttribute('aria-hidden', 'true');
  tick.innerHTML = '&#10003;';

  // Hover toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'photo-thumb__toolbar';

  // Send to left panel
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
  sendBtn.addEventListener('click', e => {
    e.stopPropagation();
    const target = getEntry(url);
    if (target) loadDirectPhoto(target.file);
  });

  // Rename
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
  renameBtn.addEventListener('click', e => { e.stopPropagation(); startRename(url, wrap); });

  // Remove
  const removeBtn = document.createElement('button');
  removeBtn.className = 'photo-thumb__action photo-thumb__action--remove';
  removeBtn.type = 'button';
  removeBtn.setAttribute('aria-label', `Remove ${entry.label}`);
  removeBtn.title = 'Remove';
  removeBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
  removeBtn.addEventListener('click', e => { e.stopPropagation(); removePhoto(url); });

  toolbar.appendChild(sendBtn);
  toolbar.appendChild(renameBtn);
  toolbar.appendChild(removeBtn);

  // Label
  const labelEl = document.createElement('span');
  labelEl.className   = 'photo-thumb__label';
  labelEl.textContent = entry.label;
  labelEl.title       = entry.label;

  wrap.appendChild(img);
  wrap.appendChild(tick);
  wrap.appendChild(toolbar);
  wrap.appendChild(labelEl);
  photoGrid.appendChild(wrap);
}

// ─── Select / deselect (single selection) ────────────────────────

function toggleSelect(url) {
  // PC selection locked while a direct photo is in the left panel
  if (directPhoto) return;

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

// ─── Inline rename ────────────────────────────────────────────────

function startRename(url, wrap) {
  const entry = getEntry(url);
  if (!entry) return;

  const labelEl = wrap.querySelector('.photo-thumb__label');

  const input    = document.createElement('input');
  input.className = 'photo-thumb__rename-input';
  input.type      = 'text';
  input.value     = entry.label;
  input.maxLength = 64;
  input.setAttribute('aria-label', 'Rename photo');

  labelEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const typed = input.value.trim();
    const newLabel = typed && typed !== entry.originalName
      ? `${typed}(${entry.originalName})${entry.ext}`
      : `${entry.originalName}${entry.ext}`;

    entry.label = newLabel;

    if (entry.uuid) {
      updateCollectorPhotoLabel(entry.uuid, newLabel).catch(() => {});
    }

    const newLabelEl = document.createElement('span');
    newLabelEl.className   = 'photo-thumb__label';
    newLabelEl.textContent = newLabel;
    newLabelEl.title       = newLabel;

    input.replaceWith(newLabelEl);

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

// ─── Remove / clear ───────────────────────────────────────────────

function removePhoto(url) {
  const entry = getEntry(url);
  if (entry) {
    URL.revokeObjectURL(entry.url);
    if (entry.uuid) {
      removeCollectorPhoto(entry.uuid).catch(() => {});
    }
  }
  photos = photos.filter(p => p.url !== url);
  const thumb = photoGrid.querySelector(`[data-url="${CSS.escape(url)}"]`);
  if (thumb) thumb.remove();
  updateUI();
}

function clearAll() {
  clearCollectorPhotos(getCollectorUserId()).catch(() => {});
  photos.forEach(p => URL.revokeObjectURL(p.url));
  photos = [];
  photoGrid.innerHTML = '';
  fileInput.value = '';
  updateUI();
}

// ─── Event wiring – collector ─────────────────────────────────────

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

identifyBtn.addEventListener('click', async () => {
  const selected = photos.filter(p => p.selected);
  if (selected.length !== 1) return;
  const target = selected[0];

  identifyBtn.disabled = true;
  identifyBtn.textContent = 'Identifying…';

  // Load the selected photo into the direct-upload preview panel first
  loadDirectPhoto(target.file);

  // Push a pending entry to history right away
  const histId   = crypto.randomUUID();
  const thumbUrl = URL.createObjectURL(target.file);
  const idTitle  = idTitleInput?.value.trim() || null;
  if (window.identifyHistory) {
    window.identifyHistory.push({
      id:         histId,
      timestamp:  Date.now(),
      fileName:   target.file.name,
      thumbUrl,
      topSpecies: '',
      confidence: 0,
      title:      idTitle,
      status:     'pending',
      errorMsg:   null,
    });
  }

  try {
    const result = await identifyImage(target.file, idTitle, null, false, histId);
    renderIdentifyResults(result);
    if (window.identifyHistory) {
      window.identifyHistory.update(histId, {
        dbId:       result.identification_id ?? null,
        topSpecies: result.top_result  || '—',
        confidence: result.top_confidence ?? (result.scores?.[0]?.confidence ?? 0),
        title:      result.title ?? idTitle,
        status:     'done',
      });
    }
    clearCollectorPhotos(getCollectorUserId()).catch(() => {});
  } catch (err) {
    if (err instanceof OfflineQueuedError) {
      // Offline — job is queued, update history entry to show queued state
      showQueuedToast(target.file.name);
      if (window.identifyHistory) {
        window.identifyHistory.update(histId, {
          status:   'queued',
          errorMsg: null,
        });
      }
    } else {
      modalAlert(err.message || 'Identification failed. Please try again.', 'Error', 'error');
      if (window.identifyHistory) {
        window.identifyHistory.update(histId, {
          status:   'error',
          errorMsg: err.message || 'Identification failed',
        });
      }
    }
  } finally {
    identifyBtn.disabled = false;
    updateUI();
  }
});

// ─── Direct-upload – left panel ───────────────────────────────────
// User clicks the big circle button → file picker → image loads into
// the left panel preview without going through the collector.

/** @type {{ file: File, url: string } | null} */
let directPhoto = null;

directUploadBtn.addEventListener('click', () => directUploadInput.click());

directUploadInput.addEventListener('change', () => {
  if (!directUploadInput.files.length) return;
  loadDirectPhoto(directUploadInput.files[0]);
  directUploadInput.value = '';
});

function loadDirectPhoto(file) {
  if (!file.type.startsWith('image/')) return;
  if (file.size > MAX_BYTES) {
    modalAlert(`"${file.name}" exceeds the 5 MB limit.`, 'File Too Large', 'error');
    return;
  }

  // Revoke previous object URL
  if (directPhoto) URL.revokeObjectURL(directPhoto.url);
  directPhoto = { file, url: URL.createObjectURL(file) };

  // Lock the collector — deselect anything currently selected
  photos.forEach(p => {
    if (p.selected) {
      p.selected = false;
      const w = photoGrid.querySelector(`[data-url="${CSS.escape(p.url)}"]`);
      if (w) w.classList.remove('is-selected');
    }
  });
  photoGrid.classList.add('pc-locked');
  updateUI();

  renderDirectPreview();
}

function renderDirectPreview() {
  const prompt  = document.getElementById('uploadPrompt');
  let   preview = document.getElementById('directPreview');

  prompt.hidden = true;

  if (!preview) {
    preview = document.createElement('div');
    preview.id        = 'directPreview';
    preview.className = 'direct-preview';
    preview.setAttribute('aria-label', 'Direct upload preview');

    // Left: full image
    const img     = document.createElement('img');
    img.className = 'direct-preview__img';
    img.alt       = '';

    // Right: compact re-upload button + actions
    const aside     = document.createElement('div');
    aside.className = 'direct-preview__aside';

    // Small circle button (same icon as the big one)
    const reuploadBtn     = document.createElement('button');
    reuploadBtn.className = 'direct-preview__reupload-btn';
    reuploadBtn.type      = 'button';
    reuploadBtn.id        = 'directIdentifyBtn';
    reuploadBtn.setAttribute('aria-label', 'Identify this photo');
    reuploadBtn.title = 'Identify';
    reuploadBtn.innerHTML = `
      <img src="../../public/icons/favicon.png" alt="" aria-hidden="true">
      <span class="direct-preview__reupload-label">Identify</span>`;
    reuploadBtn.addEventListener('click', async () => {
      if (!directPhoto) return;
      reuploadBtn.disabled = true;
      const origLabel = reuploadBtn.querySelector('.direct-preview__reupload-label');
      if (origLabel) origLabel.textContent = 'Identifying…';

      // Push a pending entry to history right away
      const histId   = crypto.randomUUID();
      const thumbUrl = URL.createObjectURL(directPhoto.file);
      const idTitle  = idTitleInput?.value.trim() || null;
      if (window.identifyHistory) {
        window.identifyHistory.push({
          id:         histId,
          timestamp:  Date.now(),
          fileName:   directPhoto.file.name,
          thumbUrl,
          topSpecies: '',
          confidence: 0,
          title:      idTitle,
          status:     'pending',
          errorMsg:   null,
        });
      }

      try {
        const result = await identifyImage(directPhoto.file, idTitle, null, false, histId);
        renderIdentifyResults(result);
        if (window.identifyHistory) {
          window.identifyHistory.update(histId, {
            dbId:       result.identification_id ?? null,
            topSpecies: result.top_result  || '—',
            confidence: result.top_confidence ?? (result.scores?.[0]?.confidence ?? 0),
            title:      result.title ?? idTitle,
            status:     'done',
          });
        }
      } catch (err) {
        if (err instanceof OfflineQueuedError) {
          showQueuedToast(directPhoto.file.name);
          if (window.identifyHistory) {
            window.identifyHistory.update(histId, {
              status:   'queued',
              errorMsg: null,
            });
          }
        } else {
          modalAlert(err.message || 'Identification failed. Please try again.', 'Error', 'error');
          if (window.identifyHistory) {
            window.identifyHistory.update(histId, {
              status:   'error',
              errorMsg: err.message || 'Identification failed',
            });
          }
        }
      } finally {
        reuploadBtn.disabled = false;
        if (origLabel) origLabel.textContent = 'Identify';
      }
    });

    // Filename
    const nameEl     = document.createElement('span');
    nameEl.className = 'direct-preview__name';

    // Change photo
    const changeBtn     = document.createElement('button');
    changeBtn.className = 'btn btn-secondary direct-preview__change';
    changeBtn.type      = 'button';
    changeBtn.textContent = 'Change photo';
    changeBtn.addEventListener('click', () => directUploadInput.click());

    // Clear
    const clearDirectBtn     = document.createElement('button');
    clearDirectBtn.className = 'btn direct-preview__clear';
    clearDirectBtn.type      = 'button';
    clearDirectBtn.textContent = 'Clear';
    clearDirectBtn.addEventListener('click', clearDirect);

    aside.appendChild(reuploadBtn);
    aside.appendChild(nameEl);
    aside.appendChild(changeBtn);
    aside.appendChild(clearDirectBtn);

    preview.appendChild(img);
    preview.appendChild(aside);
    mainBody.appendChild(preview);

    // ── Seagrass upload reminder ──────────────────────────────────────────
    // Shown once when an image is first loaded; cleared with the preview.
    // Injected into the card footer, above the caution message.
    const footer = document.querySelector('.identify-main__footer');
    const caution = footer?.querySelector('.id-caution');
    const reminder = document.createElement('div');
    reminder.id        = 'uploadReminder';
    reminder.className = 'upload-reminder';
    reminder.setAttribute('role', 'note');
    reminder.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>For best results, upload a clear underwater photo of <strong>seagrass only</strong>.
      Avoid non-plant objects, murky water, or poor lighting.</span>`;
    if (footer && caution) {
      footer.insertBefore(reminder, caution);
    } else if (footer) {
      footer.prepend(reminder);
    } else {
      mainBody.appendChild(reminder);
    }
  }

  const img    = preview.querySelector('.direct-preview__img');
  const nameEl = preview.querySelector('.direct-preview__name');
  img.src            = directPhoto.url;
  img.alt            = directPhoto.file.name;
  nameEl.textContent = directPhoto.file.name;
  nameEl.title       = directPhoto.file.name;
}

function clearDirect() {
  if (directPhoto) { URL.revokeObjectURL(directPhoto.url); directPhoto = null; }

  const preview = document.getElementById('directPreview');
  if (preview) preview.remove();

  // Clear any identification results
  const resultsPanel = document.getElementById('identifyResultsPanel');
  if (resultsPanel) resultsPanel.remove();

  // Clear any catalog match card
  document.getElementById('speciesCatalogCard')?.remove();

  // Clear upload reminder
  document.getElementById('uploadReminder')?.remove();

  photoGrid.classList.remove('pc-locked');
  updateUI();

  document.getElementById('uploadPrompt').hidden = false;
  if (idTitleInput) idTitleInput.value = '';
}

// ─── Left panel – drop target ─────────────────────────────────────

let dragDepth = 0;

mainBody.addEventListener('dragenter', e => {
  e.preventDefault();
  dragDepth++;
  mainBody.classList.add('drop-active');
});
mainBody.addEventListener('dragleave', () => {
  dragDepth--;
  if (dragDepth <= 0) { dragDepth = 0; mainBody.classList.remove('drop-active'); }
});
mainBody.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
mainBody.addEventListener('drop', e => {
  e.preventDefault();
  dragDepth = 0;
  mainBody.classList.remove('drop-active');

  // Case 1: dragged from the Photo Collector thumbnail
  const collectorUrl = e.dataTransfer.getData('text/x-collector-url');
  if (collectorUrl) {
    const entry = getEntry(collectorUrl);
    if (entry) loadDirectPhoto(entry.file);
    return;
  }

  // Case 2: dragged directly from the filesystem
  if (e.dataTransfer.files.length) {
    loadDirectPhoto(e.dataTransfer.files[0]);
  }
});

// ─── Camera modal ─────────────────────────────────────────────────
//
// Preference: getUserMedia live modal with shutter + switch.
// Fallback:   native <input capture="environment"> for old browsers.

/** @type {MediaStream | null} */
let cameraStream  = null;

/** 'user' | 'environment' */
let facingMode    = 'environment';

/** Locks the shutter during flash animation */
let shutterLocked = false;

captureBtn.addEventListener('click', () => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    openCameraModal();
  } else {
    captureInput.click();
  }
});

// Fallback input
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

async function startStream() {
  stopStream();
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    cameraVideo.srcObject = cameraStream;
    cameraError.hidden = true;
  } catch (err) {
    cameraError.hidden = false;
    cameraErrorMsg.textContent =
      err.name === 'NotAllowedError'
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

cameraSwitchBtn.addEventListener('click', () => {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  startStream();
});

cameraShutterBtn.addEventListener('click', () => {
  if (shutterLocked || !cameraStream) return;

  const video = cameraVideo;
  if (video.readyState < 2) return;

  shutterLocked = true;

  // Flash
  cameraFlash.classList.add('flash-active');
  setTimeout(() => cameraFlash.classList.remove('flash-active'), 150);

  // Snap frame to canvas
  const w = video.videoWidth;
  const h = video.videoHeight;
  cameraCanvas.width  = w;
  cameraCanvas.height = h;

  const ctx = cameraCanvas.getContext('2d');

  // Mirror front-camera selfie
  if (facingMode === 'user') {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, 0, 0, w, h);

  cameraCanvas.toBlob(blob => {
    if (!blob) { shutterLocked = false; return; }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = new File([blob], `capture-${timestamp}.jpg`, { type: 'image/jpeg' });

    addPhotos([file]);
    closeCameraModal();
    shutterLocked = false;
  }, 'image/jpeg', 0.92);
});

// ─── Offline / online toast helpers ───────────────────────────────────────────

/**
 * Show a small non-blocking toast at the bottom of the screen.
 * Auto-dismisses after `duration` ms.
 *
 * Robust for Android WebView: the element is appended and the fade-in
 * transition is triggered inside a double-rAF so the browser always
 * has a chance to paint before it tries to animate.
 */
function showToastMessage(message, duration = 3500, colour = 'rgba(18,18,18,0.92)') {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.style.cssText = [
    'position:fixed',
    'bottom:1.75rem',
    'left:50%',
    'transform:translateX(-50%)',
    `background:${colour}`,
    'color:#ffffff',
    'padding:0.65rem 1.4rem',
    'border-radius:999px',
    'font-size:0.9rem',
    'font-weight:600',
    'z-index:2147483647',
    'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
    'pointer-events:none',
    'white-space:nowrap',
    'opacity:0',
    'transition:opacity 220ms ease',
    'max-width:90vw',
    'text-align:center',
  ].join(';');
  el.textContent = message;

  // Append after body is guaranteed to exist
  const target = document.body || document.documentElement;
  target.appendChild(el);

  // Double-rAF: first frame registers the element, second frame starts transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });
  });

  setTimeout(() => {
    el.style.opacity = '0';
    // Fallback remove in case transitionend never fires (some WebView versions)
    const fallback = setTimeout(() => el.remove(), 400);
    el.addEventListener('transitionend', () => {
      clearTimeout(fallback);
      el.remove();
    }, { once: true });
  }, duration);
}

function showQueuedToast(fileName) {
  showToastMessage(
    `📶 No connection — "${fileName}" queued for identification`,
    4500,
    'rgba(40,60,30,0.95)',
  );
}

function showOnlineToast() {
  showToastMessage('✓ Back online — retrying queued identifications…', 3000, 'rgba(30,80,30,0.92)');
}

// ─── Init ─────────────────────────────────────────────────────────

(async () => {
  const userId = getCollectorUserId();
  if (userId !== null) {
    try {
      const stored = await restoreCollectorPhotos(userId);
      for (const record of stored) {
        const file = new File([record.imageBlob], record.originalName, { type: record.mimeType });
        const url  = URL.createObjectURL(file);
        photos.push({
          uuid:         record.uuid,
          file,
          url,
          label:        record.label,
          originalName: record.originalName,
          ext:          record.ext,
          selected:     false,
        });
        renderThumb(url);
      }
    } catch {
      // IDB unavailable — start empty, non-fatal
    }
  }
  updateUI();
})();

// ─── Offline queue drain ───────────────────────────────────────────────────────

/**
 * Called by drain() after each queued job completes (success or permanent fail).
 * Updates the matching history entry in the UI if it exists in memory,
 * then always reloads the server-backed history so the result is visible
 * even when the entry came from a previous session (no in-memory match).
 *
 * @param {string}      histId  The UUID used in the history UI
 * @param {object|null} result  API response on success, null on failure
 * @param {Error|null}  err     Error on failure, null on success
 * @param {File|null}   file    The reconstructed image File from IDB
 */
function onDrainResult(histId, result, err, file) {
  // Update the in-memory entry if it's still on screen (same-session queue)
  if (window.identifyHistory) {
    if (result) {
      window.identifyHistory.update(histId, {
        dbId:       result.identification_id ?? null,
        topSpecies: result.top_result  || '—',
        confidence: result.top_confidence ?? (result.scores?.[0]?.confidence ?? 0),
        title:      result.title ?? null,
        status:     'done',
      });
    } else {
      window.identifyHistory.update(histId, {
        status:   'error',
        errorMsg: err?.message || 'Identification failed after retry.',
      });
    }

    // Always reload from the server so cross-session queued results appear
    // without a manual page refresh. _loadHistory() is a no-op when the
    // component is not connected, so this is safe to call unconditionally.
    window.identifyHistory._loadHistory().catch(() => {});
  }

  // Load the image into the 75% panel and render the result below it.
  // Only when the identification succeeded and a file is available.
  if (result && file) {
    // loadDirectPhoto shows the image in the preview panel
    loadDirectPhoto(file);
    // renderIdentifyResults inserts the result panel after mainBody
    renderIdentifyResults(result);
    // Catalog lookup deferred so the result panel paints first
    setTimeout(() => fetchAndRenderCatalogMatch(result.top_result || ''), 0);
  }
}

/**
 * Try to drain any queued identification jobs.
 * No-ops silently when offline or when the queue is empty.
 */
function tryDrainQueue() {
  if (!navigator.onLine) return;
  drain(
    // Pass histId through so that if identifyImage re-queues on a mid-drain
    // disconnect, it reuses the same UUID instead of creating an orphan entry.
    (file, title, modelType, histId) => identifyImage(file, title, modelType, false, histId),
    onDrainResult,
  ).catch(() => {
    // Drain failures are non-fatal — will retry on next online event
  });
}

// ─── Online event wiring — robust for Android WebView + Capacitor ────────────
//
// Android WebView does not reliably fire 'online' on window. We cover all paths:
//   1. window 'online'   — standard browsers and some WebView versions
//   2. document 'online' — some Android WebView versions fire here instead
//   3. Capacitor Network plugin — the most reliable source on Android native;
//      fires 'networkStatusChange' even when the DOM events don't
//
// A guard flag prevents the toast + drain from running multiple times if
// several of these fire in quick succession on the same reconnect.

let _drainScheduled = false;

function handleOnline() {
  if (_drainScheduled) return;
  _drainScheduled = true;

  // Small delay: Android may fire 'online' a moment before TCP is usable.
  // 800 ms is enough for the network stack to stabilise.
  setTimeout(() => {
    _drainScheduled = false;
    if (!navigator.onLine) return;  // changed its mind — still offline
    showOnlineToast();
    tryDrainQueue();
  }, 800);
}

// Path 1 — window (standard)
window.addEventListener('online', handleOnline);

// Path 2 — document (some Android WebView versions)
document.addEventListener('online', handleOnline);

// Path 3 — Capacitor Network plugin (most reliable on Android)
// The plugin is available when running inside a Capacitor app.
// We register this listener once the DOM is ready; it's a no-op on web.
(function wireCapacitorNetwork() {
  function tryRegister() {
    try {
      const Network = window.Capacitor?.Plugins?.Network;
      if (!Network) return;
      Network.addListener('networkStatusChange', (status) => {
        if (status.connected) handleOnline();
      });
    } catch (_) {
      // Capacitor not present or plugin unavailable — fall back to DOM events
    }
  }

  // Try immediately (plugin may already be ready), then again after DOMContentLoaded
  tryRegister();
  if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
    document.addEventListener('DOMContentLoaded', tryRegister, { once: true });
  }
})();

// Drain any leftover jobs from previous sessions on page load
tryDrainQueue();

// ── Retry queued jobs on demand (from sidebar retry button) ───────────────────
document.addEventListener('isee:retry-queue', () => {
  if (!navigator.onLine) {
    showToastMessage('Still offline — will retry when connection returns.', 3000, 'rgba(60,60,60,0.92)');
    return;
  }
  // Show toast and drain immediately (bypass the 800 ms delay used for
  // auto-reconnect — user explicitly requested a retry, so act now).
  showOnlineToast();
  tryDrainQueue();
});

// ── Reload a history result into the left panel ───────────────────────────────
/**
 * Called when the user clicks a "done" history card.
 * Loads the thumbnail (if available) into the direct-preview panel and
 * re-renders the result panel from the stored entry data.
 * Shows only the Clear button — no "Identify" or "Change photo" buttons
 * since this is a historical record, not a new identification.
 *
 * @param {{ entry: object }} detail
 */
document.addEventListener('isee:load-hist-result', (e) => {
  const entry = e.detail?.entry;
  if (!entry || entry.status !== 'done') return;

  // ── Clear any existing direct preview state ───────────────────────────────
  if (directPhoto) { URL.revokeObjectURL(directPhoto.url); directPhoto = null; }
  document.getElementById('directPreview')?.remove();
  document.getElementById('identifyResultsPanel')?.remove();
  document.getElementById('speciesCatalogCard')?.remove();
  document.getElementById('uploadReminder')?.remove();
  photoGrid.classList.remove('pc-locked');
  if (idTitleInput) idTitleInput.value = entry.title || '';

  // ── Build a read-only preview panel ──────────────────────────────────────
  const prompt = document.getElementById('uploadPrompt');
  if (prompt) prompt.hidden = true;

  const preview = document.createElement('div');
  preview.id        = 'directPreview';
  preview.className = 'direct-preview direct-preview--history';
  preview.setAttribute('aria-label', 'Historical identification result');

  const img = document.createElement('img');
  img.className = 'direct-preview__img';
  if (entry.thumbUrl) {
    img.src = entry.thumbUrl;
    img.alt = entry.fileName;
  } else {
    // No thumbnail for DB-only records — show a placeholder
    img.src = '../../public/icons/favicon.png';
    img.alt = 'No preview available';
    img.style.opacity = '0.3';
    img.style.objectFit = 'contain';
    img.style.padding = '1rem';
  }

  const aside = document.createElement('div');
  aside.className = 'direct-preview__aside';

  const nameEl = document.createElement('span');
  nameEl.className   = 'direct-preview__name';
  nameEl.textContent = entry.fileName;
  nameEl.title       = entry.fileName;

  const histLabel = document.createElement('span');
  histLabel.className   = 'direct-preview__hist-label';
  histLabel.textContent = `#${entry._seq} · ${entry.title || 'Untitled'}`;
  histLabel.style.cssText = 'font-size:.75rem;color:rgba(255,255,255,.45);display:block;margin-top:.2rem';

  // Clear only — no Identify or Change buttons for history records
  const clearBtn = document.createElement('button');
  clearBtn.className   = 'btn direct-preview__clear';
  clearBtn.type        = 'button';
  clearBtn.textContent = 'Clear';
  clearBtn.addEventListener('click', () => {
    preview.remove();
    document.getElementById('identifyResultsPanel')?.remove();
    document.getElementById('speciesCatalogCard')?.remove();
    document.getElementById('uploadReminder')?.remove();
    if (prompt) prompt.hidden = false;
    if (idTitleInput) idTitleInput.value = '';
    updateUI();
  });

  aside.appendChild(nameEl);
  aside.appendChild(histLabel);
  aside.appendChild(clearBtn);
  preview.appendChild(img);
  preview.appendChild(aside);
  mainBody.appendChild(preview);

  // ── Re-render the result panel from stored entry data ─────────────────────
  // Reconstruct a minimal result object from what's stored in the history entry.
  const syntheticResult = {
    identification_id : entry.dbId ?? null,
    model_type        : null,
    top_result        : entry.topSpecies || 'Unknown',
    top_confidence    : entry.confidence ?? 0,
    scores            : entry.topSpecies
      ? [{ label: entry.topSpecies, confidence: entry.confidence ?? 0 }]
      : [],
    title             : entry.title,
  };
  renderIdentifyResults(syntheticResult);
  setTimeout(() => fetchAndRenderCatalogMatch(syntheticResult.top_result), 0);

  updateUI();
});

// ─── Render identification results ────────────────────────────────────────────

/** Labels that indicate a background / no-seagrass result. */
const BACKGROUND_RE = /background/i;

/**
 * Confidence threshold below which a result is flagged as uncertain.
 * Any top_confidence below this value shows a low-confidence warning
 * instead of (or alongside) the normal result panel.
 * 60% is a reasonable floor for CREYNet v0.02 field conditions.
 */
const LOW_CONFIDENCE_THRESHOLD = 60;

/**
 * True when loaded on the admin identify page — enables confidence bar graphs.
 * Set by script-admin-identify.js before this module executes.
 */
const IS_ADMIN = !!window.ISEE_ADMIN_IDENTIFY;

/**
 * Cap a confidence value so it never displays as 100%.
 * @param {number} pct
 * @returns {number}
 */
function capConfidence(pct) {
  return pct >= 100 ? 98.0 : pct;
}

/**
 * Render the CNN identification result below the image panel.
 *
 * Rules:
 *  - If top result is a background class: show "No seagrass found" panel
 *    (except on admin, where the raw result is always shown).
 *  - If top confidence < LOW_CONFIDENCE_THRESHOLD: show a low-confidence
 *    warning banner. Admin always sees the full result alongside the warning.
 *    Users see the warning but the result is still displayed so they can
 *    cross-check with the catalog.
 *  - Background entries are filtered from the scores list for users;
 *    admin sees all entries.
 *  - Confidence bar graphs are only rendered for admin.
 *  - Confidence is capped at 98% for display.
 *
 * @param {object} result  API response data object
 */
function renderIdentifyResults(result) {
  let container = document.getElementById('identifyResultsPanel');
  if (!container) {
    container = document.createElement('div');
    container.id = 'identifyResultsPanel';
    container.style.cssText = 'margin-top:1.5rem;padding:1rem 1.25rem;background:rgba(30,60,20,.55);border:1px solid rgba(124,203,77,.25);border-radius:10px;';
    mainBody.after(container);
  }

  const topResult    = result.top_result || 'Unknown';
  const isBackground = BACKGROUND_RE.test(topResult);
  const rawTopConf   = result.scores?.[0]?.confidence ?? result.top_confidence ?? 0;
  const isLowConf    = rawTopConf < LOW_CONFIDENCE_THRESHOLD;

  // ── No seagrass (users only) ───────────────────────────────────────────────
  if (isBackground && !IS_ADMIN) {
    container.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.25rem 0">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;color:#e0b060" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <div style="font-size:.72rem;color:#9fe997;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.2rem">Result</div>
          <div style="font-size:1.1rem;font-weight:700;color:#e0b060">Unable to identify</div>
          <div style="font-size:.82rem;color:#aaa;margin-top:.3rem;line-height:1.5">
            CREYNet could not identify a seagrass species from this image.<br>
            The photo may be unclear, contain multiple subjects, or fall outside the model's training range. Try a clearer, focused photo.
          </div>
        </div>
      </div>
      ${result.identification_id ? `<div style="margin-top:.75rem;padding-top:.6rem;border-top:1px solid rgba(255,255,255,.08);font-size:.75rem;color:#555">Saved to history · ID #${result.identification_id}</div>` : ''}`;
    return;
  }

  // ── Low-confidence warning banner (shown for both users and admin) ──────────
  // Built as a string fragment inserted at the top of the result panel when
  // top confidence is below LOW_CONFIDENCE_THRESHOLD.
  const lowConfBanner = isLowConf ? `
    <div style="display:flex;align-items:flex-start;gap:.65rem;padding:.55rem .75rem;margin-bottom:.85rem;background:rgba(224,176,96,.12);border:1px solid rgba(224,176,96,.35);border-radius:7px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="#e0b060" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div style="font-size:.80rem;color:#e0b060;line-height:1.5">
        <strong>Low confidence result (${rawTopConf.toFixed(1)}%).</strong>
        The model is uncertain — cross-check with the
        <a href="../catalog/index.html" style="color:#9fe997;text-decoration:underline">species catalog</a>
        or a field guide before recording this identification.
      </div>
    </div>` : '';

  // ── Seagrass detected (or admin showing background) ────────────────────────
  const topConf = capConfidence(rawTopConf);

  // Admin sees all scores with bars; users see species-only scores, no bars
  const allScores  = result.scores || [];
  const filteredScores = IS_ADMIN
    ? allScores
    : allScores.filter(s => !BACKGROUND_RE.test(s.label));

  const scoresHtml = filteredScores.map(s => {
    const pct   = capConfidence(Math.min(100, Math.max(0, parseFloat(s.confidence) || 0)));
    const label = IS_ADMIN && BACKGROUND_RE.test(s.label)
      ? `${s.label} (non-seagrass)`
      : s.label;

    if (IS_ADMIN) {
      // With bar graph — colour reflects confidence tier
      return `<div style="margin-bottom:.6rem">
        <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:.2rem">
          <span style="color:#d6f0b8">${label}</span>
          <span style="color:#9fe997;font-weight:600">${pct.toFixed(1)}%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${pct >= LOW_CONFIDENCE_THRESHOLD ? '#7ccb4d' : pct >= 30 ? '#f0c040' : '#e05252'};border-radius:3px;transition:width .5s"></div>
        </div>
      </div>`;
    }

    // Without bar graph — percentage only
    return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:.82rem;padding:.25rem 0;border-bottom:1px solid rgba(255,255,255,.06)">
      <span style="color:#d6f0b8">${label}</span>
      <span style="color:#9fe997;font-weight:600;flex-shrink:0;margin-left:.75rem">${pct.toFixed(1)}%</span>
    </div>`;
  }).join('');

  const displayTopResult = IS_ADMIN && isBackground
    ? `⚠ ${topResult} (no seagrass)`
    : topResult;

  // Confidence label colour: green ≥ threshold, amber < threshold
  const confColour = isLowConf ? '#e0b060' : '#aaa';

  container.innerHTML = `
    ${lowConfBanner}
    <div style="margin-bottom:.75rem;padding-bottom:.75rem;border-bottom:1px solid rgba(255,255,255,.1)">
      <div style="font-size:.72rem;color:#9fe997;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.25rem">Result</div>
      <div style="font-size:1.2rem;font-weight:700;color:#d6f0b8">${displayTopResult}</div>
      <div style="font-size:.85rem;color:${confColour};margin-top:.2rem">Confidence: ${topConf.toFixed(1)}%</div>
    </div>
    ${IS_ADMIN && scoresHtml ? `<div>
      <div style="font-size:.72rem;color:#9fe997;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem">All Scores</div>
      ${scoresHtml}
    </div>` : ''}
    ${result.identification_id ? `<div style="margin-top:.6rem;font-size:.75rem;color:#555">Saved to history · ID #${result.identification_id}</div>` : ''}`;

  // Defer the catalog lookup so the result panel paints first
  setTimeout(() => fetchAndRenderCatalogMatch(topResult), 0);
}

// ─── Species catalog match card ────────────────────────────────────────────────

/**
 * After a successful identification, look up the top result's scientific
 * name in the public seagrass catalog. If a match is found, render a
 * "Species Info" card below the results panel. Silently no-ops for
 * background/no-seagrass results or when no catalog match exists.
 *
 * @param {string} topResult  The model's top species name (or background class)
 */
async function fetchAndRenderCatalogMatch(topResult) {
  // Clear any previous card first (handles re-identification)
  document.getElementById('speciesCatalogCard')?.remove();

  // Skip empty / background / no-seagrass results
  if (!topResult || BACKGROUND_RE.test(topResult)) return;

  let entry;
  try {
    entry = await findCatalogMatch(topResult);
  } catch {
    return;
  }
  if (!entry) return;

  // Build the card with the DOM API — never innerHTML for data values
  const card = document.createElement('div');
  card.id        = 'speciesCatalogCard';
  card.className = 'species-catalog-card';

  const header = document.createElement('div');
  header.className = 'species-catalog-card__header';

  const title = document.createElement('h4');
  title.className   = 'species-catalog-card__title';
  title.textContent = 'Species Info';

  const sciName = document.createElement('span');
  sciName.className   = 'species-catalog-card__sci-name';
  sciName.textContent = entry.scientific_name || '';

  header.appendChild(title);
  header.appendChild(sciName);

  const body = document.createElement('div');
  body.className = 'species-catalog-card__body';

  /** Append a label/value row only when the value is non-empty. */
  const addRow = (label, value) => {
    if (!value) return;
    const row = document.createElement('div');
    row.className = 'species-catalog-card__row';

    const lab = document.createElement('span');
    lab.className   = 'species-catalog-card__label';
    lab.textContent = label;

    const val = document.createElement('span');
    val.className   = 'species-catalog-card__value';
    val.textContent = value;

    row.appendChild(lab);
    row.appendChild(val);
    body.appendChild(row);
  };

  addRow('Common Name',  entry.common_name);
  addRow('Family',       entry.family);
  addRow('Habitat',      entry.habitat);
  addRow('Depth',         entry.depth);
  addRow('Leaf Shape',   entry.leaf_shape);
  addRow('Leaf Length',  entry.leaf_length);
  addRow('IUCN Status',  entry.iucn_status);

  // ph_regions is a JSON column — normalise to a comma-joined string
  if (entry.ph_regions) {
    let regions = '';
    try {
      const parsed = typeof entry.ph_regions === 'string'
        ? JSON.parse(entry.ph_regions)
        : entry.ph_regions;
      regions = Array.isArray(parsed) ? parsed.join(', ') : String(parsed ?? '');
    } catch {
      regions = String(entry.ph_regions ?? '');
    }
    addRow('PH Regions', regions);
  }

  card.appendChild(header);
  card.appendChild(body);

  // Description — last item in the body, truncated to 200 chars
  if (entry.description) {
    const desc = document.createElement('p');
    desc.className = 'species-catalog-card__desc';
    const text = entry.description;
    desc.textContent = text.length > 200 ? `${text.slice(0, 200)}…` : text;
    body.appendChild(desc);
  }

  // Guard against a concurrent identification appending a card first
  document.getElementById('speciesCatalogCard')?.remove();

  // Insert as a sibling after the results panel
  const resultsPanel = document.getElementById('identifyResultsPanel');
  if (resultsPanel) {
    resultsPanel.insertAdjacentElement('afterend', card);
  }
}
