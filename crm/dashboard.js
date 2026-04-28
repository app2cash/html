function renderDashboard() {
  document.getElementById('d-partners').textContent = allPartners.length;
  document.getElementById('d-leads').textContent = allLeads.length;
  document.getElementById('d-new').textContent = allLeads.filter(l => !l.status || l.status === 'new').length;
  document.getElementById('d-paid').textContent = '$' + allComms.reduce((s, c) => s + parseFloat(c.amount || 0), 0).toFixed(2);
  document.getElementById('d-volume').textContent = '$' + allLeads.reduce((s, l) => s + parseFloat(l.amount || 0), 0).toFixed(0);
  document.getElementById('dash-leads-body').innerHTML =
    allLeads.slice(0, 6).map(l => `<tr><td>${l.name || '—'}</td><td style="color:var(--gold)">$${parseFloat(l.amount || 0).toFixed(0)}</td><td>${statusBadge(l.status)}</td></tr>`).join('') ||
    '<tr><td colspan="3" class="empty">Нет лидов</td></tr>';
  document.getElementById('dash-partners-body').innerHTML =
    [...allPartners].sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 6).map(p =>
      `<tr><td>${p.name}</td><td style="color:var(--gold)">$${parseFloat(p.balance || 0).toFixed(2)}</td><td><span class="badge badge-level">LVL${p.level || 0}</span></td></tr>`
    ).join('') || '<tr><td colspan="3" class="empty">Нет партнёров</td></tr>';
}
