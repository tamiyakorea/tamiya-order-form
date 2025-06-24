import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E' // ✅ 사용자 anon 키 입력
);

window.addEventListener('DOMContentLoaded', loadCompletedOrders);

async function loadCompletedOrders() {
  const { data, error } = await supabase
    .from('as_orders')
    .select('*')
    .eq('status', '처리완료')
    .order('status_updated_at', { ascending: false });

  if (error) {
    console.error('불러오기 오류:', error);
    return;
  }

  renderCompletedTable(data);
}

function renderCompletedTable(orders) {
  const tbody = document.getElementById('completedBody');
  tbody.innerHTML = '';

  for (const order of orders) {
    const [category, product] = (order.product_name || '').split(' > ');

    const fields = {
      phone: order.phone,
      email: order.email,
      category,
      product,
      request_type: order.request_type || '',
      inspection_followup: order.inspection_followup || '',
      fault_time: extract(order.message, '고장시기'),
      fault_desc: extract(order.message, '고장증상'),
      request: extract(order.message, '요청사항'),
      invoice: order.shipping_invoice,
      code: order.receipt_code,
      note: order.note,
      repair_detail: order.repair_detail,
      repair_cost: order.repair_cost,
      shipped_invoice: order.shipping_invoice,
      shipped_at: order.shipped_at?.split('T')[0] || ''
    };

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><button class="delete-btn" data-id="${order.order_id}">삭제</button></td>
      <td><button class="revert-btn" data-id="${order.order_id}">되돌리기</button></td>
      <td>${order.created_at?.split('T')[0]}</td>
      <td>${order.order_id}</td>
      <td>${order.name}</td>
      ${Object.entries(fields).map(([key, val]) =>
        `<td><button onclick="showModal('${getTitle(key)}', \`${escapeQuotes(val)}\`)">확인</button></td>`
      ).join('')}
    `;
    tbody.appendChild(row);
  }

  bindEvents();
}

function escapeQuotes(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/'/g, "\\'");
}

function extract(message, label) {
  if (!message) return '';
  const match = message.match(new RegExp(`${label}: ?([^\n]*)`));
  return match ? match[1].trim() : '';
}

function getTitle(field) {
  return {
    phone: '연락처',
    email: '이메일',
    category: '제품분류',
    product: '제품명',
    request_type: '신청종류', // ✅ 추가
    inspection_followup: '수리여부', // ✅ 추가
    fault_time: '고장시기',
    fault_desc: '고장증상',
    request: '요청사항',
    invoice: '발송INVOICE',
    code: '접수코드',
    note: '비고',
    repair_detail: '수리내역',
    repair_cost: '수리비용',
    shipped_invoice: '송장번호',
    shipped_at: '배송완료일'
  }[field] || field;
}

function bindEvents() {
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('정말 삭제하시겠습니까?')) return;
      const id = btn.dataset.id;
      await supabase.from('as_orders').delete().eq('order_id', id);
      loadCompletedOrders();
    });
  });

  document.querySelectorAll('.revert-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await supabase
        .from('as_orders')
        .update({ status: '청구대기', status_updated_at: new Date().toISOString() })
        .eq('order_id', id);
      loadCompletedOrders();
    });
  });
}

function openEditModal() {
  document.getElementById("editModal").style.display = "block";
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
}

window.showModal = function (title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').textContent = content;
  document.getElementById('modal').style.display = 'block';
};

document.getElementById('modal-close').onclick = () => {
  document.getElementById('modal').style.display = 'none';
};
