import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

window.addEventListener('DOMContentLoaded', loadChargeOrders);

async function loadChargeOrders() {
  const { data, error } = await supabase
    .from('as_orders')
    .select('*')
    .eq('status', '청구대기')
    .order('status_updated_at', { ascending: false });

  if (error) {
    console.error('불러오기 오류:', error);
    return;
  }

  renderChargeTable(data);
}

function renderChargeTable(orders) {
  const tbody = document.getElementById('chargeBody');
  tbody.innerHTML = '';

  for (const order of orders) {
    const [category, product] = (order.product_name || '').split(' > ');

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><button class="revert-btn" data-id="${order.order_id}">되돌리기</button></td>
      <td>${order.status_updated_at?.split('T')[0] || ''}</td>
      <td>${order.name}</td>
      <td><input type="text" class="invoice-input" data-id="${order.order_id}" value="${order.shipping_invoice || ''}" /></td>
      <td><input type="text" class="receipt-input" data-id="${order.order_id}" value="${order.receipt_code || ''}" /></td>
      <td>${order.phone}</td>
      <td>${category || ''} / ${product || ''}</td>
      <td><button onclick="showModal('고장증상', '${escapeQuotes(extract(order.message, '고장증상'))}')">확인</button></td>
      <td><input type="text" class="repair-input" data-id="${order.order_id}" value="${order.repair_content || ''}" /></td>
      <td><input type="text" class="cost-input" data-id="${order.order_id}" value="${order.repair_cost || ''}" /></td>
      <td><input type="text" class="note-input" data-id="${order.order_id}" value="${order.note || ''}" /></td>
      <td><button class="toggle-paid-btn" data-id="${order.order_id}">${order.is_paid ? '입금확인됨' : '입금확인'}</button></td>
      <td><button class="complete-btn" data-id="${order.order_id}">배송완료</button></td>
    `;
    tbody.appendChild(row);
  }

  bindEvents();
}

function extract(message, label) {
  if (!message) return '';
  const match = message.match(new RegExp(`${label}: ?([^\n]*)`));
  return match ? match[1].trim() : '';
}

function escapeQuotes(str) {
  return String(str || '').replace(/'/g, "\'").replace(/"/g, '\"');
}

function bindEvents() {
  document.querySelectorAll('.revert-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      await supabase.from('as_orders').update({ status: '수리진행', status_updated_at: new Date().toISOString() }).eq('order_id', orderId);
      loadChargeOrders();
    });
  });

  document.querySelectorAll('.invoice-input, .receipt-input, .repair-input, .cost-input, .note-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const { classList, dataset, value } = e.target;
      const orderId = dataset.id;
      const columnMap = {
        'invoice-input': 'shipping_invoice',
        'receipt-input': 'receipt_code',
        'repair-input': 'repair_content',
        'cost-input': 'repair_cost',
        'note-input': 'note'
      };
      const column = [...classList].find(c => columnMap[c]);
      if (column) {
        await supabase.from('as_orders').update({ [columnMap[column]]: value }).eq('order_id', orderId);
      }
    });
  });

  document.querySelectorAll('.toggle-paid-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      const isPaid = btn.textContent.includes('확인됨');
      await supabase.from('as_orders').update({ is_paid: !isPaid }).eq('order_id', orderId);
      loadChargeOrders();
    });
  });

  document.querySelectorAll('.complete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      await supabase.from('as_orders').update({ status: '배송완료', status_updated_at: new Date().toISOString() }).eq('order_id', orderId);
      loadChargeOrders();
    });
  });
}

// 모달 함수
window.showModal = function (title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalContent').textContent = content;
  document.getElementById('modal').style.display = 'block';
};

document.getElementById('modalClose').onclick = function () {
  document.getElementById('modal').style.display = 'none';
};

window.onclick = function (event) {
  if (event.target.id === 'modal') {
    document.getElementById('modal').style.display = 'none';
  }
};
