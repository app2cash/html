async function doLogin() {
  const email = document.getElementById('a-email').value.trim();
  const pass = document.getElementById('a-pass').value;
  const err = document.getElementById('a-err');
  err.textContent = '';
  if (!ADMIN_EMAILS.includes(email)) { err.textContent = 'Доступ запрещён'; return; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) { err.textContent = 'Неверный email или пароль'; return; }
  await initCRM();
}
async function doLogout() {
  await sb.auth.signOut();
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
  sb.auth.getSession().then(({ data }) => {
    if (data.session && ADMIN_EMAILS.includes(data.session.user.email)) initCRM();
  });
});
