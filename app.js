/* ============================================================
   ResumeForge — app.js
   Live preview, dynamic entries, templates, local storage, PDF
   ============================================================ */

'use strict';

// ── State ──────────────────────────────────────────────────
const state = {
  template: 'modern',
  personal: {},
  summary: '',
  experience: [],
  education:  [],
  skills:     [],
  projects:   [],
  certs:      [],
};

let zoomLevel = 0.9; // default preview scale

// ── Personal field IDs ─────────────────────────────────────
const PERSONAL_FIELDS = [
  'fullName','jobTitle','email','phone','location',
  'website','linkedin','github',
];

// ── Entry counter helpers (for unique IDs) ─────────────────
let counters = { exp: 0, edu: 0, skill: 0, proj: 0, cert: 0 };

// ── DOM references ─────────────────────────────────────────
const preview      = document.getElementById('resume-preview');
const previewWrap  = document.getElementById('preview-wrapper');
const zoomLevelEl  = document.getElementById('zoom-level');

// ============================================================
// TABS
// ============================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ============================================================
// TEMPLATES
// ============================================================
document.querySelectorAll('.tpl-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tpl-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.template = btn.dataset.template;
    saveState();
    renderPreview();
  });
});

// ============================================================
// ZOOM
// ============================================================
function applyZoom() {
  previewWrap.style.transform = `scale(${zoomLevel})`;
  previewWrap.style.transformOrigin = 'top center';
  previewWrap.style.marginBottom = `-${(1 - zoomLevel) * 297 * 3.78}px`;
  zoomLevelEl.textContent = Math.round(zoomLevel * 100) + '%';
}

document.getElementById('zoom-in').addEventListener('click', () => {
  if (zoomLevel < 1.4) { zoomLevel = Math.round((zoomLevel + 0.1) * 10) / 10; applyZoom(); }
});

document.getElementById('zoom-out').addEventListener('click', () => {
  if (zoomLevel > 0.4) { zoomLevel = Math.round((zoomLevel - 0.1) * 10) / 10; applyZoom(); }
});

applyZoom();

// ============================================================
// PHOTO UPLOAD
// ============================================================
const photoInput       = document.getElementById('photoInput');
const photoUploadArea  = document.getElementById('photo-upload-area');
const photoPlaceholder = document.getElementById('photo-placeholder');
const photoPreviewWrap = document.getElementById('photo-preview-wrap');
const photoPreviewImg  = document.getElementById('photo-preview-img');
const photoRemoveBtn   = document.getElementById('photo-remove-btn');

// Clicking the upload area (placeholder or preview zone) opens file picker
photoUploadArea.addEventListener('click', (e) => {
  if (e.target === photoRemoveBtn) return; // don't re-open picker when removing
  photoInput.click();
});

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('Image is too large. Please choose a file under 5 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    state.personal.photo = dataUrl;
    applyPhotoPreview(dataUrl);
    saveState();
    renderPreview();
  };
  reader.readAsDataURL(file);
  // reset so same file can be re-selected
  photoInput.value = '';
});

photoRemoveBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  state.personal.photo = null;
  applyPhotoPreview(null);
  saveState();
  renderPreview();
});

function applyPhotoPreview(dataUrl) {
  if (dataUrl) {
    photoPreviewImg.src = dataUrl;
    photoPlaceholder.style.display = 'none';
    photoPreviewWrap.style.display = 'flex';
  } else {
    photoPreviewImg.src = '';
    photoPlaceholder.style.display = 'flex';
    photoPreviewWrap.style.display = 'none';
  }
}

// ============================================================
// PERSONAL INFO — live binding
// ============================================================
PERSONAL_FIELDS.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => {
      state.personal[id] = el.value.trim();
      saveState();
      renderPreview();
    });
  }
});

// Summary
document.getElementById('summary').addEventListener('input', function () {
  state.summary = this.value.trim();
  saveState();
  renderPreview();
});

// ============================================================
// DYNAMIC ENTRY: generic factory
// ============================================================
function addEntry(type, data = null) {
  const listEl    = document.getElementById(`${type}-list`);
  const template  = document.getElementById(`tpl-${type}-entry`);
  const clone     = template.content.cloneNode(true);
  const card      = clone.querySelector('.entry-card');
  const idx       = ++counters[type];

  card.querySelector('.entry-idx').textContent = idx;

  // Remove button
  card.querySelector('.remove-btn').addEventListener('click', () => {
    card.remove();
    collectAll();
    saveState();
    renderPreview();
  });

  // Prefill if restoring from saved state
  if (data) {
    Object.entries(data).forEach(([cls, val]) => {
      const el = card.querySelector('.' + cls);
      if (el) el.value = val;
    });
  }

  // Live binding on all inputs/textareas in the card
  card.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => { collectAll(); saveState(); renderPreview(); });
  });

  listEl.appendChild(card);
  collectAll();
  renderPreview();
}

