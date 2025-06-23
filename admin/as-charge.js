// 📦 Supabase 클라이언트 설정
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

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><button onclick="revertToProgress('${order.order_id}')">되돌리기</button></td>
      <td>${order.status_updated_at?.split('T')[0] || ''}</td>
      <td>${order.name}</td>
      <td><input type="text" value="${order.shipping_invoice || ''}" data-id="${order.order_id}" class="invoice-input" /></td>
      <td><input type="text" value="${order.receipt_code || ''}" data-id="${order.order_id}" class="receipt-code-input" /></td>
      <td>${order.phone}</td>
      <td>${category || ''}</td>
      <td>${product || ''}</td>
      <td><button onclick="showModal('고장증상', '${faultDesc}')">확인</button></td>
      <td><input type="text" value="${order.repair_detail || ''}" data-id="${order.order_id}" class="repair-detail-input" /></td>
      <td><input type="number" value="${order.repair_cost || ''}" data-id="${order.order_id}" class="repair-cost-input" /></td>
      <td><input type="text" value="${order.note || ''}" data-id="${order.order_id}" class="note-input" /></td>
      <td><button class="toggle-charge" data-id="${order.order_id}">${order.charge_status === '입금완료' ? '입금완료 ✅' : '입금대기'}</button></td>
      <td><button onclick="markComplete('${order.order_id}')">배송완료</button></td>
    `;
    tbody.appendChild(row);
  }

  bindChargeEvents();
}

function extract(msg, field) {
  if (!msg) return '';
  const match = msg.match(new RegExp(`${field}: ?([^\n]*)`));
  return match ? match[1].trim() : '';
}

function escapeQuotes(str) {
  return String(str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function bindChargeEvents() {
  document.querySelectorAll('.invoice-input').forEach(input => {
    input.addEventListener('change', async e => {
      const { id, value } = { id: e.target.dataset.id, value: e.target.value };
      await supabase.from('as_orders').update({ shipping_invoice: value }).eq('order_id', id);
    });
  });
  document.querySelectorAll('.receipt-code-input').forEach(input => {
    input.addEventListener('change', async e => {
      const { id, value } = { id: e.target.dataset.id, value: e.target.value };
      await supabase.from('as_orders').update({ receipt_code: value }).eq('order_id', id);
    });
  });
  document.querySelectorAll('.repair-detail-input').forEach(input => {
    input.addEventListener('change', async e => {
      const { id, value } = { id: e.target.dataset.id, value: e.target.value };
      await supabase.from('as_orders').update({ repair_detail: value }).eq('order_id', id);
    });
  });
  document.querySelectorAll('.repair-cost-input').forEach(input => {
    input.addEventListener('change', async e => {
      const { id, value } = { id: e.target.dataset.id, value: Number(value) };
      await supabase.from('as_orders').update({ repair_cost: value }).eq('order_id', id);
    });
  });
  document.querySelectorAll('.note-input').forEach(input => {
    input.addEventListener('change', async e => {
      const { id, value } = { id: e.target.dataset.id, value: e.target.value };
      await supabase.from('as_orders').update({ note: value }).eq('order_id', id);
    });
  });
  document.querySelectorAll('.toggle-charge').forEach(button => {
    button.addEventListener('click', async e => {
      const orderId = e.target.dataset.id;
      const newStatus = e.target.textContent.includes('입금완료') ? '입금대기' : '입금완료';
      const now = newStatus === '입금완료' ? new Date().toISOString() : null;
      await supabase.from('as_orders').update({ charge_status: newStatus, charge_updated_at: now }).eq('order_id', orderId);
      loadChargeOrders();
    });
  });
}

window.revertToProgress = async function(orderId) {
  await supabase.from('as_orders').update({ status: '수리진행', status_updated_at: new Date().toISOString() }).eq('order_id', orderId);
  loadChargeOrders();
};

window.markComplete = async function(orderId) {
  await supabase.from('as_orders').update({ status: '청구완료', status_updated_at: new Date().toISOString() }).eq('order_id', orderId);
  loadChargeOrders();
};
