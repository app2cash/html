async function loadExchanges() {
  const { data, error } = await sb.from('exchanges').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  allExchanges = data || [];
  renderExchanges();
}

function renderExchanges(data) {
  const list = data || allExchanges;
  const body = document.getElementById('exchanges-body');
  if (!list.length) { body.innerHTML = '<tr><td colspan="10" class="empty">Нет обменов</td></tr>'; return; }
  body.innerHTML = list.map(e => `<tr>
    <td style="font-size:12px;color:var(--muted)">${new Date(e.created_at).toLocaleDateString('ru')}</td>
    <td><b>${e.client_name || '—'}</b><br><span style="font-size:11px;color:var(--muted)">${e.client_phone || ''}</span></td>
    <td style="color:var(--gold);font-weight:700">${parseFloat(e.amount_send||0).toFixed(2)} <span class="curr-badge">${e.currency_send||''}</span></td>
    <td>${parseFloat(e.amount_receive||0).toFixed(2)} <span class="curr-badge">${e.currency_receive||''}</span></td>
    <td style="font-size:12px;color:var(--muted)">${e.rate ? parseFloat(e.rate).toFixed(4) : '—'}</td>
    <td style="font-size:12px">${e.method || '—'}</td>
    <td style="font-size:11px;color:var(--gold)">${e.partner_code || '—'}</td>
    <td>${exchangeStatusBadge(e.status)}</td>
    <td style="text-align:center">${e.commission_paid ? '<span style="color:var(--green)">✅</span>' : '<span style="color:var(--muted)">—</span>'}</td>
    <td><div class="actions">
      ${e.client_phone ? `<a class="act-btn act-wa" href="https://wa.me/${e.client_phone.replace(/\D/g,'')}" target="_blank">💬 WA</a>` : ''}
      <button class="act-btn act-edit" onclick="openEditExchange('${e.id}')">✏️</button>
      <button class="act-btn act-pay" onclick="toggleCommissionPaid('${e.id}',${!!e.commission_paid})">${e.commission_paid ? 'Отменить' : '💰 Выплатить'}</button>
    </div></td>
  </tr>`).join('');
}

function exchangeStatusBadge(s) {
  if (!s || s === 'pending')  return '<span class="badge badge-pend">Ожидает</span>';
  if (s === 'processing')     return '<span class="badge badge-work">В процессе</span>';
  if (s === 'done')           return '<span class="badge badge-green">Выполнен</span>';
  if (s === 'cancelled')      return '<span class="badge badge-done">Отменён</span>';
  return `<span class="badge badge-done">${s}</span>`;
}

function filterExchanges() {
  const q = (document.getElementById('ex-search').value || '').toLowerCase();
  const s = document.getElementById('ex-filter').value;
  renderExchanges(allExchanges.filter(e => {
    const mq = (e.client_name||'').toLowerCase().includes(q) ||
               (e.client_phone||'').includes(q) ||
               (e.partner_code||'').toLowerCase().includes(q);
    const ms = !s || (e.status||'pending') === s;
    return mq && ms;
  }));
}

function calcRate() {
  const send    = parseFloat(document.getElementById('ex-amount-send').value) || 0;
  const receive = parseFloat(document.getElementById('ex-amount-receive').value) || 0;
  if (send && receive) {
    document.getElementById('ex-rate').value = (receive / send).toFixed(6);
  }
}

function openAddExchange() {
  ['ex-id','ex-client','ex-phone','ex-amount-send','ex-amount-receive','ex-rate','ex-partner','ex-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const cs = document.getElementById('ex-currency-send');
  const cr = document.getElementById('ex-currency-receive');
  if (cs) cs.value = 'USDT';
  if (cr) cr.value = 'RUB';
  const ms = document.getElementById('ex-method');
  if (ms) ms.selectedIndex = 0;
  const st = document.getElementById('ex-status');
  if (st) st.value = 'pending';
  const cp = document.getElementById('ex-comm-paid');
  if (cp) cp.checked = false;
  document.getElementById('ex-title').textContent = '➕ Новый обмен';
  openModal('exchange-modal');
}

function openEditExchange(id) {
  const e = allExchanges.find(x => x.id === id);
  if (!e) return;
  document.getElementById('ex-id').value             = e.id;
  document.getElementById('ex-client').value         = e.client_name || '';
  document.getElementById('ex-phone').value          = e.client_phone || '';
  document.getElementById('ex-amount-send').value    = e.amount_send || '';
  document.getElementById('ex-amount-receive').value = e.amount_receive || '';
  document.getElementById('ex-rate').value           = e.rate || '';
  document.getElementById('ex-currency-send').value  = e.currency_send || 'USDT';
  document.getElementById('ex-currency-receive').value = e.currency_receive || 'RUB';
  document.getElementById('ex-method').value         = e.method || '';
  document.getElementById('ex-status').value         = e.status || 'pending';
  document.getElementById('ex-partner').value        = e.partner_code || '';
  document.getElementById('ex-notes').value          = e.notes || '';
  document.getElementById('ex-comm-paid').checked    = !!e.commission_paid;
  document.getElementById('ex-title').textContent    = '✏️ Редактировать обмен';
  openModal('exchange-modal');
}

async function saveExchange() {
  const id               = document.getElementById('ex-id').value;
  const client_name      = document.getElementById('ex-client').value.trim();
  const client_phone     = document.getElementById('ex-phone').value.trim();
  const amount_send      = parseFloat(document.getElementById('ex-amount-send').value) || 0;
  const amount_receive   = parseFloat(document.getElementById('ex-amount-receive').value) || 0;
  const rate             = parseFloat(document.getElementById('ex-rate').value) || null;
  const currency_send    = document.getElementById('ex-currency-send').value;
  const currency_receive = document.getElementById('ex-currency-receive').value;
  const method           = document.getElementById('ex-method').value;
  const status           = document.getElementById('ex-status').value;
  const partner_code     = document.getElementById('ex-partner').value.trim().toUpperCase() || null;
  const notes            = document.getElementById('ex-notes').value.trim();
  const commission_paid  = document.getElementById('ex-comm-paid').checked;

  if (!client_name) { showToast('Введите имя клиента', true); return; }
  if (!amount_send) { showToast('Введите сумму отправки', true); return; }

  const payload = { client_name, client_phone, amount_send, amount_receive, rate,
                    currency_send, currency_receive, method, status, partner_code, notes, commission_paid };

  if (id) {
    const { error } = await sb.from('exchanges').update(payload).eq('id', id);
    if (error) { showToast('Ошибка: ' + error.message, true); return; }
    const idx = allExchanges.findIndex(x => x.id === id);
    if (idx > -1) allExchanges[idx] = { ...allExchanges[idx], ...payload };
    showToast('Обмен обновлён!');
  } else {
    const { data, error } = await sb.from('exchanges').insert(payload).select().single();
    if (error) { showToast('Ошибка: ' + error.message, true); return; }
    if (data) allExchanges.unshift(data);
    showToast('Обмен добавлен!');
  }
  closeModal('exchange-modal');
  renderExchanges();
  renderDashboard();
}

async function toggleCommissionPaid(id, current) {
  const { error } = await sb.from('exchanges').update({ commission_paid: !current }).eq('id', id);
  if (error) { showToast('Ошибка', true); return; }
  const idx = allExchanges.findIndex(x => x.id === id);
  if (idx > -1) allExchanges[idx].commission_paid = !current;
  renderExchanges();
  showToast(!current ? 'Комиссия выплачена ✅' : 'Отмечено как невыплаченная');
}
