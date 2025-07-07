import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.5';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

let deliveredData = [];
let currentSort = { key: null, asc: true };

function formatDateOnly(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

async function returnToShipping(orderId) {
  const confirmBack = confirm("배송 관리 탭으로 다시 이동시키겠습니까?");
  if (!confirmBack) return;
  const { error } = await supabase.from('orders').update({ is_delivered: false }).eq('order_id', orderId);
  if (!error) loadDeliveredOrders();
}

async function loadDeliveredOrders() {
  const { data, error } = await supabase.from('orders').select('*').eq('is_delivered', true);
  if (error) {
    document.getElementById('delivered-table-body').innerHTML =
      `<tr><td colspan="7">오류 발생: ${error.message}</td></tr>`;
    return;
  }
  deliveredData = data || [];
  renderDeliveredTable(deliveredData);
}

function renderDeliveredTable(data) {
  const tbody = document.getElementById('delivered-table-body');
  tbody.innerHTML = "";

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7">배송 완료된 주문이 없습니다.</td></tr>`;
    return;
  }

  data.forEach(order => {
    let items;
    try {
      items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    } catch {
      items = [];
    }

    const shippedDate = formatDateOnly(order.tracking_date) || '-';

    const row = document.createElement('tr');
row.innerHTML = `
  <td><button onclick="returnToShipping(${order.order_id})">❌</button></td>
  <td>${shippedDate}</td>
  <td>${order.order_id}</td>
  <td><span class="detail-name">${order.name}</span></td>
  <td>${order.tracking_number || '-'}</td>
  <td class="note-cell">${order.remarks || '-'}</td>
  <td class="note-cell">${order.shipping_note || '-'}</td>
`;

    row.querySelector('.detail-name').addEventListener('click', () => {
      showOrderDetail({ order, items });
    });

    tbody.appendChild(row);
  });
}

function showOrderDetail({ order, items }) {
  const shippedDate = formatDateOnly(order.tracking_date) || '-';
  const itemDetails = items.map(item => {
    const priceStr = item.price ? item.price.toLocaleString() : '-';
    return `- [${item.code}] ${item.name} / 수량: ${item.qty} / 단가: \u20A9${priceStr}`;
  }).join('\n');

  const totalStr = order.total ? order.total.toLocaleString() : '-';

  const modalText = `
출고일: ${shippedDate}
주문번호: ${order.order_id}
고객명: ${order.name}
연락처: ${order.phone || '-'}
우편번호: ${order.zipcode || '-'}
주소: ${order.address || '-'}
상세주소: ${order.address_detail || '-'}

[주문 상품 목록]
${itemDetails}

총금액: \u20A9${totalStr}
송장번호: ${order.tracking_number || '-'}
비고: ${order.remarks || '-'}
배송비고: ${order.shipping_note || '-'}
  `;

  document.getElementById('modal-title').textContent = '주문 상세정보';
document.getElementById('modal-content').textContent = modalText;
document.getElementById('shippedModal').classList.add('show');

}

function sortTableBy(key) {
  if (!deliveredData.length) return;

  if (currentSort.key === key) {
    currentSort.asc = !currentSort.asc;
  } else {
    currentSort.key = key;
    currentSort.asc = true;
  }

  deliveredData.sort((a, b) => {
    let valA = a[key];
    let valB = b[key];

    if (key === 'tracking_date') {
      valA = new Date(valA);
      valB = new Date(valB);
    } else {
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
    }

    if (valA < valB) return currentSort.asc ? -1 : 1;
    if (valA > valB) return currentSort.asc ? 1 : -1;
    return 0;
  });

  updateSortIcons();
  renderDeliveredTable(deliveredData);
}

function updateSortIcons() {
  document.querySelectorAll('th[data-key]').forEach(th => {
    const key = th.dataset.key;
    if (key === currentSort.key) {
      th.querySelector('.sort-icon').textContent = currentSort.asc ? '🔼' : '🔽';
    } else {
      th.querySelector('.sort-icon').textContent = '⬍';
    }
  });
}

// 전역 등록
window.returnToShipping = returnToShipping;
window.sortTableBy = sortTableBy;
window.showOrderDetail = showOrderDetail;

document.addEventListener('DOMContentLoaded', loadDeliveredOrders);
