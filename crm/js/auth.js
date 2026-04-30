const ADMIN_PASSWORD = 'app2cash2024';

async function doLogin() {
  const email = document.getElementById('a-email').value.trim();
  const pass = document.getElementById('a-pass').value;
  const err = document.getElementById('a-err');
  err.textContent = '';
  if (!ADMIN_EMAILS.includes(email)) { err.textContent = 'Доступ запрещён'; return; }
  if (pass !== ADMIN_PASSWORD) { err.textContent = 'Неверный пароль'; return; }
  localStorage.setItem('crm_auth', '1');
  await initCRM();
}

function doLogout() {
  localStorage.removeItem('crm_auth');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('crm').style.display = 'none';
}

async function initCRM() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('crm').style.display = 'block';
  await Promise.all([loadPartners(), loadLeads(), loadComms(), loadExchanges()]);
  renderDashboard();
}

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('crm_auth') === '1') initCRM();
});