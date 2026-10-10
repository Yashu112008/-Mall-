// Talks to the backend. Same origin, so the URL is relative.
// If the page is opened with VS Code Live Server (port 5500/5501) call the backend on port 5000.
// Otherwise (opened from the backend itself, or deployed) use the same address.
const API_URL = ['5500', '5501'].includes(location.port) ? 'http://localhost:5000/api/v1' : '/api/v1';

const Auth = {
  token: () => sessionStorage.getItem('token'),
  user: () => JSON.parse(sessionStorage.getItem('user') || 'null'),
  save(token, user) { sessionStorage.setItem('token', token); sessionStorage.setItem('user', JSON.stringify(user)); },
  clear() { sessionStorage.clear(); },
  require() { if (!Auth.token()) location.replace('login.html'); },
  async logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    Auth.clear();
    location.replace('login.html');
  },
};

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(API_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(Auth.token() && { Authorization: 'Bearer ' + Auth.token() }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/change-password')) {
    Auth.clear();
    location.replace('login.html');
  }
  if (!res.ok) {
    throw new Error(data.details ? data.details.map(d => `${d.field}: ${d.message}`).join(', ') : (data.error || 'Request failed'));
  }
  return data;
}

// Always use esc() when putting server data inside innerHTML (prevents XSS)
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const resource = name => ({
  list: (q = '') => api(`/${name}?limit=100&q=${encodeURIComponent(q)}`).then(r => r.data),
  create: body => api(`/${name}`, { method: 'POST', body }),
  update: (id, body) => api(`/${name}/${id}`, { method: 'PUT', body }),
  remove: id => api(`/${name}/${id}`, { method: 'DELETE' }),
});
const Stores = resource('stores'), Tenants = resource('tenants'), Rent = resource('rent'), Parking = resource('parking');
const Dashboard = { get: () => api('/dashboard') };
const Users = {
  list: () => api('/users'),
  create: body => api('/users', { method: 'POST', body }),
  update: (id, body) => api(`/users/${id}`, { method: 'PATCH', body }),
};
