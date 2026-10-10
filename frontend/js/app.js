// Main app: sidebar, hash routing and all pages.
Auth.require();
const me = Auth.user();
const view = $('#view');

// ---------- CRUD page definitions (add a new module = add one block here) ----------
// Note: column render() functions must return already-escaped HTML (use esc()).
const byId = (list, id, key = 'name') => { const x = list.find(i => i.id === id); return x ? x[key] : null; };
const opts = (list, label = 'name') => list.map(i => ({ value: i.id, label: i[label] }));

const MODULES = {
  stores: {
    label: 'Store', api: Stores, write: ['admin', 'manager'], del: ['admin'],
    lookups: async () => ({}),
    columns: () => [
      { label: 'Store', render: r => `<strong>${esc(r.name)}</strong>` },
      { label: 'Floor', render: r => esc(r.floor) },
      { label: 'Category', render: r => esc(r.category) },
      { label: 'Area (sq ft)', render: r => esc(r.area_sqft) },
      { label: 'Monthly rent', render: r => esc(money(r.monthly_rent)) },
      { label: 'Status', render: r => badge(r.status) },
    ],
    fields: () => [
      { name: 'name', label: 'Store name', required: true, maxlength: 100 },
      { name: 'floor', label: 'Floor', type: 'number', required: true },
      { name: 'category', label: 'Category', required: true, maxlength: 50 },
      { name: 'area_sqft', label: 'Area (sq ft)', type: 'number', required: true },
      { name: 'monthly_rent', label: 'Monthly rent (₹)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', required: true,
        options: ['occupied', 'vacant', 'maintenance'].map(v => ({ value: v, label: v })) },
    ],
  },
  tenants: {
    label: 'Tenant', api: Tenants, write: ['admin', 'manager'], del: ['admin'],
    lookups: async () => ({ stores: await Stores.list() }),
    columns: lk => [
      { label: 'Tenant', render: r => `<strong>${esc(r.name)}</strong>` },
      { label: 'Phone', render: r => esc(r.phone) },
      { label: 'Email', render: r => esc(r.email || '—') },
      { label: 'Store', render: r => esc(byId(lk.stores, r.store_id) || '—') },
      { label: 'Lease ends', render: r => esc(r.lease_end || '—') },
    ],
    fields: lk => [
      { name: 'name', label: 'Tenant / company name', required: true, maxlength: 100 },
      { name: 'phone', label: 'Phone', required: true, maxlength: 15 },
      { name: 'email', label: 'Email', type: 'email', nullable: true },
      { name: 'store_id', label: 'Store', type: 'select', nullable: true, numeric: true, options: opts(lk.stores) },
      { name: 'lease_start', label: 'Lease start', type: 'date', nullable: true },
      { name: 'lease_end', label: 'Lease end', type: 'date', nullable: true },
    ],
  },
  rent: {
    label: 'Rent record', api: Rent, write: ['admin', 'manager'], del: ['admin'],
    lookups: async () => ({ tenants: await Tenants.list() }),
    columns: lk => [
      { label: 'Tenant', render: r => `<strong>${esc(byId(lk.tenants, r.tenant_id) || 'Unknown')}</strong>` },
      { label: 'Amount', render: r => esc(money(r.amount)) },
      { label: 'Due date', render: r => esc(r.due_date) },
      { label: 'Paid on', render: r => esc(r.paid_date || '—') },
      { label: 'Status', render: r => badge(r.status) },
    ],
    fields: lk => [
      { name: 'tenant_id', label: 'Tenant', type: 'select', required: true, numeric: true, options: opts(lk.tenants) },
      { name: 'amount', label: 'Amount (₹)', type: 'number', required: true },
      { name: 'due_date', label: 'Due date', type: 'date', required: true },
      { name: 'paid_date', label: 'Paid date', type: 'date', nullable: true },
      { name: 'status', label: 'Status', type: 'select', required: true,
        options: ['paid', 'pending', 'overdue'].map(v => ({ value: v, label: v })) },
    ],
  },
  parking: {
    label: 'Vehicle', api: Parking, write: ['admin', 'manager', 'staff'], del: ['admin'],
    lookups: async () => ({}),
    columns: () => [
      { label: 'Vehicle no.', render: r => `<strong>${esc(r.vehicle_number)}</strong>` },
      { label: 'Slot', render: r => esc(r.slot) },
      { label: 'Type', render: r => esc(r.vehicle_type) },
      { label: 'Entry', render: r => esc(dt(r.entry_time)) },
      { label: 'Exit', render: r => esc(dt(r.exit_time)) },
      { label: 'Fee', render: r => esc(money(r.fee)) },
      { label: 'Status', render: r => badge(r.status) },
    ],
    fields: () => [
      { name: 'vehicle_number', label: 'Vehicle number', required: true, maxlength: 15 },
      { name: 'slot', label: 'Parking slot', required: true, maxlength: 10 },
      { name: 'vehicle_type', label: 'Vehicle type', type: 'select', required: true,
        options: ['car', 'bike', 'other'].map(v => ({ value: v, label: v })) },
      { name: 'entry_time', label: 'Entry time', type: 'datetime-local', required: true },
      { name: 'exit_time', label: 'Exit time', type: 'datetime-local', nullable: true },
      { name: 'fee', label: 'Fee (₹)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', required: true,
        options: ['parked', 'exited'].map(v => ({ value: v, label: v })) },
    ],
  },
};