document.getElementById('add-exp').addEventListener('click',   () => addEntry('exp'));
document.getElementById('add-edu').addEventListener('click',   () => addEntry('edu'));
document.getElementById('add-skill').addEventListener('click', () => addEntry('skill'));
document.getElementById('add-proj').addEventListener('click',  () => addEntry('proj'));
document.getElementById('add-cert').addEventListener('click',  () => addEntry('cert'));

// ============================================================
// COLLECT ALL FORM DATA INTO STATE
// ============================================================
function collectAll() {
  // Personal (also captured by individual listeners, but keep in sync)
  PERSONAL_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) state.personal[id] = el.value.trim();
  });
  state.summary = document.getElementById('summary').value.trim();

  // Experience
  state.experience = [...document.querySelectorAll('#exp-list .entry-card')].map(card => ({
    'exp-title':   card.querySelector('.exp-title')?.value.trim()   || '',
    'exp-company': card.querySelector('.exp-company')?.value.trim() || '',
    'exp-loc':     card.querySelector('.exp-loc')?.value.trim()     || '',
    'exp-start':   card.querySelector('.exp-start')?.value.trim()   || '',
    'exp-end':     card.querySelector('.exp-end')?.value.trim()     || '',
    'exp-desc':    card.querySelector('.exp-desc')?.value.trim()    || '',
  }));

  // Education
  state.education = [...document.querySelectorAll('#edu-list .entry-card')].map(card => ({
    'edu-degree': card.querySelector('.edu-degree')?.value.trim() || '',
    'edu-inst':   card.querySelector('.edu-inst')?.value.trim()   || '',
    'edu-loc':    card.querySelector('.edu-loc')?.value.trim()    || '',
    'edu-start':  card.querySelector('.edu-start')?.value.trim()  || '',
    'edu-end':    card.querySelector('.edu-end')?.value.trim()    || '',
    'edu-grade':  card.querySelector('.edu-grade')?.value.trim()  || '',
  }));

  // Skills
  state.skills = [...document.querySelectorAll('#skill-list .entry-card')].map(card => ({
    'skill-cat':   card.querySelector('.skill-cat')?.value.trim()   || '',
    'skill-items': card.querySelector('.skill-items')?.value.trim() || '',
  }));

  // Projects
  state.projects = [...document.querySelectorAll('#proj-list .entry-card')].map(card => ({
    'proj-name': card.querySelector('.proj-name')?.value.trim() || '',
    'proj-tech': card.querySelector('.proj-tech')?.value.trim() || '',
    'proj-url':  card.querySelector('.proj-url')?.value.trim()  || '',
    'proj-date': card.querySelector('.proj-date')?.value.trim() || '',
    'proj-desc': card.querySelector('.proj-desc')?.value.trim() || '',
  }));

  // Certifications
  state.certs = [...document.querySelectorAll('#cert-list .entry-card')].map(card => ({
    'cert-name': card.querySelector('.cert-name')?.value.trim() || '',
    'cert-org':  card.querySelector('.cert-org')?.value.trim()  || '',
    'cert-date': card.querySelector('.cert-date')?.value.trim() || '',
    'cert-url':  card.querySelector('.cert-url')?.value.trim()  || '',
  }));
}

// ============================================================
// HELPERS
// ============================================================
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function hasAny(obj) { return Object.values(obj).some(v => v && v.trim() !== ''); }

