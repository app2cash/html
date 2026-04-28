function showToast(msg, isErr = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isErr ? 'var(--red)' : 'var(--gold)';
  t.style.color = isErr ? '#fff' : '#000';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function statusBadge(s) {
  if (!s || s === 'new') return '<span class="badge badge-new">Новый</span>';
  if (s === 'in_progress') return '<span class="badge badge-work">В работе</span>';
  return '<span class="badge badge-done">Закрыт</span>';
}
function genCode(name) {
  return name.toUpperCase().replace(/[^A-ZА-ЯЁ0-9]/gi, '').substring(0, 4).toUpperCase() + (Math.floor(Math.random() * 900) + 100);
}
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] || '');
    return obj;
  });
}
function switchPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-item, .mob-btn').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const labels = { dashboard: 'Дашборд', partners: 'Партнёры', leads: 'Лиды', commissions: 'Комиссии' };
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.textContent.includes(labels[name])) n.classList.add('active');
  });
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-bg').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-bg.open').forEach(m => m.classList.remove('open'));
    if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') doLogin();
  });
});
