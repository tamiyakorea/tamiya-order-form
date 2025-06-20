import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'your-anon-key'
);

window.addEventListener('DOMContentLoaded', loadProgressOrders);

async function loadProgressOrders() {
  const { data, error } = await supabase
    .from('as_orders')
    .select('*')
    .not('status_updated_at', 'is', null)
    .order('status_updated_at', { ascending: false });

  if (error) {
    console.error('불러오기 오류:', error);
    return;
  }

  renderProgressTable(data);
}

function renderProgressTable(orders) {
  const tbody = document.getElementById('progressBody');
  tbody.innerHTML = '';
  for (const order of orders) {
    const row = document.createElement('tr');
    const [category, product] = (order.product_name || '').split(' > ');

    row.innerHTML = `
      <td>${order.status_updated_at?.split('T')[0] || ''}</td>
      <td>${order.name}</td>
      <td>${order.phone}</td>
      <td>${category || ''}</td>
      <td>${product || ''}</td>
      <td>${extract(order.message, '고장시기')}</td>
      <td>${extract(order.message, '고장증상')}</td>
      <td>${extract(order.message, '요청사항')}</td>
      <td><input type="text" value="${order.receipt_code || ''}" data-id="${order.order_id}" class="receipt-code-input" /></td>
      <td><input type="text" value="${order.note || ''}" data-id="${order.order_id}" class="note-input" /></td>
      <td>
        <button class="process-btn" data-id="${order.order_id}">
          ${order.processing_date ? '입고완료' : '입고처리'}
        </button>
        <div class="process-date" data-id="${order.order_id}">
          ${order.processing_date ? formatDate(order.processing_date) : ''}
        </div>
      </td>
    `;
    tbody.appendChild(row);
  }

  // 이벤트 바인딩
  bindUpdateEvents();
}

function extract(message, label) {
  if (!message) return '';
  const match = message.match(new RegExp(`${label}: ?([^\n]*)`));
  return match ? match[1].trim() : '';
}

function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

function bindUpdateEvents() {
  document.querySelectorAll('.receipt-code-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const orderId = e.target.dataset.id;
      const value = e.target.value;
      await supabase.from('as_orders').update({ receipt_code: value }).eq('order_id', orderId);
    });
  });

  document.querySelectorAll('.note-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const orderId = e.target.dataset.id;
      const value = e.target.value;
      await supabase.from('as_orders').update({ note: value }).eq('order_id', orderId);
    });
  });

  document.querySelectorAll('.process-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      const currentDate = new Date().toISOString();

      const currentText = btn.textContent;
      const newDate = currentText === '입고처리' ? currentDate : null;

      const { error } = await supabase.from('as_orders').update({ processing_date: newDate }).eq('order_id', orderId);
      if (!error) loadProgressOrders();
    });
  });
}