function contactItemHTML(icon, text, template) {
  if (!text) return '';
  // For links: strip https:// etc for display
  const display = text.replace(/^https?:\/\//, '');
  return `<span class="r-contact-item">${icon} ${esc(display)}</span>`;
}

// ============================================================
// RENDER PREVIEW
// ============================================================
function renderPreview() {
  const p  = state.personal;
  const tpl = state.template;

  const isEmpty =
    !p.fullName && !p.jobTitle && !state.summary &&
    !state.experience.length && !state.education.length &&
    !state.skills.length && !state.projects.length && !state.certs.length;

  if (isEmpty) {
    preview.className = `resume-paper ${tpl}`;
    preview.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <p>Start filling in your details on the left<br/>and your resume will appear here!</p>
      </div>`;
    return;
  }

  // Build contact row
  const contactItems = [
    contactItemHTML('✉', p.email,    tpl),
    contactItemHTML('📞', p.phone,   tpl),
    contactItemHTML('📍', p.location, tpl),
    contactItemHTML('🔗', p.website,  tpl),
    contactItemHTML('💼', p.linkedin, tpl),
    contactItemHTML('🐙', p.github,   tpl),
  ].filter(Boolean).join('');

  // Section: Summary
  const summaryHTML = state.summary
    ? `<div class="r-section-title">Summary</div>
       <p class="r-summary">${esc(state.summary)}</p>` : '';

  // Section: Experience
  const expHTML = state.experience.length
    ? `<div class="r-section-title">Experience</div>` +
      state.experience.map(e => `
        <div class="r-entry">
          <div class="r-entry-header">
            <div>
              <div class="r-entry-title">${esc(e['exp-title'])}</div>
              <div class="r-entry-subtitle">${esc(e['exp-company'])}${e['exp-loc'] ? ' • ' + esc(e['exp-loc']) : ''}</div>
            </div>
            <div class="r-entry-date">${esc(e['exp-start'])}${e['exp-end'] ? ' – ' + esc(e['exp-end']) : ''}</div>
          </div>
          ${e['exp-desc'] ? `<div class="r-entry-desc">${esc(e['exp-desc'])}</div>` : ''}
        </div>`).join('') : '';

  // Section: Projects
  const projHTML = state.projects.length
    ? `<div class="r-section-title">Projects</div>` +
      state.projects.map(pr => `
        <div class="r-entry">
          <div class="r-entry-header">
            <div>
              <div class="r-entry-title">${esc(pr['proj-name'])}${pr['proj-tech'] ? ` <span style="font-weight:400;font-size:11.5px;color:#9ca3af;">— ${esc(pr['proj-tech'])}</span>` : ''}</div>
              ${pr['proj-url'] ? `<div class="r-entry-subtitle">${esc(pr['proj-url'].replace(/^https?:\/\//, ''))}</div>` : ''}
            </div>
            <div class="r-entry-date">${esc(pr['proj-date'])}</div>
          </div>
          ${pr['proj-desc'] ? `<div class="r-entry-desc">${esc(pr['proj-desc'])}</div>` : ''}
        </div>`).join('') : '';

  // Section: Education
  const eduHTML = state.education.length
    ? `<div class="r-section-title">Education</div>` +
      state.education.map(ed => `
        <div class="r-edu-entry">
          <div class="r-entry-header">
            <div>
              <div class="r-edu-degree">${esc(ed['edu-degree'])}</div>
              <div class="r-edu-inst">${esc(ed['edu-inst'])}${ed['edu-loc'] ? ' • ' + esc(ed['edu-loc']) : ''}</div>
              ${ed['edu-grade'] ? `<div class="r-edu-grade">${esc(ed['edu-grade'])}</div>` : ''}
            </div>
            <div class="r-entry-date">${esc(ed['edu-start'])}${ed['edu-end'] ? ' – ' + esc(ed['edu-end']) : ''}</div>
          </div>
        </div>`).join('') : '';

  // Section: Skills
  const skillChipsFor = (s, template) => {
    const items = s['skill-items'].split(',').map(x => x.trim()).filter(Boolean);
    if (template === 'classic' || template === 'minimal') {
      return `<div class="r-skill-chips">${items.map(i => `<span class="r-chip">${esc(i)}</span>`).join('')}</div>`;
    }
    return `<div class="r-skill-chips">${items.map(i => `<span class="r-chip">${esc(i)}</span>`).join('')}</div>`;
  };

  const skillsHTML = state.skills.length
    ? `<div class="r-section-title">Skills</div>` +
      state.skills.map(s => `
        <div class="r-skill-cat">
          ${s['skill-cat'] ? `<div class="r-skill-cat-name">${esc(s['skill-cat'])}</div>` : ''}
          ${skillChipsFor(s, tpl)}
        </div>`).join('') : '';

  // Section: Certifications
  const certHTML = state.certs.length
    ? `<div class="r-section-title">Certifications</div>` +
      state.certs.map(c => `
        <div class="r-cert">
          <strong>${esc(c['cert-name'])}</strong>
          ${c['cert-org'] ? ` — ${esc(c['cert-org'])}` : ''}
          ${c['cert-date'] ? ` <span style="color:#9ca3af;">(${esc(c['cert-date'])})</span>` : ''}
          ${c['cert-url'] ? `<br/><span style="font-size:11px;color:#9ca3af;">${esc(c['cert-url'].replace(/^https?:\/\//,''))}</span>` : ''}
        </div>`).join('') : '';

  // ── Assemble by template ──────────────────────────────────
  let html = '';

  const photoTag = p.photo
    ? `<img class="r-photo" src="${p.photo}" alt="Profile photo" />`
    : '';

  if (tpl === 'modern') {
    // sidebar: skills + certs + edu
    // main: summary + exp + proj
    const sidebar = [skillsHTML, certHTML, eduHTML].filter(Boolean).join('');
    const main    = [summaryHTML, expHTML, projHTML].filter(Boolean).join('');
    html = `
      <div class="r-header">
        <div class="r-header-inner">
          ${photoTag}
          <div class="r-header-text">
            <div class="r-name">${esc(p.fullName || 'Your Name')}</div>
            ${p.jobTitle ? `<div class="r-jobtitle">${esc(p.jobTitle)}</div>` : ''}
            ${contactItems ? `<div class="r-contact">${contactItems}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="r-body">
        <div class="r-sidebar">${sidebar}</div>
        <div class="r-main">${main}</div>
      </div>`;
  } else {
    // classic and minimal: single-column, all sections in order
    const all = [summaryHTML, expHTML, eduHTML, skillsHTML, projHTML, certHTML].filter(Boolean).join('');
    if (tpl === 'classic') {
      html = `
        <div class="r-header">
          <div class="r-header-inner">
            ${photoTag}
            <div class="r-name">${esc(p.fullName || 'Your Name')}</div>
            ${p.jobTitle ? `<div class="r-jobtitle">${esc(p.jobTitle)}</div>` : ''}
            ${contactItems ? `<div class="r-contact">${contactItems}</div>` : ''}
          </div>
        </div>
        <div class="r-body">
          <div class="r-main">${all}</div>
        </div>`;
    } else { // minimal
      html = `
        <div class="r-header">
          ${photoTag}
          <div>
            <div class="r-name">${esc(p.fullName || 'Your Name')}</div>
            ${p.jobTitle ? `<div class="r-jobtitle">${esc(p.jobTitle)}</div>` : ''}
          </div>
          ${contactItems ? `<div class="r-contact">${contactItems}</div>` : ''}
        </div>
        <div class="r-body">
          <div class="r-main">${all}</div>
        </div>`;
    }
  }

  preview.className = `resume-paper ${tpl}`;
  preview.innerHTML = html;
}

// ============================================================
// LOCAL STORAGE
// ============================================================
const STORAGE_KEY = 'resumeforge_state_v2';

function saveState() {
  try {
    collectAll();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, zoomLevel }));
  } catch(e) { /* silent fail */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);

    // Restore template
    if (saved.template) {
      state.template = saved.template;
      document.querySelectorAll('.tpl-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.template === state.template);
      });
    }

    // Restore zoom
    if (saved.zoomLevel) {
      zoomLevel = saved.zoomLevel;
      applyZoom();
    }

    // Restore personal fields
    if (saved.personal) {
      state.personal = saved.personal;
      PERSONAL_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && saved.personal[id]) el.value = saved.personal[id];
      });
      // Restore photo preview
      if (saved.personal.photo) {
        applyPhotoPreview(saved.personal.photo);
      }
    }

    // Restore summary
    if (saved.summary) {
      state.summary = saved.summary;
      document.getElementById('summary').value = saved.summary;
    }

    // Restore dynamic entries
    const entryMap = {
      experience: { type: 'exp',   fields: ['exp-title','exp-company','exp-loc','exp-start','exp-end','exp-desc'] },
      education:  { type: 'edu',   fields: ['edu-degree','edu-inst','edu-loc','edu-start','edu-end','edu-grade'] },
      skills:     { type: 'skill', fields: ['skill-cat','skill-items'] },
      projects:   { type: 'proj',  fields: ['proj-name','proj-tech','proj-url','proj-date','proj-desc'] },
      certs:      { type: 'cert',  fields: ['cert-name','cert-org','cert-date','cert-url'] },
    };

    Object.entries(entryMap).forEach(([stateKey, { type }]) => {
      if (saved[stateKey]?.length) {
        saved[stateKey].forEach(data => {
          // Convert keys like 'exp-title' → class 'exp-title' (dots → js class name)
          const mapped = {};
          Object.entries(data).forEach(([k, v]) => { mapped[k.replace('-','').includes('-') ? k : k] = v; });
          addEntry(type, data);
        });
      }
    });

    renderPreview();
  } catch(e) { /* silent fail */ }
}

