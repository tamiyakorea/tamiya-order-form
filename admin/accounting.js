import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

let currentSortKey = null;
let currentSortAsc = true;

function formatDateOnly(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function sortAccountingData(data, key, asc = true) {
  return data.slice().sort((a, b) => {
    let valA = a[key], valB = b[key];

    if (key === 'supply') valA = Math.floor(a.total / 1.1);
    if (key === 'vat') valA = a.total - Math.floor(a.total / 1.1);
    if (key === 'supply') valB = Math.floor(b.total / 1.1);
    if (key === 'vat') valB = b.total - Math.floor(b.total / 1.1);

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return asc ? -1 : 1;
    if (valA > valB) return asc ? 1 : -1;
    return 0;
  });
}

function renderAccountingTable(data) {
  const tbody = document.getElementById('accounting-table-body');
  tbody.innerHTML = '';

  let totalAmount = 0;

  data.forEach(order => {
    const supply = Math.floor(order.total / 1.1);
    const vat = order.total - supply;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.order_id}</td>
      <td><a href="#" onclick="showOrderDetails(${order.order_id})">${order.name}</a></td>
      <td>${formatDateOnly(order.created_at)}</td>
      <td>${order.payment_date ? formatDateOnly(order.payment_date) : '-'}</td>
      <td>₩${supply.toLocaleString()}</td>
      <td>₩${vat.toLocaleString()}</td>
      <td>₩${order.total.toLocaleString()}</td>
      <td>${order.tracking_date ? formatDateOnly(order.tracking_date) : '-'}</td>
      <td>${order.receipt_info?.trim() ? '발행' : '-'}</td>
      <td>${order.delivery_invoice || '-'}</td>
    `;
    tbody.appendChild(row);
    totalAmount += order.total;
  });

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10">검색 결과 없음</td></tr>';
  }

  const supplyPrice = Math.floor(totalAmount / 1.1);
  const vat = totalAmount - supplyPrice;

  document.getElementById('total').textContent = totalAmount.toLocaleString();
  document.getElementById('supply-price').textContent = supplyPrice.toLocaleString();
  document.getElementById('vat').textContent = vat.toLocaleString();
  document.getElementById('order-count').textContent = data.length.toLocaleString();
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
    .select('order_id, name, email, created_at, payment_date, total, tracking_date, delivery_invoice, receipt_info, items')
    .eq('is_shipped', true)
    .eq('is_delivered', true)
    .not('tracking_date', 'is', null)
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

  window.currentAccountingData = filtered;
  if (currentSortKey) {
    const sorted = sortAccountingData(filtered, currentSortKey, currentSortAsc);
    renderAccountingTable(sorted);
  } else {
    renderAccountingTable(filtered);
  }
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

  const rows = data.map(order => {
    const supply = Math.floor(order.total / 1.1);
    const vat = order.total - supply;
    return {
      주문번호: order.order_id,
      주문자명: order.name,
      주문일자: formatDateOnly(order.created_at),
      입금일자: order.payment_date ? formatDateOnly(order.payment_date) : '-',
      공급가액: supply,
      부가세: vat,
      총금액: order.total,
      출고일자: order.tracking_date ? formatDateOnly(order.tracking_date) : '-',
      현금영수증: order.receipt_info?.trim() ? '발행' : '-',
      송장번호: order.delivery_invoice || ''
    };
  });

  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, '회계자료');
  XLSX.writeFile(wb, '회계자료.xlsx');
};

window.onload = () => {
  document.getElementById('start-date').value = '2020-01-01';
  document.getElementById('end-date').value = new Date().toISOString().slice(0, 10);
  window.loadAccountingData();

  document.querySelectorAll('th[data-sort-key]').forEach(th => {
    th.style.cursor = 'pointer';
    const icon = document.createElement('span');
    icon.className = 'sort-icon';
    icon.style.marginLeft = '5px';
    th.appendChild(icon);

    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort-key');
      if (currentSortKey === key) {
        currentSortAsc = !currentSortAsc;
      } else {
        currentSortKey = key;
        currentSortAsc = true;
      }
      if (window.currentAccountingData) {
        const sorted = sortAccountingData(window.currentAccountingData, currentSortKey, currentSortAsc);
        renderAccountingTable(sorted);
      }
      document.querySelectorAll('.sort-icon').forEach(i => i.textContent = '');
      icon.textContent = currentSortAsc ? '▲' : '▼';
    });
  });
};