async function renderModule(key) {
  const m = MODULES[key];
  const canWrite = m.write.includes(me.role), canDelete = m.del.includes(me.role);
  const lk = await m.lookups();
  view.innerHTML = `<div class="toolbar">
      <input class="input" id="q" placeholder="Search…" maxlength="50" autocomplete="off">
      ${canWrite ? `<button class="btn" id="add">+ Add ${esc(m.label)}</button>` : ''}
    </div><div class="card table-wrap" id="tbl"></div>`;
  let rows = [];

  function draw() {
    const cols = m.columns(lk);
    if (!rows.length) { $('#tbl').innerHTML = '<div class="empty">No records found.</div>'; return; }
    $('#tbl').innerHTML = `<table><thead><tr>${cols.map(c => `<th>${esc(c.label)}</th>`).join('')}
      ${canWrite || canDelete ? '<th>Actions</th>' : ''}</tr></thead><tbody>${rows.map(r => `<tr>
      ${cols.map(c => `<td>${c.render(r)}</td>`).join('')}
      ${canWrite || canDelete ? `<td class="actions">
        ${canWrite ? `<button class="btn ghost sm" data-act="edit" data-id="${r.id}">Edit</button>` : ''}
        ${canDelete ? `<button class="btn ghost sm" data-act="del" data-id="${r.id}">Delete</button>` : ''}</td>` : ''}
      </tr>`).join('')}</tbody></table>`;
  }
  async function load() { rows = await m.api.list($('#q').value); draw(); }

  let timer;
  $('#q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => load().catch(e => toast(e.message, 'error')), 300); });

  if (canWrite) $('#add').addEventListener('click', () => openForm({
    title: `Add ${m.label}`, fields: m.fields(lk),
    onSubmit: async d => { await m.api.create(d); toast(`${m.label} added`); await load(); },
  }));

  $('#tbl').addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const row = rows.find(r => r.id === Number(b.dataset.id)); if (!row) return;
    if (b.dataset.act === 'edit') {
      openForm({ title: `Edit ${m.label}`, fields: m.fields(lk), values: row,
        onSubmit: async d => { await m.api.update(row.id, d); toast('Updated'); await load(); } });
    } else if (await confirmBox(`Delete this ${m.label.toLowerCase()}? This cannot be undone.`)) {
      try { await m.api.remove(row.id); toast('Deleted'); await load(); } catch (ex) { toast(ex.message, 'error'); }
    }
  });
  await load();
}

// ---------- Dashboard ----------
async function renderDashboard() {
  const d = await Dashboard.get();
  const n = v => Number(v || 0);
  const total = n(d.stores.total), occ = n(d.stores.occupied), pct = total ? Math.round(occ / total * 100) : 0;
  const stat = (label, value) => `<div class="card stat"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></div>`;
  view.innerHTML = `<div class="grid">
      ${stat('Total stores', total)}${stat('Occupied', occ)}${stat('Vacant', n(d.stores.vacant))}
      ${stat('Under maintenance', n(d.stores.maintenance))}${stat('Tenants', n(d.tenants.total))}
    </div>
    <div class="card" style="margin-bottom:20px"><strong>Occupancy: ${pct}%</strong><div class="bar"><div id="occBar"></div></div></div>
    <div class="grid">
      ${stat('Rent collected', money(d.rent.collected))}${stat('Rent pending', money(d.rent.pending))}
      ${stat('Rent overdue', money(d.rent.overdue))}${stat('Vehicles parked now', n(d.parking.parked_now))}
      ${stat('Parking revenue', money(d.parking.revenue))}
    </div>`;
  requestAnimationFrame(() => { $('#occBar').style.width = pct + '%'; });
}

