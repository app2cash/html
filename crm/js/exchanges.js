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
    <td><b>${e.client_name || '—'}</b><br><span style="font-size:11px;color:var(--muted)">${e.client_phone || ''}</span>
      ${e.client_telegram ? `<br><span style="font-size:11px;color:#229ED9">${e.client_telegram}</span>` : ''}
      ${e.traffic_source ? `<br><span style="font-size:10px;background:var(--surface2);padding:1px 5px;border-radius:4px;color:var(--muted)">${e.traffic_source}</span>` : ''}
    </td>
    <td><span style="color:var(--gold);font-weight:700">${parseFloat(e.amount_send||0).toFixed(2)}</span> <span class="curr-badge">${e.currency_send||''}</span>
      ${e.send_extra ? `<br><span style="font-size:10px;color:var(--muted)">${e.send_extra}</span>` : ''}
    </td>
    <td>${parseFloat(e.amount_receive||0).toFixed(2)} <span class="curr-badge">${e.currency_receive||''}</span>
      ${e.receive_extra ? `<br><span style="font-size:10px;color:var(--muted)">${e.receive_extra}</span>` : ''}
    </td>
    <td style="font-size:12px;color:var(--muted)">${e.rate ? parseFloat(e.rate).toFixed(4) : '—'}</td>
    <td style="font-size:12px">${e.method || '—'}${e.method_extra ? `<br><span style="font-size:10px;color:var(--muted)">${e.method_extra}</span>` : ''}</td>
    <td style="font-size:11px;color:var(--gold)">${e.partner_code || '—'}</td>
    <td>${exchangeStatusBadge(e.status)}</td>
    <td style="text-align:center">${e.commission_paid ? '<span style="color:var(--green)">✅</span>' : '<span style="color:var(--muted)">—</span>'}</td>
    <td><div class="actions">
      ${e.client_whatsapp || e.client_phone ? `<a class="act-btn act-wa" href="https://wa.me/${(e.client_whatsapp||e.client_phone).replace(/\D/g,'')}" target="_blank">💬 WA</a>` : ''}
      ${e.client_telegram ? `<a class="act-btn act-tg" href="https://t.me/${e.client_telegram.replace('@','')}" target="_blank">✈ TG</a>` : ''}
      <button class="act-btn act-edit" onclick="openEditExchange('${e.id}')">✏️</button>
      <button class="act-btn act-pay" onclick="toggleCommissionPaid('${e.id}',${!!e.commission_paid})">${e.commission_paid ? 'Отменить' : '💰'}</button>
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
               (e.client_telegram||'').toLowerCase().includes(q) ||
               (e.traffic_source||'').toLowerCase().includes(q) ||
               (e.partner_code||'').toLowerCase().includes(q);
    const ms = !s || (e.status||'pending') === s;
    return mq && ms;
  }));
}

function calcRate() {
  const send    = parseFloat(document.getElementById('ex-amount-send').value) || 0;
  const receive = parseFloat(document.getElementById('ex-amount-receive').value) || 0;
  if (send && receive) document.getElementById('ex-rate').value = (receive / send).toFixed(6);
}

const EX_FIELDS = ['ex-id','ex-client','ex-phone','ex-whatsapp','ex-telegram','ex-email',
  'ex-birthday','ex-country','ex-city','ex-traffic','ex-amount-send','ex-amount-receive',
  'ex-rate','ex-partner','ex-notes','ex-send-extra','ex-receive-extra','ex-method-extra'];

function openAddExchange() {
  EX_FIELDS.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('ex-currency-send').value = 'USDT';
  document.getElementById('ex-currency-receive').value = 'RUB';
  document.getElementById('ex-method').selectedIndex = 0;
  document.getElementById('ex-status').value = 'pending';
  document.getElementById('ex-comm-paid').checked = false;
  document.getElementById('ex-title').textContent = '➕ Новый обмен';
  openModal('exchange-modal');
}

function openEditExchange(id) {
  const e = allExchanges.find(x => x.id === id);
  if (!e) return;
  document.getElementById('ex-id').value             = e.id;
  document.getElementById('ex-client').value         = e.client_name || '';
  document.getElementById('ex-phone').value          = e.client_phone || '';
  document.getElementById('ex-whatsapp').value       = e.client_whatsapp || '';
  document.getElementById('ex-telegram').value       = e.client_telegram || '';
  document.getElementById('ex-email').value          = e.client_email || '';
  document.getElementById('ex-birthday').value       = e.client_birthday || '';
  document.getElementById('ex-country').value        = e.client_country || '';
  document.getElementById('ex-city').value           = e.client_city || '';
  document.getElementById('ex-traffic').value        = e.traffic_source || '';
  document.getElementById('ex-amount-send').value    = e.amount_send || '';
  document.getElementById('ex-amount-receive').value = e.amount_receive || '';
  document.getElementById('ex-rate').value           = e.rate || '';
  document.getElementById('ex-currency-send').value  = e.currency_send || 'USDT';
  document.getElementById('ex-currency-receive').value = e.currency_receive || 'RUB';
  document.getElementById('ex-send-extra').value     = e.send_extra || '';
  document.getElementById('ex-receive-extra').value  = e.receive_extra || '';
  document.getElementById('ex-method').value         = e.method || '';
  document.getElementById('ex-method-extra').value   = e.method_extra || '';
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
  const client_whatsapp  = document.getElementById('ex-whatsapp').value.trim();
  const client_telegram  = document.getElementById('ex-telegram').value.trim();
  const client_email     = document.getElementById('ex-email').value.trim();
  const client_birthday  = document.getElementById('ex-birthday').value || null;
  const client_country   = document.getElementById('ex-country').value.trim();
  const client_city      = document.getElementById('ex-city').value.trim();
  const traffic_source   = document.getElementById('ex-traffic').value.trim();
  const amount_send      = parseFloat(document.getElementById('ex-amount-send').value) || 0;
  const amount_receive   = parseFloat(document.getElementById('ex-amount-receive').value) || 0;
  const rate             = parseFloat(document.getElementById('ex-rate').value) || null;
  const currency_send    = document.getElementById('ex-currency-send').value;
  const currency_receive = document.getElementById('ex-currency-receive').value;
  const send_extra       = document.getElementById('ex-send-extra').value.trim();
  const receive_extra    = document.getElementById('ex-receive-extra').value.trim();
  const method           = document.getElementById('ex-method').value;
  const method_extra     = document.getElementById('ex-method-extra').value.trim();
  const status           = document.getElementById('ex-status').value;
  const partner_code     = document.getElementById('ex-partner').value.trim().toUpperCase() || null;
  const notes            = document.getElementById('ex-notes').value.trim();
  const commission_paid  = document.getElementById('ex-comm-paid').checked;

  if (!client_name) { showToast('Введите имя клиента', true); return; }
  if (!amount_send) { showToast('Введите сумму отправки', true); return; }

  const payload = { client_name, client_phone, client_whatsapp, client_telegram, client_email,
                    client_birthday, client_country, client_city, traffic_source,
                    amount_send, amount_receive, rate, currency_send, currency_receive,
                    send_extra, receive_extra, method, method_extra,
                    status, partner_code, notes, commission_paid };

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