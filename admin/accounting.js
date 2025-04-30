import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

function formatDateOnly(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

window.loadAccountingData = async function () {
  const start = document.getElementById('start-date').value;
  const end = document.getElementById('end-date').value;

  if (!start || !end) {
    alert('기간을 모두 선택해주세요.');
    return;
  }

  const { data, error } = await supabase
    .from('orders')
    .select('order_id, name, created_at, payment_date, total, tracking_date, tracking_number')
    .eq('is_shipped', true)
    .gte('tracking_date', start)
    .lte('tracking_date', end);

  if (error) {
    alert('데이터 조회 실패: ' + error.message);
    return;
  }

  const tbody = document.getElementById('accounting-table-body');
  tbody.innerHTML = '';

  let totalAmount = 0;

  data.forEach(order => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.order_id}</td>
      <td>${order.name}</td>
      <td>${formatDateOnly(order.created_at)}</td>
      <td>${order.payment_date ? formatDateOnly(order.payment_date) : '-'}</td>
      <td>₩${order.total.toLocaleString()}</td>
      <td>${order.tracking_number || '-'}</td>
    `;
    tbody.appendChild(row);
    totalAmount += order.total;
  });

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">검색 결과 없음</td></tr>';
  }

  const supplyPrice = Math.floor(totalAmount / 1.1);
  const vat = totalAmount - supplyPrice;

  document.getElementById('total').textContent = totalAmount.toLocaleString();
  document.getElementById('supply-price').textContent = supplyPrice.toLocaleString();
  document.getElementById('vat').textContent = vat.toLocaleString();
};