// ---------- Users (admin only) ----------
async function renderUsers() {
  view.innerHTML = `<div class="toolbar"><span class="hint">New sign-ups appear as inactive. Click Enable to approve them.</span><button class="btn" id="addUser">+ Add User</button></div>
    <div class="card table-wrap" id="tbl"></div>`;
  let users = [];
  function draw() {
    $('#tbl').innerHTML = `<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${users.map(u => { const self = u.id === me.id; return `<tr><td><strong>${esc(u.name)}</strong></td><td>${esc(u.email)}</td>
        <td>${self ? badge(u.role) : `<select class="input" data-act="role" data-id="${u.id}" style="width:auto">
          ${['admin', 'manager', 'staff'].map(r => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select>`}</td>
        <td>${u.active ? badge('paid').replace('paid', 'active') : badge('overdue').replace('overdue', 'inactive')}</td>
        <td>${self ? '<em>You</em>' : `<button class="btn ghost sm" data-act="toggle" data-id="${u.id}">${u.active ? 'Disable' : 'Enable'}</button>`}</td></tr>`; }).join('')}
      </tbody></table>`;
  }
  async function load() { users = await Users.list(); draw(); }

  $('#addUser').addEventListener('click', () => openForm({
    title: 'Add User', submitText: 'Create',
    fields: [
      { name: 'name', label: 'Full name', required: true, maxlength: 100 },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'password', label: 'Password (min 10 chars, upper + lower + number)', type: 'password', required: true, maxlength: 72 },
      { name: 'role', label: 'Role', type: 'select', required: true, options: ['admin', 'manager', 'staff'].map(v => ({ value: v, label: v })) },
    ],
    onSubmit: async d => { await Users.create(d); toast('User created'); await load(); },
  }));
  $('#tbl').addEventListener('click', async e => {
    const b = e.target.closest('button[data-act=toggle]'); if (!b) return;
    const u = users.find(x => x.id === Number(b.dataset.id));
    try { await Users.update(u.id, { active: !u.active }); toast('Updated'); await load(); } catch (ex) { toast(ex.message, 'error'); }
  });
  $('#tbl').addEventListener('change', async e => {
    const s = e.target.closest('select[data-act=role]'); if (!s) return;
    try { await Users.update(Number(s.dataset.id), { role: s.value }); toast('Role updated'); await load(); }
    catch (ex) { toast(ex.message, 'error'); await load(); }
  });
  await load();
}

// ---------- My account ----------
function renderAccount() {
  view.innerHTML = `<div class="card narrow"><h3 style="margin-top:0">Change password</h3>
    <p class="hint">Min 10 characters with an uppercase letter, a lowercase letter and a number. You will be logged out after changing it.</p>
    <form id="pw" novalidate>
      <div class="field"><label for="cur">Current password</label><input class="input" id="cur" type="password" maxlength="72" autocomplete="current-password"></div>
      <div class="field"><label for="nw">New password</label><input class="input" id="nw" type="password" maxlength="72" autocomplete="new-password"></div>
      <div class="form-error" id="pwErr"></div><button class="btn" type="submit">Update password</button></form></div>`;
  $('#pw').addEventListener('submit', async e => {
    e.preventDefault();
    $('#pwErr').textContent = '';
    try {
      await api('/auth/change-password', { method: 'POST', body: { current_password: $('#cur').value, new_password: $('#nw').value } });
      Auth.clear(); location.replace('login.html');
    } catch (ex) { $('#pwErr').textContent = ex.message; }
  });
}

// ---------- Navigation ----------
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', render: renderDashboard },
  { id: 'stores', label: 'Stores', icon: '🏪', render: () => renderModule('stores') },
  { id: 'tenants', label: 'Tenants', icon: '👥', render: () => renderModule('tenants') },
  { id: 'rent', label: 'Rent', icon: '💰', render: () => renderModule('rent') },
  { id: 'parking', label: 'Parking', icon: '🚗', render: () => renderModule('parking') },
  { id: 'users', label: 'Users', icon: '🔐', roles: ['admin'], render: renderUsers },
  { id: 'account', label: 'My Account', icon: '⚙️', render: renderAccount },
].filter(n => !n.roles || n.roles.includes(me.role));

$('#nav').innerHTML = NAV.map(n => `<a href="#/${n.id}" data-id="${n.id}"><span>${n.icon}</span>${esc(n.label)}</a>`).join('');
$('#who').textContent = me.name;
$('#role').textContent = me.role;
$('#logout').addEventListener('click', () => Auth.logout());
$('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

async function route() {
  const id = location.hash.replace('#/', '') || 'dashboard';
  const item = NAV.find(n => n.id === id) || NAV[0];
  $('#title').textContent = item.label;
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.id === item.id));
  $('#sidebar').classList.remove('open');
  view.innerHTML = '<div class="loading">Loading…</div>';
  try { await item.render(); }
  catch (e) { view.innerHTML = `<div class="card error">${esc(e.message)}</div>`; }
}
window.addEventListener('hashchange', route);
route();
