const form = document.getElementById('f'), btn = document.getElementById('btn');
const err = document.getElementById('err'), ok = document.getElementById('ok');

form.addEventListener('submit', async e => {
  e.preventDefault();
  err.textContent = ''; ok.textContent = '';
  btn.disabled = true;
  try {
    const pw = document.getElementById('pw').value;
    if (pw !== document.getElementById('pw2').value) throw new Error('Passwords do not match');
    const r = await api('/auth/register', { method: 'POST', body: {
      name: document.getElementById('name').value, email: document.getElementById('email').value, password: pw } });
    ok.textContent = r.message;
    form.reset();
  } catch (ex) {
    err.textContent = ex.message;
  }
  btn.disabled = false;
});
