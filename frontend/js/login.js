if (Auth.token()) location.href = 'index.html';

const form = document.getElementById('loginForm');
const btn = document.getElementById('btn');
const err = document.getElementById('err');

form.addEventListener('submit', async e => {
  e.preventDefault();
  err.textContent = '';
  btn.disabled = true;
  try {
    const r = await api('/auth/login', { method: 'POST', body: {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
    } });
    Auth.save(r.token, r.user);
    location.href = 'index.html';
  } catch (ex) {
    err.textContent = ex.message;
  }
  btn.disabled = false;
});
