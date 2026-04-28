async function loadLeads() {
  const { data, error } = await sb.from('leads').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  allLeads = data || [];
  renderLeads();
}
function renderLeads(data) {
  const list = data || allLeads;
  const body = document.getElementById('leads-body');
  if (!list.length) { body.innerHTML = '<tr><td colspan="8" class="empty">Нет лидов</td></tr>'; return; }
  body.innerHTML = list.map(l => `<tr>
    <td style="font-size:12px;color:var(--muted)">${new Date(l.created_at).toLocaleDateString('ru')}</td>
    <td><b>${l.name || '—'}</b></td>
    <td style="font-size:12px">${l.phone || '—'}</td>
    <td style="color:var(--gold);font-weight:700">$${parseFloat(l.amount || 0).toFixed(0)}</td>
    <td style="font-size:11px;color:var(--muted)">${l.partner_code || '—'}</td>
    <td>${statusBadge(l.status)}</td>
    <td><span class="notes-pill" title="${(l.notes || '').replace(/"/g, '&quot;')}">${l.notes || '—'}</span></td>
    <td><div class="actions">
      ${l.phone ? `<a class="act-btn act-wa" href="https://wa.me/${l.phone.replace(/\D/g, '')}" target="_blank">💬 WA</a>` : ''}
      <button class="act-btn act-edit" onclick="openEditLead('${l.id}')">✏️</button>
    </div></td>
  </tr>`).join('');
}
function filterLeads() {
  const q = document.getElementById('leads-search').value.toLowerCase();
  const s = document.getElementById('leads-filter').value;
  renderLeads(allLeads.filter(l => {
    const mq = (l.name || '').toLowerCase().includes(q) || (l.phone || '').includes(q);
    const ms = !s || (l.status || 'new') === s;
    return mq && ms;
  }));
}
function openAddLead() {
  ['lm-id','lm-name','lm-phone','lm-amount','lm-partner','lm-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('lm-status').value = 'new';
  document.getElementById('lm-title').textContent = '➕ Добавить лид';
  openModal('lead-modal');
}
function openEditLead(id) {
  const l = allLeads.find(x => x.id === id);
  if (!l) return;
  document.getElementById('lm-id').value = l.id;
  document.getElementById('lm-name').value = l.name || '';
  document.getElementById('lm-phone').value = l.phone || '';
  document.getElementById('lm-amount').value = l.amount || '';
  document.getElementById('lm-partner').value = l.partner_code || '';
  document.getElementById('lm-status').value = l.status || 'new';
  document.getElementById('lm-notes').value = l.notes || '';
  document.getElementById('lm-title').textContent = '✏️ Редактировать лид';
  openModal('lead-modal');
}
async function saveLead() {
  const id = document.getElementById('lm-id').value;
  const name = document.getElementById('lm-name').value.trim();
  const phone = document.getElementById('lm-phone').value.trim();
  const amount = parseFloat(document.getElementById('lm-amount').value) || 0;
  const partner_code = document.getElementById('lm-partner').value.trim().toUpperCase() || null;
  const status = document.getElementById('lm-status').value;
  const notes = document.getElementById('lm-notes').value.trim();
  if (!name) { showToast('Введите имя', true); return; }
  if (id) {
    const { error } = await sb.from('leads').update({ name, phone, amount, partner_code, status, notes }).eq('id', id);
    if (error) { showToast('Ошибка: ' + error.message, true); return; }
    const idx = allLeads.findIndex(x => x.id === id);
    if (idx > -1) allLeads[idx] = { ...allLeads[idx], name, phone, amount, partner_code, status, notes };
    showToast('Лид обновлён!');
  } else {
    const { error } = await sb.from('leads').insert({ name, phone, amount, partner_code, status, notes });
    if (error) { showToast('Ошибка: ' + error.message, true); return; }
    showToast('Лид добавлен!');
    await loadLeads();
  }
  closeModal('lead-modal');
  renderLeads(); renderDashboard();
}
async function importLeadsCSV() {
  const file = document.getElementById('leads-csv-file').files[0];
  if (!file) { showToast('Выберите файл', true); return; }
  const rows = parseCSV(await file.text());
  if (!rows.length) { showToast('Пустой файл', true); return; }
  const bar = document.getElementById('l-csv-bar');
  const fill = document.getElementById('l-csv-fill');
  bar.style.display = 'block';
  let ok = 0, fail = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = r.name || r['имя'] || '';
    fill.style.width = Math.round((i + 1) / rows.length * 100) + '%';
    if (!name) { fail++; continue; }
    const { error } = await sb.from('leads').insert({
      name, phone: r.phone || '',
      amount: parseFloat(r.amount || '0') || 0,
      partner_code: (r.partner_code || '').toUpperCase() || null,
      status: r.status || 'new',
      notes: r.notes || ''
    });
    error ? fail++ : ok++;
  }
  bar.style.display = 'none'; fill.style.width = '0%';
  document.getElementById('leads-csv-file').value = '';
  closeModal('lead-csv-modal');
  showToast(`Импорт: ${ok} добавлено, ${fail} ошибок`);
  await loadLeads(); renderDashboard();
}
