import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

function formatDateOnly(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

async function loadOrderCreateData() {
  const tbody = document.getElementById("createTableBody");
  tbody.innerHTML = '<tr><td colspan="6">불러오는 중...</td></tr>';

  const { data, error } = await supabase
    .from("order_create")
    .select("order_id, code, name, payment_date, j_retail, price")
    .order("order_id", { ascending: false });

  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="6">데이터 로딩 실패: ${error?.message || '오류'}</td></tr>`;
    return;
  }

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">데이터가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  for (const row of data) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.order_id}</td>
      <td>${row.code}</td>
      <td class="ellipsis" title="${row.name}">${row.name}</td>
      <td>${formatDateOnly(row.payment_date)}</td>
      <td>${row.j_retail ?? '-'}</td>
      <td>${row.price ?? '-'}</td>
    `;
    tbody.appendChild(tr);
  }
}

window.addEventListener('DOMContentLoaded', loadOrderCreateData);
