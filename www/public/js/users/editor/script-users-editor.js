/**
 * iSeeGrass — Assessment Editor
 * Word / Excel-style rich-text editor built on execCommand + contentEditable.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════
   State
   ═══════════════════════════════════════════════════════════════════ */

const state = {
  unsaved: false,
  wordCount: 0,
  charCount: 0,
  savedRange: null,           // saved selection before a dialog opens
  currentColor: '#f9f871',    // active highlight / font color
};

/* Seagrass transect table template */
const TRANSECT_HTML = `
<p><strong>Transect Quadrat Data</strong></p>
<p><em>% Seagrass species composition must total 100%</em></p>
<table>
  <thead>
    <tr>
      <th>Quadrat</th><th>Sediment</th><th>Comments</th>
      <th>% Seagrass Coverage</th><th>Canopy Height (cm)</th>
      <th>ZC (%)</th><th>HU (%)</th><th>HO (%)</th>
      <th>% Algae Cover</th><th>% Epi-cover</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>1 (0m)</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><td>2 (5m)</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><td>3 (10m)</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><td>4 (15m)</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><td>5 (20m)</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><td>6 (25m)</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><td>7 (50m)</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><td>8 (75m)</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  </tbody>
</table>`;

/* Templates */
const TEMPLATES = {
  blank: '',
  transect: TRANSECT_HTML,
  species: `
<h2>Species Observation Report</h2>
<p><strong>Site:</strong> &nbsp;&nbsp;&nbsp;&nbsp;<strong>Date:</strong> &nbsp;&nbsp;&nbsp;&nbsp;<strong>Observer:</strong></p>
<hr>
<h3>Observed Species</h3>
<table>
  <thead>
    <tr><th>#</th><th>Species Name</th><th>Confidence (%)</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td></td><td></td><td></td></tr>
    <tr><td>2</td><td></td><td></td><td></td></tr>
    <tr><td>3</td><td></td><td></td><td></td></tr>
  </tbody>
</table>
<h3>Remarks</h3>
<p></p>`,
  health: `
<h2>Seagrass Health Assessment</h2>
<p><strong>Transect ID:</strong> &nbsp;&nbsp;&nbsp;&nbsp;<strong>GPS:</strong> &nbsp;&nbsp;&nbsp;&nbsp;<strong>Depth (m):</strong></p>
<hr>
<h3>Coverage &amp; Condition</h3>
<table>
  <thead>
    <tr><th>Parameter</th><th>Value</th><th>Score (1–5)</th><th>Remarks</th></tr>
  </thead>
  <tbody>
    <tr><td>% Cover</td><td></td><td></td><td></td></tr>
    <tr><td>Canopy Height</td><td></td><td></td><td></td></tr>
    <tr><td>Leaf Density</td><td></td><td></td><td></td></tr>
    <tr><td>Epiphyte Load</td><td></td><td></td><td></td></tr>
    <tr><td>Algae Cover</td><td></td><td></td><td></td></tr>
  </tbody>
</table>
<h3>Overall Health Index</h3>
<p></p>`,
};

/* ═══════════════════════════════════════════════════════════════════
   DOM refs  (populated in init())
   ═══════════════════════════════════════════════════════════════════ */

let canvas, titleInput, unsavedBadge, wordCountEl, charCountEl, cursorPosEl;

/* ═══════════════════════════════════════════════════════════════════
   Utility helpers
   ═══════════════════════════════════════════════════════════════════ */

/** Show a toast notification */
function showToast(msg, type = 'success', duration = 2600) {
  const toast = document.getElementById('editorToast');
  if (!toast) return;
  const icon = toast.querySelector('i');
  const text = toast.querySelector('span');
  toast.className = `editor-toast editor-toast--${type}`;
  icon.className = type === 'success' ? 'ti ti-circle-check' : 'ti ti-alert-circle';
  text.textContent = msg;
  toast.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.hidden = true; }, duration);
}

/** Mark document as unsaved */
function markUnsaved() {
  if (!state.unsaved) {
    state.unsaved = true;
    if (unsavedBadge) unsavedBadge.hidden = false;
  }
}

/** Mark document as saved */
function markSaved() {
  state.unsaved = false;
  if (unsavedBadge) unsavedBadge.hidden = true;
}

