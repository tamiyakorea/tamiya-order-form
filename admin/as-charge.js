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
    const faultDesc = escapeQuotes(extract(order.message, '고장증상'));
    const repairDetail = order.repair_detail || '';
    const repairCost = order.repair_cost || '';
    const note = order.note || '';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><button class="revert-btn" data-id="${order.order_id}">되돌리기</button></td>
      <td>${order.status_updated_at?.split('T')[0] || ''}</td>
      <td>${order.name}</td>
      <td>${order.shipping_invoice || ''}</td>
      <td>${order.receipt_code || ''}</td>
      <td>${order.phone || ''}</td>
      <td>${category || ''}</td>
      <td>${product || ''}</td>
      <td><button onclick="showModal('고장증상', '${faultDesc}')">확인</button></td>
      <td><input type="text" value="${repairDetail}" data-id="${order.order_id}" class="repair-input" /></td>
      <td><input type="text" value="${repairCost}" data-id="${order.order_id}" class="cost-input" /></td>
      <td>${note}</td>
      <td><button class="toggle-payment" data-id="${order.order_id}">${order.payment_confirmed ? '확인됨' : '미확인'}</button></td>
      <td><button class="complete-shipping" data-id="${order.order_id}">완료</button></td>
    `;
    tbody.appendChild(row);
  }

  bindEvents();
}

function escapeQuotes(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function extract(message, label) {
  if (!message) return '';
  const match = message.match(new RegExp(`${label}: ?([^\n]*)`));
  return match ? match[1].trim() : '';
}

function bindEvents() {
  document.querySelectorAll('.revert-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const { error } = await supabase
        .from('as_orders')
        .update({ status: '수리진행', status_updated_at: new Date().toISOString() })
        .eq('order_id', id);
      if (!error) loadChargeOrders();
    });
  });

  document.querySelectorAll('.repair-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const val = e.target.value;
      await supabase.from('as_orders').update({ repair_detail: val }).eq('order_id', id);
    });
  });

  document.querySelectorAll('.cost-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const val = e.target.value;
      await supabase.from('as_orders').update({ repair_cost: val }).eq('order_id', id);
    });
  });

  document.querySelectorAll('.note-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const val = e.target.value;
      await supabase.from('as_orders').update({ note: val }).eq('order_id', id);
    });
  });

  document.querySelectorAll('.toggle-payment').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const current = btn.textContent.trim();
      const confirmed = current === '확인됨' ? false : true;
      const { error } = await supabase.from('as_orders').update({ payment_confirmed: confirmed }).eq('order_id', id);
      if (!error) loadChargeOrders();
    });
  });

  document.querySelectorAll('.complete-shipping').forEach(btn => {
    btn.addEventListener('click', () => {
      alert('배송완료 처리는 별도 기능으로 추후 구현됩니다.');
    });
  });
}

// 모달 표시 함수
window.showModal = function (title, content) {
  document.getElementById('modal-Title').textContent = title;
  document.getElementById('modal-Content').textContent = content;
  document.getElementById('modal').style.display = 'block';
};
