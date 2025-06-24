import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('rangeSelect').addEventListener('change', toggleDateInputs);
  document.getElementById('searchKeyword').addEventListener('input', loadAccountingTable);
  loadAccountingTable();
});

function toggleDateInputs() {
  const range = document.getElementById('rangeSelect').value;
  const custom = range === 'custom';
  document.getElementById('startDate').style.display = custom ? 'inline' : 'none';
  document.getElementById('endDate').style.display = custom ? 'inline' : 'none';
}

function getDateRange() {
  const range = document.getElementById('rangeSelect').value;
  const now = new Date();
  let start = null;

  if (range === 'custom') {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    return { start: startDate, end: endDate };
  }

  const months = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[range] || 1;
  start = new Date(now.setMonth(now.getMonth() - months)).toISOString().split('T')[0];
  const end = new Date().toISOString().split('T')[0];
  return { start, end };
}

async function loadAccountingTable() {
  const { start, end } = getDateRange();
  const keyword = document.getElementById('searchKeyword').value.trim().toLowerCase();

  const { data, error } = await supabase
    .from('as_orders')
    .select('*')
    .eq('status', '처리완료')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false });

  const tbody = document.getElementById('accountingBody');
  tbody.innerHTML = '';

  if (error) {
    console.error('불러오기 오류:', error);
    tbody.innerHTML = `<tr><td colspan="8">불러오기 실패</td></tr>`;
    return;
  }

  let total = 0;
  const monthlyMap = {};
  const rows = (data || []).filter(order => {
    if (!keyword) return true;
    return (
      order.order_id?.toString().includes(keyword) ||
      order.name?.toLowerCase().includes(keyword) ||
      order.shipping_invoice?.toLowerCase().includes(keyword)
    );
  });

  for (const order of rows) {
    const cost = Number(order.repair_cost || 0);
    const created = order.created_at?.split('T')[0] || '';
    const month = created.substring(0, 7);
    monthlyMap[month] = (monthlyMap[month] || 0) + cost;
    total += cost;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.order_id}</td>
      <td>${order.shipping_invoice || '-'}</td>
      <td>${order.name}</td>
      <td>${created}</td>
      <td>₩${cost.toLocaleString()}</td>
      <td>${order.payment_date?.split('T')[0] || '-'}</td>
      <td>${order.shipped_at?.split('T')[0] || '-'}</td>
      <td>${order.shipping_invoice || '-'}</td>
    `;
    tbody.appendChild(row);
  }

  document.getElementById('totalRepairCost').textContent = `총 수리금액: ₩${total.toLocaleString()}`;

  const statDiv = document.getElementById('monthlyStats');
  statDiv.innerHTML = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, val]) => `<div>${month}: ₩${val.toLocaleString()}</div>`) 
    .join('');
}
