import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

let currentShippingOrderId = null;

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
    if (order.payment_confirmed) {
      row.style.backgroundColor = '#e0f8d8'; // 연두색
    }

    // ✅ 먼저 선언되어야 함!
    const paymentDateDisplay = order.payment_date
      ? `<div style="font-size: 0.8em; color: #555;">${order.payment_date.split('T')[0]}</div>`
      : '';

    row.innerHTML = `
      <td><button class="revert-btn" data-id="${order.order_id}">되돌리기</button></td>
      <td>${order.status_updated_at?.split('T')[0] || ''}</td>
      <td>${order.name}</td>
      <td>${order.shipping_invoice || ''}</td>
      <td>${order.receipt_code || ''}</td>
      <td>${order.phone || ''}</td>
      <td>${category || ''}</td>
      <td>${product || ''}</td>
      <td>${order.request_type || ''}</td>
      <td>${order.inspection_followup || ''}</td>
      <td><button onclick="showModal('고장증상', '${faultDesc}')">확인</button></td>
      <td><input type="text" value="${repairDetail}" data-id="${order.order_id}" class="repair-input" /></td>
      <td>
          <input type="text" value="${repairCost}" data-id="${order.order_id}" class="cost-input" />
            <button onclick="openCalcModal(this.previousElementSibling)">계산</button>
      </td>
      <td>${note}</td>
      <td>
        <button class="toggle-payment" data-id="${order.order_id}">
          ${order.payment_confirmed ? '확인됨' : '미확인'}
        </button>
        ${paymentDateDisplay}
      </td>
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
      await supabase.from('as_orders').update({ repair_detail: val }).eq('order_id', String(id));
    });
  });

  document.querySelectorAll('.cost-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const val = e.target.value;
      await supabase.from('as_orders').update({ repair_cost: val }).eq('order_id', String(id));
    });
  });

  document.querySelectorAll('.toggle-payment').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    const current = btn.textContent.trim();
    const confirmed = current === '확인됨' ? false : true;

    const update = {
      payment_confirmed: confirmed,
      payment_date: confirmed ? new Date().toISOString() : null
    };

    const { error } = await supabase
      .from('as_orders')
      .update(update)
      .eq('order_id', String(id));

    if (!error) {
      // 텍스트 변경
      btn.textContent = confirmed ? '확인됨' : '미확인';

      // 배경색 처리
      const row = btn.closest('tr');
      row.style.backgroundColor = confirmed ? '#e0f8d8' : '';

      // 기존 날짜 텍스트 제거
      const existingDate = btn.nextElementSibling;
      if (existingDate && existingDate.classList.contains('payment-date')) {
        existingDate.remove();
      }

      // 새로 날짜 추가
      if (confirmed) {
        const dateElem = document.createElement('div');
        dateElem.className = 'payment-date';
        dateElem.style.fontSize = '0.8em';
        dateElem.style.color = '#555';
        dateElem.textContent = new Date().toISOString().split('T')[0];
        btn.parentNode.appendChild(dateElem);
      }
    }
  });
});

  document.querySelectorAll('.complete-shipping').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openShippingModal(id);
    });
  });
}

// 모달 표시 함수
window.showModal = function (title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').textContent = content;
  document.getElementById('modal').style.display = 'block';
};

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('searchInput')?.addEventListener('keypress', e => {
  if (e.key === 'Enter') window.searchOrders?.();
});

let currentCostInput = null;

// 수리비 계산 모달 열기
function openCalcModal(inputElement) {
  currentCostInput = inputElement;
  document.getElementById("inputYen").value = '';
  document.getElementById("inputDateYen").valueAsDate = new Date();
  document.getElementById("inputRate").value = '10.0';
  document.getElementById("inputPrice").value = '';
  document.getElementById("inputMultiplier").value = '1.3';
  document.getElementById("calcModal").style.display = 'block';
}
window.openCalcModal = openCalcModal; // ✅ 전역 등록

function closeCalcModal() {
  currentCostInput = null;
  document.getElementById("calcModal").style.display = 'none';
}

document.getElementById('calcConfirmBtn').addEventListener('click', () => {
  const yen = parseFloat(document.getElementById("inputYen").value);
  const rate = parseFloat(document.getElementById("inputRate").value);
  const price = parseFloat(document.getElementById("inputPrice").value);
  const multiplier = parseFloat(document.getElementById("inputMultiplier").value);

  if (!yen || !rate || !price || !multiplier) {
    alert("모든 값을 정확히 입력해주세요.");
    return;
  }

  const cost = Math.min(price * 0.9, Math.max(30000, yen * rate * multiplier));
  if (currentCostInput) {
    currentCostInput.value = Math.round(cost);
    currentCostInput.dispatchEvent(new Event('change')); // 저장 trigger
  }

  closeCalcModal();
});

// 배송완료 모달 관련
function openShippingModal(orderId) {
  currentShippingOrderId = orderId;
  document.getElementById('inputInvoice').value = '';
  document.getElementById('inputDate').valueAsDate = new Date();
  document.getElementById('shippingModal').style.display = 'block';
}

function closeShippingModal() {
  currentShippingOrderId = null;
  document.getElementById('shippingModal').style.display = 'none';
}

document.getElementById('shippingConfirmBtn').addEventListener('click', async () => {
  const invoice = document.getElementById('inputInvoice').value.trim(); // 새 송장번호
  const date = document.getElementById('inputDate').value;

  if (!invoice || !date) {
    alert('송장번호와 날짜를 모두 입력해주세요.');
    return;
  }

  const { error } = await supabase
    .from('as_orders')
    .update({
      status: '처리완료',
      status_updated_at: new Date().toISOString(),
      shipped_at: date,
      delivery_invoice: invoice // ✅ 발송 INVOICE가 아닌 새로운 송장번호 컬럼에 저장
    })
    .eq('order_id', currentShippingOrderId);

  if (error) {
    alert('업데이트 중 오류가 발생했습니다.');
    console.error(error);
  } else {
    closeShippingModal();
    loadChargeOrders();
  }
});
