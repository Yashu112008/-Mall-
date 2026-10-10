const form = document.getElementById('f'), btn = document.getElementById('btn');
const err = document.getElementById('err'), ok = document.getElementById('ok');

form.addEventListener('submit', async e => {
  e.preventDefault();
  err.textContent = ''; ok.textContent = '';
  btn.disabled = true;
  try {
    const r = await api('/auth/forgot-password', { method: 'POST', body: { email: document.getElementById('email').value } });
    ok.textContent = r.message;
    form.reset();
  } catch (ex) {
    err.textContent = ex.message;
  }
  btn.disabled = false;
});
