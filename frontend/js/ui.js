// Reusable UI helpers: toast, modal forms, confirm box, formatting
const $ = s => document.querySelector(s);

const money = v => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v || 0));
const dt = v => v ? String(v).replace('T', ' ') : '—';

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  $('#toast').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function badge(status) {
  const map = { occupied: 'green', paid: 'green', parked: 'blue', vacant: 'blue', pending: 'amber',
    maintenance: 'amber', overdue: 'red', exited: 'gray', admin: 'red', manager: 'blue', staff: 'gray' };
  return `<span class="badge ${map[status] || 'gray'}">${esc(status)}</span>`;
}

const modal = $('#modal');
function closeModal() { modal.classList.add('hidden'); modal.innerHTML = ''; }
modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function fieldHTML(f, value) {
  const v = value ?? '';
  let input;
  if (f.type === 'select') {
    const opts = (f.nullable ? [{ value: '', label: '— None —' }] : [{ value: '', label: 'Select…' }]).concat(f.options);
    input = `<select class="input" name="${f.name}" id="f_${f.name}">${opts.map(o =>
      `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  } else {
    input = `<input class="input" name="${f.name}" id="f_${f.name}" type="${f.type || 'text'}" value="${esc(v)}"
      ${f.type === 'number' ? 'step="any"' : ''} maxlength="${f.maxlength || 120}" autocomplete="off">`;
  }
  return `<div class="field"><label for="f_${f.name}">${esc(f.label)}${f.required ? ' *' : ''}</label>${input}</div>`;
}

// Opens a form in a modal. onSubmit(data) may throw; the message is shown inside the form.
function openForm({ title, fields, values = {}, submitText = 'Save', onSubmit }) {
  modal.innerHTML = `<div class="modal-box">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="x" data-close aria-label="Close">&times;</button></div>
    <form id="mf" novalidate>${fields.map(f => fieldHTML(f, values[f.name])).join('')}
      <div class="form-error" id="mfErr"></div>
      <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button>
      <button class="btn" type="submit">${esc(submitText)}</button></div></form></div>`;
  modal.classList.remove('hidden');
  const form = $('#mf'), errBox = $('#mfErr');
  const first = form.querySelector('input,select'); if (first) first.focus();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errBox.textContent = '';
    const data = {};
    for (const f of fields) {
      let raw = form.elements[f.name].value;
      if (f.type !== 'password') raw = raw.trim();
      if (raw === '') {
        if (f.required) { errBox.textContent = `${f.label} is required`; return; }
        if (f.nullable) data[f.name] = null;
        continue;
      }
      if (f.type === 'number' || f.numeric) {
        raw = Number(raw);
        if (Number.isNaN(raw)) { errBox.textContent = `${f.label} must be a number`; return; }
      }
      data[f.name] = raw;
    }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try { await onSubmit(data); closeModal(); }
    catch (ex) { errBox.textContent = ex.message; btn.disabled = false; }
  });
}

function confirmBox(message, okText = 'Delete') {
  return new Promise(resolve => {
    modal.innerHTML = `<div class="modal-box"><div class="modal-head"><h3>Please confirm</h3></div>
      <p>${esc(message)}</p><div class="modal-actions">
      <button class="btn ghost" id="cNo">Cancel</button><button class="btn danger" id="cYes">${esc(okText)}</button></div></div>`;
    modal.classList.remove('hidden');
    $('#cNo').onclick = () => { closeModal(); resolve(false); };
    $('#cYes').onclick = () => { closeModal(); resolve(true); };
  });
}