/** Update word/char counts in the status bar */
function updateCounts() {
  if (!canvas) return;
  const text = canvas.innerText || '';
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const chars = text.replace(/\n/g, '').length;
  state.wordCount = words;
  state.charCount = chars;
  if (wordCountEl) wordCountEl.textContent = `Words: ${words}`;
  if (charCountEl) charCountEl.textContent = `Chars: ${chars}`;
}

/** Save the current selection range so we can restore it after a dialog */
function saveSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    state.savedRange = sel.getRangeAt(0).cloneRange();
  }
}

/** Restore the previously saved selection */
function restoreSelection() {
  if (!state.savedRange) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(state.savedRange);
  canvas.focus();
}

/** execCommand wrapper (forwards to document) */
function exec(cmd, value = null) {
  canvas.focus();
  document.execCommand(cmd, false, value);
  updateCounts();
  markUnsaved();
  syncToolbarState();
}

/** Reflect current cursor formatting in toolbar toggle states */
function syncToolbarState() {
  const cmds = ['bold', 'italic', 'underline', 'strikeThrough',
                'insertOrderedList', 'insertUnorderedList',
                'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];
  cmds.forEach(cmd => {
    const btn = document.querySelector(`[data-cmd="${cmd}"]`);
    if (btn) btn.classList.toggle('is-active', document.queryCommandState(cmd));
  });
}

/* ═══════════════════════════════════════════════════════════════════
   saveDraft — dispatches via event so editor-api-sync.js handles it
   ═══════════════════════════════════════════════════════════════════ */

function saveDraft() {
  document.dispatchEvent(new CustomEvent('isee:save-requested', { detail: { status: 'draft' } }));
}

/* ── Download current document as an HTML file ───────────────────── */
function downloadDocument(title, body, status) {
  const cleanBody = body.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
  const safeName = (title || 'assessment').replace(/[^a-z0-9_\-]/gi, '_').replace(/_+/g, '_');
  const filename = `${safeName}_${status}.html`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title || 'Assessment'}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; max-width: 900px; margin: 2cm auto; padding: 0 1.5rem; color: #111; font-size: 11pt; line-height: 1.5; }
    h1 { font-size: 1.6rem; color: #1a3a1a; margin-bottom: 1.5rem; border-bottom: 2px solid #4a8c2b; padding-bottom: .5rem; }
    h2 { font-size: 1.2rem; color: #1a3a1a; }
    h3 { font-size: 1rem; color: #2a4a2a; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: .9rem; }
    th, td { border: 1px solid #BFBFBF; padding: .4rem .65rem; text-align: left; }
    th { background: #D9E1F2; font-weight: 700; }
    tr:nth-child(even) td { background: #F2F2F2; }
    a { color: #0563C1; }
    img { max-width: 100%; }
    blockquote { border-left: 3px solid #4a8c2b; margin: .5rem 0; padding: .3rem .9rem; color: #555; font-style: italic; }
    pre { background: #f5f5f5; border: 1px solid #ddd; padding: .75rem 1rem; font-family: monospace; font-size: .85rem; }
    .meta { font-size: .75rem; color: #888; margin-top: 2rem; border-top: 1px solid #ddd; padding-top: .75rem; }
  </style>
</head>
<body>
  <h1>${title || 'Assessment'}</h1>
  ${cleanBody}
  <div class="meta">
    iSeeGrass Assessment &mdash; Status: <strong>${status.replace('-', ' ')}</strong>
    &mdash; Exported: ${new Date().toLocaleString()}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

async function clearDraft() {
  const ok = await modalConfirm(
    'Clear the current assessment? This cannot be undone.',
    'Clear Assessment',
    'Clear'
  );
  if (!ok) return;
  if (titleInput) titleInput.value = '';
  if (canvas)     canvas.innerHTML = '';
  markSaved();
  updateCounts();
  document.dispatchEvent(new CustomEvent('isee:editor-cleared'));
  showToast('Assessment cleared', 'success');
}

/* ── Build the Saved Assessments list in the left sidebar ─────────── */
const STATUS_META = {
  'draft':       { label: 'Draft',       cls: 'badge--draft'    },
  'in_progress': { label: 'In Progress', cls: 'badge--progress' },
  'finalized':   { label: 'Finalized',   cls: 'badge--final'    },
};

/**
 * Render the saved-assessments sidebar.
 * @param {Array} assessments  DB records from editor-api-sync.js
 *   Shape: { id, user_id, title, content, status, created_at, updated_at }
 */
function refreshDocList(assessments, activeId = null) {
  const list      = document.getElementById('docList');
  const deleteAll = document.getElementById('btnDeleteAllAssessments');
  if (!list) return;
  list.innerHTML = '';

  // Ensure we always work with an array
  if (!Array.isArray(assessments)) assessments = [];

  // Show / hide the delete-all button
  if (deleteAll) deleteAll.hidden = assessments.length === 0;

  if (!assessments.length) {
    list.innerHTML = '<p class="doc-empty">No saved assessments yet.</p>';
    return;
  }

  assessments.forEach(doc => {
    const d       = new Date(doc.updated_at || doc.created_at);
    const dateStr = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sm      = STATUS_META[doc.status] || STATUS_META['draft'];

    const item = document.createElement('div');
    item.className = 'doc-item' + (doc.id === activeId ? ' is-selected' : '');
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-label', `Assessment: ${doc.title || 'Untitled'}`);
    item.innerHTML = `
      <i class="ti ti-file-text doc-item__icon"></i>
      <span class="doc-item__info">
        <span class="doc-item__name" title="${doc.title || 'Untitled'}">${doc.title || '<em>Untitled</em>'}</span>
        <span class="doc-item__meta">
          <span class="doc-item__badge ${sm.cls}">${sm.label}</span>
          <span class="doc-item__date">${dateStr} · ${timeStr}</span>
        </span>
      </span>
      <button class="doc-item__delete" title="Delete this assessment"
        aria-label="Delete assessment" type="button">
        <i class="ti ti-trash"></i>
      </button>`;

    // ── Inline rename on .doc-item__name ──────────────────────────
    const nameEl = item.querySelector('.doc-item__name');
    nameEl.style.cursor = 'pointer';
    nameEl.title = 'Click to rename';

    nameEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentTitle = doc.title || '';
      const input = document.createElement('input');
      input.className = 'doc-item__rename-input';
      input.type = 'text';
      input.value = currentTitle;
      input.maxLength = 120;
      input.placeholder = 'Untitled';
      input.setAttribute('aria-label', 'Rename assessment');
      nameEl.replaceWith(input);
      input.focus();
      input.select();

      const commit = () => {
        const newTitle = input.value.trim() || '';
        if (newTitle && newTitle !== currentTitle) {
          document.dispatchEvent(new CustomEvent('isee:rename-assessment', {
            detail: { id: doc.id, newTitle },
          }));
        } else {
          // No change — just re-render to restore the name element
          refreshDocList(assessments);
        }
      };

      input.addEventListener('blur', commit);
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter')  { ev.preventDefault(); input.blur(); }
        if (ev.key === 'Escape') { input.value = currentTitle; input.blur(); }
      });
    });

    /* Load on row click */
    item.addEventListener('click', (e) => {
      if (e.target.closest('.doc-item__delete')) return;
      if (e.target.closest('.doc-item__rename-input') || e.target.classList.contains('doc-item__name')) return;
      document.dispatchEvent(new CustomEvent('isee:load-assessment', {
        detail: { id: doc.id },
        bubbles: true,
      }));
    });

    /* Per-item delete */
    item.querySelector('.doc-item__delete').addEventListener('click', (e) => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('isee:delete-assessment', {
        detail: { id: doc.id, title: doc.title },
        bubbles: true,
      }));
    });

    list.appendChild(item);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Template picker
   ═══════════════════════════════════════════════════════════════════ */

async function applyTemplate(key) {
  if (state.unsaved && canvas.innerHTML.trim() !== '') {
    const ok = await modalConfirm(
      'Loading a template will replace your current content.\nUnsaved changes will be lost.',
      'Load Template',
      'Load Template'
    );
    if (!ok) return;
  }
  canvas.innerHTML = TEMPLATES[key] || '';
  titleInput.value = '';
  document.dispatchEvent(new CustomEvent('isee:editor-cleared'));
  markSaved();
  updateCounts();
  showToast(`Template "${key}" loaded`, 'success');

  document.querySelectorAll('.template-item').forEach(el => {
    el.classList.toggle('is-selected', el.dataset.template === key);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Table dialog
   ═══════════════════════════════════════════════════════════════════ */

let tgpRows = 3, tgpCols = 3;

function openTableDialog() {
  saveSelection();
  const bd = document.getElementById('tableDialogBackdrop');
  if (bd) { bd.hidden = false; buildGridPicker(); }
}

function closeTableDialog() {
  const bd = document.getElementById('tableDialogBackdrop');
  if (bd) bd.hidden = true;
}

function buildGridPicker() {
  const grid = document.getElementById('tgpGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let r = 1; r <= 8; r++) {
    for (let c = 1; c <= 10; c++) {
      const cell = document.createElement('div');
      cell.className = 'tgp-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('mouseover', () => highlightGrid(r, c));
      cell.addEventListener('click', () => { tgpRows = r; tgpCols = c; confirmTableFromGrid(); });
      grid.appendChild(cell);
    }
  }
  highlightGrid(tgpRows, tgpCols);
}

function highlightGrid(rows, cols) {
  tgpRows = rows; tgpCols = cols;
  document.querySelectorAll('.tgp-cell').forEach(cell => {
    cell.classList.toggle('is-hover',
      parseInt(cell.dataset.row) <= rows && parseInt(cell.dataset.col) <= cols);
  });
  const lbl = document.getElementById('tgpSizeLabel');
  if (lbl) lbl.textContent = `${rows} × ${cols}`;
}

function confirmTableFromGrid() {
  insertTable(tgpRows, tgpCols, true);
  closeTableDialog();
}

function insertTableFromInputs() {
  const rows = parseInt(document.getElementById('tableRows').value) || 3;
  const cols = parseInt(document.getElementById('tableCols').value) || 3;
  const hasHeader = document.getElementById('tableHeader').checked;
  insertTable(rows, cols, hasHeader);
  closeTableDialog();
}

function insertTable(rows, cols, hasHeader) {
  restoreSelection();

  let html = '<table>';
  if (hasHeader) {
    html += '<thead><tr>';
    for (let c = 0; c < cols; c++) html += `<th>Header ${c + 1}</th>`;
    html += '</tr></thead>';
  }
  html += '<tbody>';
  const bodyRows = hasHeader ? rows - 1 : rows;
  for (let r = 0; r < Math.max(bodyRows, 1); r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) html += '<td></td>';
    html += '</tr>';
  }
  html += '</tbody></table><p></p>';

  exec('insertHTML', html);
  showToast(`${rows}×${cols} table inserted`, 'success');
}

/* ═══════════════════════════════════════════════════════════════════
   Link dialog
   ═══════════════════════════════════════════════════════════════════ */

function openLinkDialog() {
  saveSelection();
  const bd = document.getElementById('linkDialogBackdrop');
  const urlInput = document.getElementById('linkUrl');
  const textInput = document.getElementById('linkText');
  if (!bd) return;

  // Pre-fill with selected text
  const sel = window.getSelection();
  if (textInput && sel && sel.toString().trim()) {
    textInput.value = sel.toString().trim();
  } else if (textInput) {
    textInput.value = '';
  }
  if (urlInput) urlInput.value = '';
  bd.hidden = false;
  setTimeout(() => urlInput && urlInput.focus(), 50);
}

function closeLinkDialog() {
  const bd = document.getElementById('linkDialogBackdrop');
  if (bd) bd.hidden = true;
}

function insertLink() {
  const url = document.getElementById('linkUrl').value.trim();
  const text = document.getElementById('linkText').value.trim();
  if (!url) { showToast('Please enter a URL', 'error'); return; }
  restoreSelection();

  const href = url.startsWith('http') ? url : `https://${url}`;
  const display = text || href;
  exec('insertHTML', `<a href="${href}" target="_blank" rel="noopener noreferrer">${display}</a>`);
  closeLinkDialog();
  showToast('Link inserted', 'success');
}

/* ═══════════════════════════════════════════════════════════════════
   Image dialog
   ═══════════════════════════════════════════════════════════════════ */

function openImageDialog() {
  saveSelection();
  const bd = document.getElementById('imageDialogBackdrop');
  if (bd) { bd.hidden = false; }
}

function closeImageDialog() {
  const bd = document.getElementById('imageDialogBackdrop');
  if (bd) bd.hidden = true;
}

function insertImageFromUrl() {
  const url = document.getElementById('imageUrl').value.trim();
  const alt = document.getElementById('imageAlt').value.trim() || 'image';
  if (!url) { showToast('Please enter an image URL', 'error'); return; }
  restoreSelection();
  exec('insertHTML', `<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:6px;">`);
  closeImageDialog();
  showToast('Image inserted', 'success');
}

function insertImageFromFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    restoreSelection();
    exec('insertHTML', `<img src="${e.target.result}" alt="${file.name}" style="max-width:100%;border-radius:6px;">`);
    closeImageDialog();
    showToast('Image inserted', 'success');
  };
  reader.readAsDataURL(file);
}

/* ═══════════════════════════════════════════════════════════════════
   Colour picker
   ═══════════════════════════════════════════════════════════════════ */

function applyFontColor(color) {
  state.currentColor = color;
  // Update swatch UI
  document.querySelectorAll('.tb-color-swatch').forEach(el => { el.style.background = color; });
  exec('foreColor', color);
}

/* ═══════════════════════════════════════════════════════════════════
   Print / Export
   ═══════════════════════════════════════════════════════════════════ */

function printDocument() {
  const title     = titleInput ? titleInput.value || 'Assessment' : 'Assessment';
  const body      = canvas ? canvas.innerHTML : '';
  const cleanBody = body.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
  const win   = window.open('', '_blank', 'width=800,height=600');
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2cm; color: #111; }
    table { width:100%; border-collapse: collapse; margin: 1rem 0; font-size:0.85rem; }
    th, td { border: 1px solid #999; padding: 0.35rem 0.6rem; text-align: left; }
    th { background: #e8f4e0; font-weight: 700; }
    h1,h2,h3 { color: #1a4a1a; }
    a { color: #2a7a2a; }
    img { max-width:100%; }
    @media print { body { margin: 1.5cm; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${cleanBody}
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

/* ═══════════════════════════════════════════════════════════════════
   Heading shortcut
   ═══════════════════════════════════════════════════════════════════ */

function applyHeading(tag) {
  if (tag === 'p' || tag === '') {
    exec('formatBlock', 'p');
  } else {
    exec('formatBlock', tag);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Toolbar wire-up
   ═══════════════════════════════════════════════════════════════════ */

function wireToolbar() {
  // data-cmd buttons
  document.querySelectorAll('[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault(); // don't blur canvas
      const cmd = btn.dataset.cmd;
      const val  = btn.dataset.val || null;
      exec(cmd, val);
    });
  });

  // Heading select
  const headingSel = document.getElementById('tbHeading');
  if (headingSel) {
    headingSel.addEventListener('change', () => {
      applyHeading(headingSel.value);
      headingSel.value = '';
    });
  }

  // Font size select
  const sizeSel = document.getElementById('tbFontSize');
  if (sizeSel) {
    sizeSel.addEventListener('change', () => {
      exec('fontSize', sizeSel.value);
      sizeSel.value = '3';
    });
  }

  // Font color input
  const colorInput = document.getElementById('tbColorInput');
  const colorBtn   = document.getElementById('tbColorBtn');
  if (colorInput) {
    colorInput.addEventListener('input', () => applyFontColor(colorInput.value));
    colorInput.addEventListener('change', () => applyFontColor(colorInput.value));
  }
  if (colorBtn) {
    colorBtn.addEventListener('click', e => {
      e.preventDefault();
      saveSelection();
      colorInput && colorInput.click();
    });
  }

  // Table button
  const tableBtn = document.getElementById('tbInsertTable');
  if (tableBtn) tableBtn.addEventListener('click', e => { e.preventDefault(); openTableDialog(); });

  // Link button
  const linkBtn = document.getElementById('tbInsertLink');
  if (linkBtn) linkBtn.addEventListener('click', e => { e.preventDefault(); openLinkDialog(); });

  // Image button
  const imgBtn = document.getElementById('tbInsertImage');
  if (imgBtn) imgBtn.addEventListener('click', e => { e.preventDefault(); openImageDialog(); });

  // HR button
  const hrBtn = document.getElementById('tbInsertHR');
  if (hrBtn) hrBtn.addEventListener('mousedown', e => { e.preventDefault(); exec('insertHorizontalRule'); });

  // Clear format
  const clearFmtBtn = document.getElementById('tbClearFormat');
  if (clearFmtBtn) clearFmtBtn.addEventListener('mousedown', e => { e.preventDefault(); exec('removeFormat'); });

  // Undo / Redo
  const undoBtn = document.getElementById('tbUndo');
  const redoBtn = document.getElementById('tbRedo');
  if (undoBtn) undoBtn.addEventListener('mousedown', e => { e.preventDefault(); exec('undo'); });
  if (redoBtn) redoBtn.addEventListener('mousedown', e => { e.preventDefault(); exec('redo'); });

  // Source toggle
  const srcBtn = document.getElementById('tbSource');
  if (srcBtn) srcBtn.addEventListener('click', toggleSourceView);

  // Help
  const helpBtn = document.getElementById('tbHelp');
  if (helpBtn) helpBtn.addEventListener('click', showHelp);
}

/* ─── Source view toggle ─────────────────────────────────────────── */
let sourceMode = false;

function toggleSourceView() {
  const wrap = document.getElementById('editorCanvasWrap');
  const srcArea = document.getElementById('editorSource');
  const btn = document.getElementById('tbSource');
  if (!wrap || !srcArea) return;

  sourceMode = !sourceMode;
  btn && btn.classList.toggle('is-active', sourceMode);

  if (sourceMode) {
    srcArea.value = canvas.innerHTML;
    wrap.style.display = 'none';
    srcArea.style.display = 'block';
    srcArea.focus();
  } else {
    canvas.innerHTML = srcArea.value;
    srcArea.style.display = 'none';
    wrap.style.display = '';
    canvas.focus();
    updateCounts();
    markUnsaved();
  }
}

/* ─── Help tooltip ─────────────────────────────────────────────────── */
function showHelp() {
  modalAlert(
    'Ctrl+B  — Bold\n' +
    'Ctrl+I  — Italic\n' +
    'Ctrl+U  — Underline\n' +
    'Ctrl+Z  — Undo\n' +
    'Ctrl+Y  — Redo\n' +
    'Ctrl+S  — Save Draft\n' +
    'Ctrl+P  — Print\n\n' +
    'Tab inside a table cell moves to the next cell.',
    'Keyboard Shortcuts',
    'info'
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Canvas events
   ═══════════════════════════════════════════════════════════════════ */

function wireCanvas() {
  // Track input for unsaved state and counts
  canvas.addEventListener('input', () => { markUnsaved(); updateCounts(); });
  canvas.addEventListener('keyup', syncToolbarState);
  canvas.addEventListener('mouseup', syncToolbarState);

  // Keyboard shortcuts
  canvas.addEventListener('keydown', e => {
    // Ctrl+S — save draft
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraft(); return; }
    // Ctrl+P — print
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); printDocument(); return; }

    // Tab inside table — move to next/prev cell
    if (e.key === 'Tab') {
      const td = e.target.closest('td, th');
      if (td) {
        e.preventDefault();
        const cells = Array.from(canvas.querySelectorAll('td, th'));
        const idx = cells.indexOf(td);
        const next = e.shiftKey ? cells[idx - 1] : cells[idx + 1];
        if (next) {
          next.focus();
          // Place caret at end
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(next);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else if (!e.shiftKey) {
          // Tab after last cell — add new row
          const lastRow = td.closest('tr');
          const newRow = lastRow.cloneNode(true);
          newRow.querySelectorAll('td, th').forEach(c => { c.innerHTML = ''; });
          lastRow.parentNode.appendChild(newRow);
          const firstCell = newRow.querySelector('td, th');
          if (firstCell) firstCell.focus();
        }
      }
    }
  });

  // Paste — strip external styles, keep plain structure
  canvas.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/html') ||
                 (e.clipboardData || window.clipboardData).getData('text/plain');
    // Strip Word / Google Docs junk but keep basic HTML
    const clean = sanitizePaste(text);
    exec('insertHTML', clean);
  });
}

function sanitizePaste(html) {
  // If plain text just return it
  if (!html.includes('<')) return html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Remove script/style tags, MSO namespace gunk, inline event handlers
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s*class="[^"]*mso[^"]*"/gi, '')
    .replace(/\s*style="[^"]*mso[^"]*"/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\son\w+="[^"]*"/gi, '');
}

/* ═══════════════════════════════════════════════════════════════════
   Dialog event wiring
   ═══════════════════════════════════════════════════════════════════ */

function wireDialogs() {
  // ── Table dialog ──────────────────────────────────────────────── //
  const tbd = document.getElementById('tableDialogBackdrop');
  document.getElementById('tableDialogClose')?.addEventListener('click', closeTableDialog);
  document.getElementById('tableInsertBtn')?.addEventListener('click', insertTableFromInputs);
  document.getElementById('tableCancelBtn')?.addEventListener('click', closeTableDialog);
  // Close on backdrop click
  tbd?.addEventListener('click', e => { if (e.target === tbd) closeTableDialog(); });

  // ── Link dialog ─────────────────────────────────────────────── //
  const lbd = document.getElementById('linkDialogBackdrop');
  document.getElementById('linkDialogClose')?.addEventListener('click', closeLinkDialog);
  document.getElementById('linkInsertBtn')?.addEventListener('click', insertLink);
  document.getElementById('linkCancelBtn')?.addEventListener('click', closeLinkDialog);
  lbd?.addEventListener('click', e => { if (e.target === lbd) closeLinkDialog(); });
  document.getElementById('linkUrl')?.addEventListener('keydown', e => { if (e.key === 'Enter') insertLink(); });

  // ── Image dialog ────────────────────────────────────────────── //
  const ibd = document.getElementById('imageDialogBackdrop');
  document.getElementById('imageDialogClose')?.addEventListener('click', closeImageDialog);
  document.getElementById('imageInsertBtn')?.addEventListener('click', insertImageFromUrl);
  document.getElementById('imageCancelBtn')?.addEventListener('click', closeImageDialog);
  ibd?.addEventListener('click', e => { if (e.target === ibd) closeImageDialog(); });

  // Image file input
  const imgFileInput = document.getElementById('imageFileInput');
  imgFileInput?.addEventListener('change', () => {
    const file = imgFileInput.files[0];
    if (file) insertImageFromFile(file);
  });

  // Image drop zone
  const dropZone = document.getElementById('imageDropZone');
  dropZone?.addEventListener('click', () => imgFileInput && imgFileInput.click());
  dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'rgba(124,203,77,0.7)'; });
  dropZone?.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
  dropZone?.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) insertImageFromFile(file);
  });

  // Escape key closes any open dialog
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeTableDialog();
      closeLinkDialog();
      closeImageDialog();
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Footer action buttons
   ═══════════════════════════════════════════════════════════════════ */

function wireFooter() {
  document.getElementById('btnBack')?.addEventListener('click', async () => {
    if (state.unsaved) {
      const ok = await modalConfirm(
        'You have unsaved changes.\nLeave without saving?',
        'Unsaved Changes',
        'Leave'
      );
      if (!ok) return;
    }
    window.location.href = '/views/users/dashboard.html';
  });

  document.getElementById('btnClear')?.addEventListener('click', clearDraft);

  document.getElementById('btnPreview')?.addEventListener('click', () => {
    const title     = titleInput.value || 'Assessment Preview';
    const body      = canvas.innerHTML;
    const cleanBody = body.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
    const win   = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 860px; margin: 2rem auto; padding: 0 1.5rem; color: #111; }
    table { width:100%; border-collapse:collapse; margin:1rem 0; font-size:.9rem; }
    th,td { border:1px solid #aaa; padding:.4rem .65rem; text-align:left; }
    th { background:#e4f3d5; font-weight:700; }
    h1,h2,h3 { color:#1a4a1a; }
    img { max-width:100%; border-radius:6px; }
    blockquote { border-left:3px solid #5a9a30; margin:.5rem 0; padding:.3rem .9rem; color:#555; font-style:italic; }
    pre { background:#f5f5f5; border:1px solid #ddd; border-radius:6px; padding:.75rem 1rem; font-family:monospace; }
    a { color:#2a7a2a; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${cleanBody}
  <hr style="margin-top:2rem">
  <p style="font-size:.78rem;color:#888;">iSeeGrass Assessment — Preview</p>
</body>
</html>`);
    win.document.close();
  });

  document.getElementById('btnTransect')?.addEventListener('click', () => {
    restoreSelection();
    exec('insertHTML', TRANSECT_HTML);
    showToast('Transect table inserted', 'success');
  });

  // Save buttons dispatch events — editor-api-sync.js handles them
  document.getElementById('btnSaveDraft')?.addEventListener('click', () =>
    document.dispatchEvent(new CustomEvent('isee:save-requested', { detail: { status: 'draft' } }))
  );

  document.getElementById('btnInProgress')?.addEventListener('click', () =>
    document.dispatchEvent(new CustomEvent('isee:save-requested', { detail: { status: 'in-progress' } }))
  );

  document.getElementById('btnFinalize')?.addEventListener('click', () => {
    if (!titleInput?.value.trim()) {
      showToast('Please enter a title before finalizing', 'error');
      titleInput?.focus();
      return;
    }
    document.dispatchEvent(new CustomEvent('isee:save-requested', { detail: { status: 'final' } }));
  });

  document.getElementById('btnPrint')?.addEventListener('click', printDocument);

  // ── Import button ──────────────────────────────────────────────── //
  const importInput = document.getElementById('importFileInput');
  document.getElementById('btnImport')?.addEventListener('click', () => importInput?.click());

  importInput?.addEventListener('change', () => {
    const file = importInput.files[0];
    if (!file) return;
    importInput.value = '';   // reset so same file can be re-imported

    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    if (ext === 'html' || ext === 'htm') {
      reader.onload = e => {
        const parser  = new DOMParser();
        const doc     = parser.parseFromString(e.target.result, 'text/html');
        const bodyHTML = doc.body ? doc.body.innerHTML : e.target.result;
        if (canvas) canvas.innerHTML = sanitizePaste(bodyHTML);
        const t = doc.title || file.name.replace(/\.[^.]+$/, '');
        if (titleInput && !titleInput.value.trim()) titleInput.value = t;
        markUnsaved(); updateCounts();
        showToast(`Imported: ${file.name}`, 'success');
      };
      reader.readAsText(file);
    } else if (ext === 'docx' || ext === 'xlsx') {
      // Without a server we can't decode binary Office formats,
      // so inform the user to save/export as HTML first.
      showToast('Please save the file as HTML (.html) first, then import.', 'error', 5000);
    } else {
      // Try reading as plain text
      reader.onload = e => {
        const escaped = e.target.result
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
        if (canvas) canvas.innerHTML = `<p>${escaped}</p>`;
        if (titleInput && !titleInput.value.trim())
          titleInput.value = file.name.replace(/\.[^.]+$/, '');
        markUnsaved(); updateCounts();
        showToast(`Imported: ${file.name}`, 'success');
      };
      reader.readAsText(file);
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Template picker wiring
   ═══════════════════════════════════════════════════════════════════ */

function wireTemplates() {
  document.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', () => applyTemplate(item.dataset.template));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyTemplate(item.dataset.template); }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Title field
   ═══════════════════════════════════════════════════════════════════ */

function wireTitle() {
  titleInput?.addEventListener('input', markUnsaved);
}

/* ═══════════════════════════════════════════════════════════════════
   Auto-save (every 60 s) — calls saveDraft() which dispatches the event
   ═══════════════════════════════════════════════════════════════════ */

function startAutoSave() {
  setInterval(() => {
    if (state.unsaved) {
      saveDraft();
      showToast('Auto-saved', 'success', 1800);
    }
  }, 60_000);
}

/* ═══════════════════════════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════════════════════════ */

function init() {
  canvas       = document.getElementById('editorCanvas');
  titleInput   = document.getElementById('editorTitle');
  unsavedBadge = document.getElementById('unsavedBadge');
  wordCountEl  = document.getElementById('sbWords');
  charCountEl  = document.getElementById('sbChars');
  cursorPosEl  = document.getElementById('sbCursor');

  if (!canvas) return; // editor not on this page

  // Make canvas editable
  canvas.contentEditable = 'true';
  canvas.spellcheck = true;

  // Wire everything
  wireToolbar();
  wireCanvas();
  wireDialogs();
  wireFooter();
  wireTemplates();
  wireTitle();

  // editor-api-sync.js handles loading from DB and rendering the sidebar.
  // Wire delete-all button — event handled by editor-api-sync.js
  document.getElementById('btnDeleteAllAssessments')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('isee:delete-all-assessments'));
  });

  startAutoSave();
  updateCounts();
  syncToolbarState();
}

document.addEventListener('DOMContentLoaded', init);
