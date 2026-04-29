function renderDashboard() {
  document.getElementById('d-partners').textContent = allPartners.length;
  document.getElementById('d-exchanges').textContent = allExchanges.length;
  document.getElementById('d-volume').textContent = '$' + allExchanges.reduce((s,e) => s + parseFloat(e.amount_send||0), 0).toFixed(0);
  document.getElementById('d-leads').textContent = allLeads.length;
  document.getElementById('d-new').textContent = allLeads.filter(l => !l.status || l.status === 'new').length;
  document.getElementById('d-paid').textContent = '$' + allComms.reduce((s,c) => s + parseFloat(c.amount||0), 0).toFixed(2);

  document.getElementById('dash-exchanges-body').innerHTML =
    allExchanges.slice(0,6).map(e => `<tr>
      <td>${e.client_name||'—'}</td>
      <td style="color:var(--gold)">${parseFloat(e.amount_send||0).toFixed(0)} ${e.currency_send||''}</td>
      <td>${parseFloat(e.amount_receive||0).toFixed(0)} ${e.currency_receive||''}</td>
      <td>${exchangeStatusBadge(e.status)}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="empty">Нет обменов</td></tr>';

  document.getElementById('dash-partners-body').innerHTML =
    [...allPartners].sort((a,b) => (b.balance||0)-(a.balance||0)).slice(0,6).map(p =>
      `<tr><td>${p.name}</td><td style="color:var(--gold)">$${parseFloat(p.balance||0).toFixed(2)}</td><td><span class="badge badge-level">LVL${p.level||0}</span></td></tr>`
    ).join('') || '<tr><td colspan="3" class="empty">Нет партнёров</td></tr>';
}