// ============================================================
// CLEAR BUTTON
// ============================================================
document.getElementById('clear-btn').addEventListener('click', () => {
  if (!confirm('Clear all resume data? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

// ============================================================
// PDF DOWNLOAD
// ============================================================
document.getElementById('download-btn').addEventListener('click', async () => {
  const btn = document.getElementById('download-btn');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Generating…';
  btn.disabled = true;

  // Save state
  const previewScroll = document.querySelector('.preview-scroll');
  const savedScrollTop = previewScroll ? previewScroll.scrollTop : 0;
  if (previewScroll) previewScroll.scrollTop = 0;

  // Temporarily remove zoom for accurate rendering
  const savedTransform = previewWrap.style.transform;
  const savedMarginBottom = previewWrap.style.marginBottom;
  previewWrap.style.transform = 'none';
  previewWrap.style.marginBottom = '0px';

  // Allow the DOM to reflow before capturing
  await new Promise(r => setTimeout(r, 50));

  const name = (state.personal.fullName || 'resume').replace(/\s+/g, '_').toLowerCase();

  try {
    // 1. Render the resume element to a canvas at 2x scale
    const canvas = await html2canvas(preview, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowHeight: preview.scrollHeight,
      scrollY: 0
    });

    // 2. Convert canvas to JPEG data URL
    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // 3. Calculate dimensions (correct pixel → mm conversion at 96 DPI)
    const { jsPDF } = window.jspdf;
    const A4_W_MM = 210;
    const A4_H_MM = 297;
    const pxToMm   = (px) => px * 25.4 / 96;

    const cssW = canvas.width  / 2;
    const cssH = canvas.height / 2;

    const imgWidthMm  = Math.min(pxToMm(cssW), A4_W_MM);
    const imgHeightMm = pxToMm(cssH) * (imgWidthMm / pxToMm(cssW));

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const bottomMarginMm = 15;
    const topMarginMm = 15;

    let remainingHeight = imgHeightMm;
    let yOffset = 0;
    let pagesDone = 0;

    while (remainingHeight > 0) {
      if (pagesDone > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'JPEG', 0, yOffset, imgWidthMm, imgHeightMm);
      
      pdf.setFillColor(255, 255, 255);

      if (pagesDone === 0) {
        // Page 1: Only draw bottom margin
        pdf.rect(0, A4_H_MM - bottomMarginMm, A4_W_MM, bottomMarginMm, 'F');
        const consumed = A4_H_MM - bottomMarginMm;
        remainingHeight -= consumed;
        yOffset = topMarginMm - consumed; // Prepare offset for Page 2
      } else {
        // Page 2 onwards: Draw top and bottom margins to hide overlap
        pdf.rect(0, 0, A4_W_MM, topMarginMm, 'F');
        pdf.rect(0, A4_H_MM - bottomMarginMm, A4_W_MM, bottomMarginMm, 'F');
        const consumed = A4_H_MM - topMarginMm - bottomMarginMm;
        remainingHeight -= consumed;
        yOffset -= consumed; // Prepare offset for subsequent pages
      }

      pagesDone++;
    }

    // 4. Try direct download first, fall back to opening in new tab
    const blob    = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    // Create an <a> with download attribute and click it
    const a = document.createElement('a');
    a.href     = blobUrl;
    a.download = `${name}_resume.pdf`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Also open in new tab as fallback (user can save from viewer)
    setTimeout(() => {
      window.open(blobUrl, '_blank');
      // Revoke after viewer has loaded
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    }, 500);

  } catch (e) {
    console.error('PDF Generation Error:', e);
    alert('PDF generation failed. Error: ' + e.message);
  } finally {
    // Restore state
    previewWrap.style.transform = savedTransform;
    previewWrap.style.marginBottom = savedMarginBottom;
    if (previewScroll) previewScroll.scrollTop = savedScrollTop;
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

// ============================================================
// INIT
// ============================================================
loadState();

// If nothing was loaded, render the empty state immediately
if (!state.personal.fullName && !state.summary) {
  renderPreview();
}
