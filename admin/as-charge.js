// ✅ 전체 코드 - 수정 포함 완료

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
      row.style.backgroundColor = '#e0f8d8';
    }

    const paymentDateInput = order.payment_date
      ? `<br><input type="date" class="payment-date-input" data-id="${order.order_id}" value="${order.payment_date.split('T')[0]}" style="font-size:0.8em; margin-top:4px;" />`
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
      <td class="note-cell">${note}</td>
      <td>
        <button class="toggle-payment" data-id="${order.order_id}">
          ${order.payment_confirmed ? '확인됨' : '미확인'}
        </button>
        ${paymentDateInput}
      </td>
      <td><button class="complete-shipping" data-id="${order.order_id}">완료</button></td>
      <td>
        <button class="print-invoice" data-id="${order.order_id}">청구서 출력</button>
      </td>
    `;

    tbody.appendChild(row);
  }

  bindEvents();
}

function escapeQuotes(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\"/g, '\\"');
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

      const { error } = await supabase.from('as_orders').update(update).eq('order_id', id);

      if (!error) {
        btn.textContent = confirmed ? '확인됨' : '미확인';
        const row = btn.closest('tr');
        row.style.backgroundColor = confirmed ? '#e0f8d8' : '';

        const existingInput = btn.parentNode.querySelector('.payment-date-input');
        const existingBr = btn.parentNode.querySelector('br');
        if (existingInput) existingInput.remove();
        if (existingBr) existingBr.remove();

        if (confirmed) {
          const inputElem = document.createElement('input');
          inputElem.type = 'date';
          inputElem.className = 'payment-date-input';
          inputElem.style.fontSize = '0.8em';
          inputElem.style.marginTop = '4px';
          inputElem.dataset.id = id;
          inputElem.value = new Date().toISOString().split('T')[0];

          const br = document.createElement('br');
          btn.after(br, inputElem);

          inputElem.addEventListener('change', async (e) => {
            const newDate = e.target.value;
            if (!newDate) return;
            const { error } = await supabase.from('as_orders').update({ payment_date: newDate }).eq('order_id', id);
            if (error) {
              alert('날짜 저장 중 오류 발생');
              console.error(error);
            }
          });
        }
      }
    });
  });

  document.querySelectorAll('.payment-date-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const newDate = e.target.value;
      if (!newDate) return;
      const { error } = await supabase.from('as_orders').update({ payment_date: newDate }).eq('order_id', id);
      if (error) {
        alert('날짜 저장 중 오류 발생');
        console.error(error);
      }
    });
  });

  document.querySelectorAll('.complete-shipping').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openShippingModal(id);
    });
  });

document.querySelectorAll('.print-invoice').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    const { data, error } = await supabase.from('as_orders').select('*').eq('order_id', id).single();
    if (error || !data) {
      alert('주문 정보를 불러올 수 없습니다.');
      return;
    }

    const baseTotal = 30000;
    const baseCost = Math.round(baseTotal / 1.1); // 27273
    const baseVAT = baseTotal - baseCost;

    const extraCost = Math.round(Number(data.repair_cost) - baseTotal);
    const extraVAT = Math.round(extraCost * 0.1);
    const extraSupply = extraCost - extraVAT;

    const totalSupply = baseCost + extraSupply;
    const totalVAT = baseVAT + extraVAT;
    const totalCost = totalSupply + totalVAT;

    const popup = window.open('', '_blank', 'width=800,height=1000');
    
popup.document.write(
  <html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>SANWA A/S 수리비 청구서</title>
    <style>
      body { font-family: 'NanumGothic', sans-serif; padding: 24px; background: #f9f9f9; }
      .invoice-box { max-width: 750px; margin: auto; background: white; padding: 24px; box-shadow: 0 0 10px rgba(0,0,0,0.15); border-radius: 8px; }
      .logo-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .logo-row img { height: 40px; }
      h1 { text-align: center; font-size: 20pt; margin-bottom: 24px; color: #222; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th, td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
      th { background: #f0f0f0; text-align: left; }
      .section-title { font-weight: bold; background: #e6e6e6; padding: 6px 10px; margin-top: 20px; }
      .footer { margin-top: 20px; text-align: right; font-size: 10px; color: #666; }
      .bottom-logo { margin-top: 40px; text-align: center; }
      .bottom-logo img { height: 60px; margin-bottom: 8px; }
      .bottom-logo div { font-size: 16px; font-weight: bold; color: #222; }
      .print-btn { display: block; margin: 20px auto; padding: 10px 20px; font-size: 14px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; }
      .print-btn:hover { background: #45a049; }
      @media print { .print-btn { display: none; } }
    </style>
  </head>
  <body>
    <div class="invoice-box">
      <div class="logo-row">
        <img src="../images/logo.png" alt="Tamiya Logo" />
        <img src="../images/sanwa.png" alt="Sanwa Logo" />
      </div>
      <h1>SANWA A/S 수리비 청구서</h1>

      <div class="section-title">신청 정보 및 고객 정보</div>
      <table>
        <tr><th>신청일시</th><td>${data.created_at?.split('T')[0] || '-'}</td></tr>
        <tr><th>신청번호</th><td>${data.order_id}</td></tr>
        <tr><th>고객명</th><td>${data.name}</td></tr>
        <tr><th>연락처</th><td>${data.phone || '-'}</td></tr>
        <tr><th>이메일</th><td>${data.email || '-'}</td></tr>
        <tr><th>우편번호</th><td>${data.zipcode || '-'}</td></tr>
        <tr><th>주소</th><td>${data.address || '-'} ${data.address_detail || ''}</td></tr>
        <tr><th>신청종류</th><td>${data.request_type || '-'}</td></tr>
        <tr><th>수리여부</th><td>${data.inspection_followup || '-'}</td></tr>
      </table>

      <div class="section-title">제품 및 수리 정보</div>
      <table>
        <tr><th>제품명</th><td>${data.product_name || '-'}</td></tr>
        <tr><th>고장 증상</th><td>${extract(data.message, '고장증상') || '-'}</td></tr>
        <tr><th>수리 내역</th><td>${data.repair_detail || '-'}</td></tr>
      </table>

      <div class="section-title">수리 비용 내역</div>
      <table>
        <tr><th>항목</th><th>공급가</th><th>부가세</th></tr>
        <tr><td>기본 공임 비용</td><td>₩ ${baseCost.toLocaleString()}</td><td>₩ ${baseVAT.toLocaleString()}</td></tr>
        <tr><td>추가 수리 비용</td><td>₩ ${extraSupply.toLocaleString()}</td><td>₩ ${extraVAT.toLocaleString()}</td></tr>
        <tr><th>합계</th><th>₩ ${totalSupply.toLocaleString()}</th><th>₩ ${totalVAT.toLocaleString()}</th></tr>
        <tr><th colspan="2">총 청구 금액 (부가세 포함)</th><th>₩ ${totalCost.toLocaleString()}</th></tr>
      </table>

      <div class="section-title">입금 계좌 정보</div>
      <table>
        <tr><th>예금주</th><td>주식회사 한국키덜트하비</td></tr>
        <tr><th>은행 및 계좌번호</th><td>우리은행 / 1005-803-756392</td></tr>
      </table>

      <div class="footer">
        출력일: ${new Date().toLocaleDateString()}
      </div>

      <div class="bottom-logo">
        <img src="../images/TamiyaPlamodelFactory_black.png" alt="Kidult Hobby Logo" />
        <div>주식회사 한국키덜트하비</div>
      </div>
    </div>

    <button class="print-btn" onclick="window.print()">PDF 저장 또는 인쇄</button>
  </body>
  </html>
);
    popup.document.close();
  });
});
  
  
}

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

function openCalcModal(inputElement) {
  currentCostInput = inputElement;
  document.getElementById("inputYen").value = '';
  document.getElementById("inputDateYen").valueAsDate = new Date();
  document.getElementById("inputRate").value = '10.0';
  document.getElementById("inputPrice").value = '';
  document.getElementById("inputMultiplier").value = '1.3';
  document.getElementById("calcModal").style.display = 'block';
}
window.openCalcModal = openCalcModal;

function closeCalcModal() {
  currentCostInput = null;
  document.getElementById("calcModal").style.display = 'none';
}
window.closeCalcModal = closeCalcModal;

document.getElementById('calcConfirmBtn').addEventListener('click', () => {
  const yen = parseFloat(document.getElementById("inputYen").value);
  const rate = parseFloat(document.getElementById("inputRate").value);
  const price = parseFloat(document.getElementById("inputPrice").value);
  const multiplier = parseFloat(document.getElementById("inputMultiplier").value);

  if (!yen || !rate || !price || !multiplier) {
    alert("모든 값을 정확히 입력해주세요.");
    return;
  }

  const rawCost = Math.min(price * 0.9, Math.max(30000, yen * rate * multiplier));
  const roundedCost = Math.ceil(rawCost / 1000) * 1000;

  if (currentCostInput) {
    currentCostInput.value = roundedCost;
    currentCostInput.dispatchEvent(new Event('change'));
  }

  closeCalcModal();
});

function handleRateFix() {
  const input = document.getElementById("inputRate");
  const val = parseFloat(input.value);
  if (!isNaN(val) && val > 100) {
    input.value = (val / 100).toFixed(5);
  }
}

document.getElementById("inputRate").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleRateFix();
});

document.getElementById("inputRate").addEventListener("blur", handleRateFix);

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
  const invoice = document.getElementById('inputInvoice').value.trim();
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
      delivery_invoice: invoice
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


