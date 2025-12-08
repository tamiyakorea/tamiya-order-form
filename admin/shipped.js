import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.46.1/+esm';

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
  <td><input type="checkbox" class="row-checkbox" value="${order.order_id}"></td>
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
  const totalStr = order.total ? order.total.toLocaleString() : '-';

  
  const infoHTML = `
    <div class="field"><div class="field-label">출고일</div><div>${shippedDate}</div></div>
    <div class="field"><div class="field-label">주문번호</div><div>${order.order_id}</div></div>
    <div class="field"><div class="field-label">고객명</div><div>${order.name}</div></div>
    <div class="field"><div class="field-label">연락처</div><div>${order.phone || '-'}</div></div>
    <div class="field"><div class="field-label">우편번호</div><div>${order.zipcode || '-'}</div></div>
    <div class="field"><div class="field-label">주소</div><div>${order.address || '-'}</div></div>
    <div class="field"><div class="field-label">상세주소</div><div>${order.address_detail || '-'}</div></div>
    <div class="field"><div class="field-label">총금액</div><div>₩${totalStr}</div></div>
    <div class="field"><div class="field-label">송장번호</div><div>${order.tracking_number || '-'}</div></div>
    <div class="field"><div class="field-label">비고</div><div>${order.remarks || '-'}</div></div>
    <div class="field"><div class="field-label">배송 비고</div><div>${order.shipping_note || '-'}</div></div>
    <div class="field"><div class="field-label">현금영수증</div><div>${order.receipt_info || '-'}</div></div>
  `;
  document.getElementById('order-info-section').innerHTML = infoHTML;

  
  const itemsHTML = items.map(item => {
    const priceStr = item.price ? item.price.toLocaleString() : '-';
    return `
      <tr>
        <td>${item.code}</td>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>₩${priceStr}</td>
      </tr>
    `;
  }).join('');
  document.getElementById('order-items-body').innerHTML = itemsHTML;

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

async function deleteSelectedOrders() {
  const checkboxes = document.querySelectorAll('.row-checkbox:checked');
  if (!checkboxes.length) {
    alert("삭제할 주문을 선택하세요.");
    return;
  }

  const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
  const confirmDelete = confirm(`선택하신 ${ids.length}개를 정말로 삭제하시겠습니까?`);
  if (!confirmDelete) return;

  const { error } = await supabase.from('orders').delete().in('order_id', ids);
  if (error) {
    alert("삭제 중 오류 발생: " + error.message);
    return;
  }

  alert(`${ids.length}개의 주문이 삭제되었습니다.`);
  loadDeliveredOrders();
}

// 전역 등록
window.returnToShipping = returnToShipping;
window.sortTableBy = sortTableBy;
window.showOrderDetail = showOrderDetail;

document.addEventListener('DOMContentLoaded', loadDeliveredOrders);
document.addEventListener('DOMContentLoaded', () => {
  loadDeliveredOrders();
  document.getElementById('delete-selected-btn').addEventListener('click', deleteSelectedOrders);
});

