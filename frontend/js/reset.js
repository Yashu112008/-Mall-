const form = document.getElementById('f'), btn = document.getElementById('btn');
const err = document.getElementById('err'), ok = document.getElementById('ok');
const token = new URLSearchParams(location.search).get('token') || '';
form.addEventListener('submit', async e => {
  e.preventDefault();
  err.textContent = ''; ok.textContent = '';
  btn.disabled = true;
  try {
    if (!token) throw new Error('Reset link is missing its token. Use the link from your email.');
    const pw = document.getElementById('pw').value;
    if (pw !== document.getElementById('pw2').value) throw new Error('Passwords do not match');
    const r = await api('/auth/reset-password', { method: 'POST', body: { token, new_password: pw } });
    ok.textContent = r.message + ' Redirecting…';
    setTimeout(() => location.href = 'login.html', 1800);
    form.reset();
  } catch (ex) {
    err.textContent = ex.message;
  }
  btn.disabled = false;
});
