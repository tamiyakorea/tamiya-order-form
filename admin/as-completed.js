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
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><button class="delete-btn" data-id="${order.order_id}">삭제</button></td>
      <td><button class="revert-btn" data-id="${order.order_id}">되돌리기</button></td>
      <td>${order.created_at?.split('T')[0]}</td>
      <td>${order.order_id}</td>
      <td><button class="detail-btn" data-order='${JSON.stringify(order).replace(/'/g, '&apos;')}'>${order.name}</button></td>
      <td>${order.phone || '-'}</td>
      <td>${order.shipping_invoice || '-'}</td>
      <td>${order.delivery_invoice || '-'}</td>
      <td>${order.shipped_at?.split('T')[0] || '-'}</td>
    `;
    tbody.appendChild(row);
  }

  // ✅ 버튼 바인딩은 DOM 삽입 후에!
  document.querySelectorAll('.detail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const order = JSON.parse(btn.dataset.order.replace(/&apos;/g, "'"));
      const [category, product] = (order.product_name || '').split(' > ');
      const fields = {
        '연락처': order.phone || '',
        '이메일': order.email || '',
        '제품분류': category || '',
        '제품명': product || '',
        '신청종류': order.request_type || '',
        '수리여부': order.inspection_followup || '',
        '고장시기': extract(order.message, '고장시기'),
        '고장증상': extract(order.message, '고장증상'),
        '요청사항': extract(order.message, '요청사항'),
        '발송INVOICE': order.shipping_invoice || '',
        '접수코드': order.receipt_code || '',
        '비고': order.note || '',
        '수리내역': order.repair_detail || '',
        '수리비용': order.repair_cost || '',
        '송장번호': order.delivery_invoice || '',
        '출고완료일': order.shipped_at?.split('T')[0] || ''
      };

      const content = Object.entries(fields)
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n');

      showModal('상세정보', content);
    });
  });

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
