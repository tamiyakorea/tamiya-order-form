import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

window.addEventListener('DOMContentLoaded', loadProgressOrders);

async function loadProgressOrders() {
  const { data, error } = await supabase
    .from('as_orders')
    .select('*')
    .eq('status', '수리진행')
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
    const faultDate = extract(order.message, '고장시기');
    const faultDesc = escapeQuotes(extract(order.message, '고장증상'));
    const request = escapeQuotes(extract(order.message, '요청사항'));

    const faultDescBtn = `<button onclick="showModal('고장증상', '${faultDesc}')">확인</button>`;
    const requestBtn = `<button onclick="showModal('요청사항', '${request}')">확인</button>`;

    row.innerHTML = `
      <td><button class="revert-btn" data-id="${order.order_id}">되돌리기</button></td>
      <td>${order.status_updated_at?.split('T')[0] || ''}</td>
      <td>${order.name}</td>
      <td>${order.phone}</td>
      <td>${category || ''}</td>
      <td>${product || ''}</td>
      <td>${faultDate}</td>
      <td>${faultDescBtn}</td>
      <td>${requestBtn}</td>
      <td><input type="text" value="${order.shipping_invoice || ''}" data-id="${order.order_id}" class="invoice-input" /></td>
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

  bindUpdateEvents();
}

function escapeQuotes(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
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

  document.querySelectorAll('.invoice-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const orderId = e.target.dataset.id;
      const value = e.target.value;
      await supabase.from('as_orders').update({ shipping_invoice: value }).eq('order_id', orderId);
    });
  });

  document.querySelectorAll('.revert-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      const { error } = await supabase
        .from('as_orders')
        .update({ status: '접수대기', status_updated_at: null })
        .eq('order_id', orderId);

      if (!error) loadProgressOrders();
    });
  });

  document.querySelectorAll('.process-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      const currentText = btn.textContent.trim();

      if (currentText === '입고처리') {
        const { error } = await supabase.from('as_orders')
          .update({
            status: '청구대기',
            status_updated_at: new Date().toISOString(),
            processing_date: new Date().toISOString()
          })
          .eq('order_id', orderId);

        if (!error) loadProgressOrders();
      } else {
        const { error } = await supabase.from('as_orders')
          .update({
            status: '수리진행',
            status_updated_at: new Date().toISOString(),
            processing_date: null
          })
          .eq('order_id', orderId);

        if (!error) loadProgressOrders();
      }
    });
  });
}

window.showModal = function (title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalContent').textContent = content;
  document.getElementById('modal').style.display = 'block';
};

document.getElementById('modalClose')?.addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});
