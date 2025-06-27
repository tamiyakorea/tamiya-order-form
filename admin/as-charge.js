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
        <button class="generate-pdf" data-id="${order.order_id}">청구서 PDF</button>
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

pdfMake.fonts = {
  NanumMyeongjo: {
    normal: 'NanumMyeongjo.ttf',
    bold: 'NanumMyeongjoExtraBold.ttf',
    italics: 'NanumMyeongjo.ttf',         // 기울임 없는 경우 일반체로 대체
    bolditalics: 'NanumMyeongjoExtraBold.ttf'  // 없으면 Bold로 대체
  }
};

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

document.querySelectorAll('.generate-pdf').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    const { data, error } = await supabase.from('as_orders').select('*').eq('order_id', id).single();
    if (error || !data) {
      alert('주문 정보를 불러올 수 없습니다.');
      return;
    }

    const docDefinition = {
      content: [
        { text: 'SANWA A/S 수리비 청구서', style: 'header' },
        { text: '\n' },
        { text: `고객명: ${data.name}` },
        { text: `접수코드: ${data.receipt_code || '-'}` },
        { text: `제품명: ${data.product_name || '-'}` },
        { text: `고장 증상: ${extract(data.message, '고장증상')}` },
        { text: `수리 내역: ${data.repair_detail || '-'}` },
        { text: `\n수리 비용: ₩ ${Number(data.repair_cost).toLocaleString()} (부가세 포함)` },
        { text: '\n\n※ 본 수리비는 부가세 포함 금액입니다.', style: 'footer' }
      ],
      styles: {
        header: { fontSize: 18, bold: true, alignment: 'center' },
        footer: { fontSize: 10, color: 'gray', alignment: 'right' }
      },
      defaultStyle: {
        font: 'NanumMyeongjo',
      }
    };

    pdfMake.createPdf(docDefinition).download(`A-S-청구서-${data.order_id}.pdf`);
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


