import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

function formatDateOnly(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateInput(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function togglePayment(orderId, current, button) {
  const row = button.closest('tr');
  const dateInput = row.querySelector('.payment-date');
  const selectedDate = dateInput?.value || getTodayDateString();

  if (current) {
    // ✅ 입금 확인 상태 → 다시 미확인 상태로 변경
    const { error } = await supabase.from("orders").update({
      payment_confirmed: false,
      payment_date: null
    }).eq("order_id", orderId);

    if (error) {
      alert("입금 상태 해제 실패: " + error.message);
    } else {
      loadOrders();
    }
  } else {
    // ✅ 입금 확인 처리
    const updates = {
      payment_confirmed: true,
      payment_date: selectedDate
    };
    const { error } = await supabase.from("orders").update(updates).eq("order_id", orderId);
    if (error) {
      alert("입금 상태 업데이트 실패: " + error.message);
      return;
    }
    loadOrders();
  }
}

async function updateField(orderId, field, value) {
  const { error } = await supabase
    .from("orders")
    .update({ [field]: value || null })
    .eq("order_id", orderId);

  if (error) {
    alert("업데이트 실패: " + error.message);
  } else {
    loadOrders(); // ✅ 즉시 화면 갱신
  }
}

async function updateFieldByItem(orderId, itemCode, field, value) {
  const { data: orderData } = await supabase.from("orders").select("*").eq("order_id", orderId).single();
  if (!orderData || !orderData.items) return;
  const items = Array.isArray(orderData.items) ? orderData.items : JSON.parse(orderData.items);
  const updatedItems = items.map(i => {
    if (String(i.code) === String(itemCode)) {
      const updated = Object.assign({}, i);
      updated[field] = value || null;
      return updated;
    }
    return i;
  });
  const { error } = await supabase.from("orders").update({ items: JSON.stringify(updatedItems) }).eq("order_id", orderId);
  if (error) alert("항목 업데이트 실패: " + error.message);
}

async function deleteOrder(orderId, isPaid) {
  if (isPaid) {
    alert("입금 확인된 주문은 삭제할 수 없습니다.");
    return;
  }
  const confirmDelete = confirm("정말 이 주문을 삭제하시겠습니까?");
  if (!confirmDelete) return;
  const { error } = await supabase.from("orders").delete().eq("order_id", orderId);
  if (error) alert("삭제 중 오류 발생: " + error.message);
  else loadOrders();
}

async function searchOrders() {
  const keyword = document.getElementById("searchInput").value.trim();
  if (!keyword) return loadOrders();

  let query = supabase.from("orders").select("*").eq("is_ready_to_ship", false).eq("is_ordered", false);

  if (/^\d+$/.test(keyword)) {
    query = query.eq("order_id", keyword);
  } else {
    query = query.ilike("name", `%${keyword}%`);
  }

  const { data, error } = await query;
  if (!error) renderOrders(data);
  else alert("검색 실패: " + error.message);
}

async function loadOrders() {
  console.log("🔍 데이터 로딩 중...");
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("is_ready_to_ship", false)
    .eq("is_ordered", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ 데이터 로딩 실패:", error.message);
    alert("주문 목록 불러오기 실패: " + error.message);
    return;
  }

  console.log("✅ 불러온 데이터:", data);
  renderOrders(data);
}

function injectColgroup() {
  const colgroup = document.getElementById("colgroup");
  if (!colgroup) return;
  colgroup.innerHTML = '';
  
  for (let i = 1; i <= 18; i++) {
    const col = document.createElement("col");
    colgroup.appendChild(col);
  }
} 

function renderOrders(data) {
  const tbody = document.getElementById("orderBody");
  tbody.innerHTML = "";
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="17">주문 내역이 없습니다.</td></tr>';
    return;
  }

  data.forEach(order => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
    const paymentDateInput = order.payment_date ? formatDateInput(order.payment_date) : getTodayDateString();

    const proofButtons = (order.proof_images || [])
      .filter(url => typeof url === 'string' && url.startsWith('http'))
      .map((url, index) => `<a href="${url}" target="_blank" download><button class="proof-btn">🔍︎</button></a>`)
      .join(" ");

    items.forEach((item, idx) => {
      const isFirstRow = idx === 0;
      const rowClass = [
        isFirstRow ? 'order-separator' : '',
        order.payment_confirmed ? 'confirmed-row' : '',
        order.confirmation_note ? 'confirmation-warning' : ''
      ].join(' ');

      const rowHtml = `
  <tr class="${rowClass}">
    ${isFirstRow ? `
      <td rowspan="${items.length}">
        <button class="delete-btn" onclick="deleteOrder('${order.order_id}', ${order.payment_confirmed})">삭제</button>
        <br>
        <input type="checkbox" class="download-checkbox" data-order-id="${order.order_id}">
      </td>
      <td rowspan="${items.length}">${proofButtons}</td>
      <td rowspan="${items.length}">${formatDateOnly(order.created_at)}</td>
      <td rowspan="${items.length}">${order.order_id}</td>
      <td rowspan="${items.length}">${order.name}</td>
      <td rowspan="${items.length}">${order.phone}</td>
      <td rowspan="${items.length}" title="${order.email}">${order.email}</td>
      <td rowspan="${items.length}">${order.zipcode}</td>
      <td rowspan="${items.length}">${order.address}</td>
      <td rowspan="${items.length}">${order.address_detail}</td>
      <td rowspan="${items.length}">${order.receipt_info || ''}</td>
    ` : ''}
    <td>${item.code || '-'}</td>
    <td class="ellipsis" title="${item.name}">${item.name}</td>
    <td>${item.qty}</td>
    <td>₩${item.price ? item.price.toLocaleString() : '-'}</td>
    ${isFirstRow ? `
      <td rowspan="${items.length}">₩${order.total.toLocaleString()}</td>
      <td rowspan="${items.length}" class="pay-status">
  <input type="date" class="payment-date" value="${paymentDateInput}" style="width: 120px; margin-bottom: 4px;"><br>
  <div style="display: flex; gap: 6px; align-items: center;">
    <button onclick="togglePayment('${order.order_id}', ${order.payment_confirmed}, this)">
      ${order.payment_confirmed ? '입금 확인됨' : '입금 확인'}
    </button>
    ${order.payment_confirmed ? `
      <button onclick="markAsOrdered('${order.order_id}')">✔</button>
    ` : ''}
  </div>
  ${order.payment_date ? formatDateOnly(order.payment_date) : ''}
</td>
     <td rowspan="${items.length}">
  <select class="input-box" onchange="updateField('${order.order_id}', 'confirmation_note', this.value)">
    <option value="">-</option>
    <option ${order.confirmation_note === '첨부된 구매증빙이 유효하지 않습니다.' ? 'selected' : ''}>첨부된 구매증빙이 유효하지 않습니다.</option>
    <option ${order.confirmation_note === '주소가 올바르지 않습니다.' ? 'selected' : ''}>주소가 올바르지 않습니다.</option>
    <option ${order.confirmation_note === '입금정보 불일치(고객센터로 문의)' ? 'selected' : ''}>입금정보 불일치(고객센터로 문의)</option>
    <option ${order.confirmation_note === '기타 사유(고객센터로 문의)' ? 'selected' : ''}>기타 사유(고객센터로 문의)</option>
  </select>
</td> 
      <td rowspan="${items.length}">
        <input class="input-box" value="${order.remarks || ''}" onchange="updateField('${order.order_id}', 'remarks', this.value)" />
      </td>
    ` : ''}
  </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', rowHtml);
    });
  });
}

async function markAsOrdered(orderId) {
  const confirmProceed = confirm("발주 완료 처리하시겠습니까?");
  if (!confirmProceed) return;

  const { error } = await supabase.from("orders").update({ is_ordered: true }).eq("order_id", orderId);
  if (error) {
    alert("발주 완료 처리 실패: " + error.message);
  } else {
    alert("발주 완료 처리되었습니다.");
    loadOrders();
  }
}

async function downloadSelectedOrders() {
  const checkboxes = document.querySelectorAll('.download-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('다운로드할 주문을 선택하세요.');
    return;
  }

  const selectedOrderIds = Array.from(checkboxes).map(cb => cb.dataset.orderId);
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .in("order_id", selectedOrderIds);

  if (error || !orders) {
    alert("❌ 주문 데이터 불러오기 실패: " + (error?.message || ''));
    return;
  }

  const rows = orders.flatMap(order => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    return items.map(item => ({
      주문번호: order.order_id,
      고객명: order.name,
      상품명: item.name,
      수량: item.qty,
      단가: item.price,
      총금액: order.total
    }));
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "선택주문");
  XLSX.writeFile(workbook, "selected_orders.xlsx");
}

async function checkAuth() {
  console.log("🔍 인증 체크 시작");
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log("🔎 인증 세션:", session);
    
    if (error) {
      console.error("❌ 인증 세션 오류:", error.message);
    }

    if (!session) {
      console.log("❌ 인증 실패: 세션이 없습니다.");
      alert("접근 권한이 없습니다. 로그인 페이지로 이동합니다.");
      window.location.href = "/tamiya-order-form/admin/login.html";
    } else {
      console.log("✅ 인증 성공, 데이터 로딩 시작");
      loadOrders();
    }
  } catch (err) {
    console.error("❌ 인증 체크 중 오류 발생:", err);
  }
}

// ✅ 주문 수정 기능 시작

function openEditOrderModal() {
  const checked = [...document.querySelectorAll('.download-checkbox:checked')];
  if (checked.length !== 1) {
    alert("수정할 주문 1개만 선택해주세요.");
    return;
  }

  const orderId = checked[0].dataset.orderId;
  supabase.from("orders").select("*").eq("order_id", orderId).single().then(({ data, error }) => {
    if (error || !data) return alert("주문 정보를 불러오지 못했습니다.");

    document.getElementById("editOrderId").value = data.order_id;
    document.getElementById("editName").value = data.name || "";
    document.getElementById("editPhone").value = data.phone || "";
    document.getElementById("editEmail").value = data.email || "";
    document.getElementById("editZipcode").value = data.zipcode || "";
    document.getElementById("editAddress").value = data.address || "";
    document.getElementById("editAddressDetail").value = data.address_detail || "";
    document.getElementById("editRemarks").value = data.remarks || "";
    document.getElementById("editTotal").value = data.total || 0;
    document.getElementById("editStaffDiscount").checked = false;

    document.getElementById("editOrderModal").style.display = "block";
  });
}

function confirmEditSave() {
  document.getElementById("editConfirmModal").style.display = "block";
}

function cancelEdit() {
  document.getElementById("editConfirmModal").style.display = "none";
}

async function applyOrderEdit() {
  const orderId = document.getElementById("editOrderId").value;
  const name = document.getElementById("editName").value.trim();
  const phone = document.getElementById("editPhone").value.trim();
  const email = document.getElementById("editEmail").value.trim();
  const zipcode = document.getElementById("editZipcode").value.trim();
  const address = document.getElementById("editAddress").value.trim();
  const addressDetail = document.getElementById("editAddressDetail").value.trim();
  const remarks = document.getElementById("editRemarks").value.trim();
  let total = Number(document.getElementById("editTotal").value);
  const staffDiscount = document.getElementById("editStaffDiscount").checked;

  const deliveryFee = total < 30000 ? 3000 : 0;

  if (staffDiscount) {
    const discountBase = total - deliveryFee;
    total = Math.round(discountBase * 0.9);
  }

  const { error } = await supabase.from("orders").update({
    name,
    phone,
    email,
    zipcode,
    address,
    address_detail: addressDetail,
    remarks,
    total
  }).eq("order_id", orderId);

  if (error) {
    alert("수정 실패: " + error.message);
  } else {
    alert("✅ 수정 완료");
    document.getElementById("editOrderModal").style.display = "none";
    document.getElementById("editConfirmModal").style.display = "none";
    loadOrders();
  }
}


window.addEventListener("DOMContentLoaded", () => {
  console.log("🌐 DOMContentLoaded 이벤트 발생!"); // ✅ 정상 출력됨
  console.log("🛡️ checkAuth() 호출 시작");       // ✅ 호출 시작 체크
  checkAuth();

  // ✅ 버튼 이벤트 리스너 등록
  document.querySelector("button[onclick*='searchOrders']")?.addEventListener("click", searchOrders);
  document.querySelector("button[onclick*='loadOrders']")?.addEventListener("click", loadOrders);
  document.querySelector("button[onclick*='downloadSelectedOrders']")?.addEventListener("click", downloadSelectedOrders);
});


Object.assign(window, {
  logout,
  searchOrders,
  loadOrders,
  deleteOrder,
  downloadSelectedOrders,
  updateField,
  updateFieldByItem,
  togglePayment,
  markAsOrdered // ✅ 추가
});
