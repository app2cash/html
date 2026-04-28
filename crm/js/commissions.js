async function loadComms() {
  const { data, error } = await sb.from('commissions').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) { console.error(error); return; }
  allComms = data || [];
  renderComms();
}
function renderComms() {
  const body = document.getElementById('comms-body');
  if (!allComms.length) { body.innerHTML = '<tr><td colspan="6" class="empty">Нет начислений</td></tr>'; return; }
  body.innerHTML = allComms.map(c => `<tr>
    <td style="font-size:12px;color:var(--muted)">${new Date(c.created_at).toLocaleDateString('ru')}</td>
    <td style="color:var(--gold);font-size:12px;font-weight:700">${c.partner_code || '—'}</td>
    <td style="font-size:12px;color:var(--muted)">${c.from_partner || '—'}</td>
    <td><span class="badge badge-level">L${c.line || 1}</span></td>
    <td style="font-size:12px">${c.type === 'activation' ? 'Активация' : 'Обмен'}</td>
    <td style="color:var(--gold);font-weight:700">+$${parseFloat(c.amount || 0).toFixed(2)}</td>
  </tr>`).join('');
}
function openPayModal() { openModal('pay-modal'); }
function openPayModalFor(code) {
  const sel = document.getElementById('m-partner');
  for (let i = 0; i < sel.options.length; i++) if (sel.options[i].value === code) { sel.selectedIndex = i; break; }
  openModal('pay-modal');
}
async function saveCommission() {
  const partner_code = document.getElementById('m-partner').value;
  const type = document.getElementById('m-type').value;
  const line = parseInt(document.getElementById('m-line').value);
  const amount = parseFloat(document.getElementById('m-amount').value);
  if (!partner_code) { showToast('Выберите партнёра', true); return; }
  if (!amount || isNaN(amount) || amount <= 0) { showToast('Введите корректную сумму', true); return; }
  const { error: ce } = await sb.from('commissions').insert({ partner_code, type, line, amount });
  if (ce) { showToast('Ошибка: ' + ce.message, true); return; }
  const p = allPartners.find(x => x.partner_code === partner_code);
  if (p) {
    await sb.from('partners').update({
      balance: parseFloat(p.balance || 0) + amount,
      total_earned: parseFloat(p.total_earned || 0) + amount
    }).eq('partner_code', partner_code);
  }
  closeModal('pay-modal');
  document.getElementById('m-amount').value = '';
  showToast('Комиссия начислена!');
  await Promise.all([loadPartners(), loadComms()]);
  renderDashboard();
}
