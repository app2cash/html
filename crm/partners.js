async function loadPartners() {
  const { data, error } = await sb.from('partners').select('*').order('id', { ascending: false });
  if (error) { console.error(error); return; }
  allPartners = data || [];
  renderPartners();
  const sel = document.getElementById('m-partner');
  sel.innerHTML = allPartners.map(p => `<option value="${p.partner_code}">${p.name} (${p.partner_code})</option>`).join('');
}
function renderPartners(data) {
  const list = data || allPartners;
  const body = document.getElementById('partners-body');
  if (!list.length) { body.innerHTML = '<tr><td colspan="9" class="empty">Нет партнёров</td></tr>'; return; }
  body.innerHTML = list.map(p => `<tr>
    <td><b>${p.name}</b></td>
    <td><span style="color:var(--gold);font-size:12px;font-weight:700">${p.partner_code}</span></td>
    <td style="font-size:12px">${p.telegram || '—'}</td>
    <td style="font-size:12px">${p.email || '—'}</td>
    <td><span class="badge badge-level">${LEVEL_NAMES[p.level || 0]}</span></td>
    <td style="color:var(--gold);font-weight:700">$${parseFloat(p.balance || 0).toFixed(2)}</td>
    <td style="font-size:12px;color:var(--muted)">${p.referred_by || '—'}</td>
    <td><span class="notes-pill" title="${(p.notes || '').replace(/"/g, '&quot;')}">${p.notes || '—'}</span></td>
    <td><div class="actions">
      ${p.telegram ? `<a class="act-btn act-tg" href="https://t.me/${p.telegram.replace('@', '')}" target="_blank">✈ TG</a>` : ''}
      ${p.email ? `<a class="act-btn act-email" href="mailto:${p.email}">✉</a>` : ''}
      <button class="act-btn act-pay" onclick="openPayModalFor('${p.partner_code}')">$ Начислить</button>
      <button class="act-btn act-edit" onclick="openEditPartner(${p.id})">✏️</button>
    </div></td>
  </tr>`).join('');
}
function filterPartners() {
  const q = document.getElementById('partners-search').value.toLowerCase();
  renderPartners(allPartners.filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.partner_code || '').toLowerCase().includes(q) ||
    (p.telegram || '').toLowerCase().includes(q) ||
    (p.email || '').toLowerCase().includes(q)
  ));
}
function openAddPartner() {
  ['pm-id','pm-name','pm-email','pm-telegram','pm-ref','pm-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pm-level').value = '0';
  document.getElementById('pm-title').textContent = '➕ Добавить партнёра';
  openModal('partner-modal');
}
function openEditPartner(id) {
  const p = allPartners.find(x => x.id === id);
  if (!p) return;
  document.getElementById('pm-id').value = p.id;
  document.getElementById('pm-name').value = p.name || '';
  document.getElementById('pm-email').value = p.email || '';
  document.getElementById('pm-telegram').value = p.telegram || '';
  document.getElementById('pm-ref').value = p.referred_by || '';
  document.getElementById('pm-level').value = p.level || 0;
  document.getElementById('pm-notes').value = p.notes || '';
  document.getElementById('pm-title').textContent = '✏️ Редактировать партнёра';
  openModal('partner-modal');
}
async function savePartner() {
  const id = document.getElementById('pm-id').value;
  const name = document.getElementById('pm-name').value.trim();
  const email = document.getElementById('pm-email').value.trim();
  const telegram = document.getElementById('pm-telegram').value.trim();
  const referred_by = document.getElementById('pm-ref').value.trim().toUpperCase() || null;
  const level = parseInt(document.getElementById('pm-level').value);
  const notes = document.getElementById('pm-notes').value.trim();
  if (!name) { showToast('Введите имя', true); return; }
  if (id) {
    const { error } = await sb.from('partners').update({ name, email, telegram, referred_by, level, notes }).eq('id', id);
    if (error) { showToast('Ошибка: ' + error.message, true); return; }
    showToast('Партнёр обновлён!');
  } else {
    const code = genCode(name);
    const { error } = await sb.from('partners').insert({ name, email, telegram, partner_code: code, referred_by, level, notes, balance: 0, total_volume: 0, total_earned: 0, status: 'active' });
    if (error) { showToast('Ошибка: ' + error.message, true); return; }
    showToast('Партнёр добавлен! Код: ' + code);
  }
  closeModal('partner-modal');
  await loadPartners();
  renderDashboard();
}
async function importPartnersCSV() {
  const file = document.getElementById('partners-csv-file').files[0];
  if (!file) { showToast('Выберите файл', true); return; }
  const rows = parseCSV(await file.text());
  if (!rows.length) { showToast('Пустой файл', true); return; }
  const bar = document.getElementById('p-csv-bar');
  const fill = document.getElementById('p-csv-fill');
  bar.style.display = 'block';
  let ok = 0, fail = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = r.name || r['имя'] || '';
    fill.style.width = Math.round((i + 1) / rows.length * 100) + '%';
    if (!name) { fail++; continue; }
    const { error } = await sb.from('partners').insert({
      name, email: r.email || '', telegram: r.telegram || '',
      partner_code: r.partner_code || genCode(name),
      referred_by: r.referred_by || null,
      level: parseInt(r.level || '0') || 0,
      notes: r.notes || '',
      balance: 0, total_volume: 0, total_earned: 0, status: 'active'
    });
    error ? fail++ : ok++;
  }
  bar.style.display = 'none'; fill.style.width = '0%';
  document.getElementById('partners-csv-file').value = '';
  closeModal('partner-csv-modal');
  showToast(`Импорт: ${ok} добавлено, ${fail} ошибок`);
  await loadPartners(); renderDashboard();
}
function exportCSV(type) {
  let rows, cols, filename;
  if (type === 'partners') {
    rows = allPartners;
    cols = ['name','email','telegram','partner_code','referred_by','level','balance','total_earned','notes','status'];
    filename = 'partners_' + new Date().toISOString().slice(0, 10) + '.csv';
  } else {
    rows = allLeads;
    cols = ['name','phone','amount','partner_code','status','notes','created_at'];
    filename = 'leads_' + new Date().toISOString().slice(0, 10) + '.csv';
  }
  const csv = '\uFEFF' + [cols.join(','), ...rows.map(r => cols.map(c => `"${(r[c] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = filename;
  a.click();
}
