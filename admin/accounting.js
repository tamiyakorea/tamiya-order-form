import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

function formatDateOnly(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

window.setDateRange = function (type) {
  const now = new Date();
  const startInput = document.getElementById('start-date');
  const endInput = document.getElementById('end-date');
  let start, end;

  if (type === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (type === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
    end = new Date(now.getFullYear(), q * 3 + 3, 0);
  } else if (type === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
  }

  startInput.value = start.toISOString().slice(0, 10);
  endInput.value = end.toISOString().slice(0, 10);
};

window.loadAccountingData = async function () {
  const start = document.getElementById('start-date').value;
  const end = document.getElementById('end-date').value;
  const keyword = document.getElementById('search-name').value.trim().toLowerCase();
  const receiptOnly = document.getElementById('receipt-only').checked;

  if (!start || !end) {
    alert('기간을 모두 선택해주세요.');
    return;
  }

  const { data, error } = await supabase
    .from('orders')
    .select('order_id, name, email, created_at, payment_date, total, tracking_date, tracking_number, receipt_info, items')
    .eq('is_shipped', true)
    .eq('is_delivered', true)
    .not('tracking_date', 'is', null)  // ✅ 수정된 부분
    .gte('tracking_date', start)
    .lte('tracking_date', end);

  if (error) {
    alert('데이터 조회 실패: ' + error.message);
    return;
  }

  let filtered = data;
  if (keyword) {
    filtered = filtered.filter(order =>
      order.name?.toLowerCase().includes(keyword) ||
      order.email?.toLowerCase().includes(keyword)
    );
  }
  if (receiptOnly) {
    filtered = filtered.filter(order => order.receipt_info?.trim());
  }

  const tbody = document.getElementById('accounting-table-body');
  tbody.innerHTML = '';

  let totalAmount = 0;

  filtered.forEach(order => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.order_id}</td>
      <td><a href="#" onclick="showOrderDetails(${order.order_id})">${order.name}</a></td>
      <td>${formatDateOnly(order.created_at)}</td>
      <td>${order.payment_date ? formatDateOnly(order.payment_date) : '-'}</td>
      <td>₩${order.total.toLocaleString()}</td>
      <td>${order.receipt_info?.trim() ? '발행' : '-'}</td>
      <td>${order.tracking_number || '-'}</td>
    `;
    tbody.appendChild(row);
    totalAmount += order.total;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">검색 결과 없음</td></tr>';
  }

  const supplyPrice = Math.floor(totalAmount / 1.1);
  const vat = totalAmount - supplyPrice;

  document.getElementById('total').textContent = totalAmount.toLocaleString();
  document.getElementById('supply-price').textContent = supplyPrice.toLocaleString();
  document.getElementById('vat').textContent = vat.toLocaleString();
  document.getElementById('order-count').textContent = filtered.length.toLocaleString();

  window.currentAccountingData = filtered;
};

window.showOrderDetails = async function (orderId) {
  const { data, error } = await supabase.from('orders').select('items').eq('order_id', orderId).single();
  const modal = document.getElementById('order-modal');
  const content = document.getElementById('modal-content');
  if (error || !data) {
    content.textContent = '주문 정보를 불러올 수 없습니다.';
  } else {
    const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
    content.textContent = items.map(i => `${i.name} (${i.code}) × ${i.qty} = ₩${i.price.toLocaleString()}`).join('\n');
  }
  modal.style.display = 'block';
};

window.downloadAccountingExcel = function () {
  const data = window.currentAccountingData || [];
  if (data.length === 0) return alert('엑셀로 내보낼 데이터가 없습니다.');

  const rows = data.map(order => ({
    주문번호: order.order_id,
    주문자명: order.name,
    주문일자: formatDateOnly(order.created_at),
    입금일자: order.payment_date ? formatDateOnly(order.payment_date) : '-',
    총금액: order.total,
    공급가액: Math.floor(order.total / 1.1),
    부가세: order.total - Math.floor(order.total / 1.1),
    현금영수증: order.receipt_info?.trim() ? '발행' : '-',
    송장번호: order.tracking_number || ''
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, '회계자료');
  XLSX.writeFile(wb, '회계자료.xlsx');
};
