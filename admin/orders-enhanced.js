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

  const updates = current
    ? { payment_confirmed: false, payment_date: null }
    : { payment_confirmed: true, payment_date: selectedDate };

  const { error } = await supabase.from("orders").update(updates).eq("order_id", orderId);
  if (error) {
    alert("입금 상태 업데이트 실패: " + error.message);
  } else {
    loadOrders();
  }
}

function renderOrders(data) {
  const tbody = document.getElementById("orderBody");
  tbody.innerHTML = "";
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="18">주문 내역이 없습니다.</td></tr>';
    return;
  }

  data.forEach(order => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
    const paymentDateInput = order.payment_date ? formatDateInput(order.payment_date) : getTodayDateString();

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
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}">
              <button class="delete-btn" onclick="deleteOrder('${order.order_id}', ${order.payment_confirmed})">삭제</button>
              <br>
              <input type="checkbox" class="download-checkbox" data-order-id="${order.order_id}">
            </td>
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}">${formatDateOnly(order.created_at)}</td>
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}">${order.order_id}</td>
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}">${order.name}</td>
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}">
              <button class="proof-btn" onclick="showModal('전화번호', \`${order.phone || ''}\`)">확인</button>
            </td>
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}">
              <button class="proof-btn" onclick="showModal('이메일', \`${order.email || ''}\`)">확인</button>
            </td>
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}">${order.zipcode}</td>
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}" class="address-cell">${order.address}</td>
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}" class="address-detail-cell">${order.address_detail}</td>
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}">
              <button class="proof-btn" onclick="showModal('현금영수증', \`${order.receipt_info || ''}\`)">확인</button>
            </td>
          ` : ''}
          <td>${item.code || '-'}</td>
          <td class="ellipsis" title="${item.name}">${item.name}</td>
          <td>${item.qty}</td>
          <td>₩${item.price ? item.price.toLocaleString() : '-'}</td>
          ${isFirstRow ? `
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}">₩${order.total.toLocaleString()}</td>
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}" class="pay-status">
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
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}">
              <select class="input-box" onchange="updateField('${order.order_id}', 'confirmation_note', this.value)">
                <option value="">-</option>
                <option ${order.confirmation_note === '첨부된 구매증빙이 유효하지 않습니다.' ? 'selected' : ''}>첨부된 구매증빙이 유효하지 않습니다.</option>
                <option ${order.confirmation_note === '주소가 올바르지 않습니다.' ? 'selected' : ''}>주소가 올바르지 않습니다.</option>
                <option ${order.confirmation_note === '입금정보 불일치(고객센터로 문의)' ? 'selected' : ''}>입금정보 불일치(고객센터로 문의)</option>
                <option ${order.confirmation_note === '기타 사유(고객센터로 문의)' ? 'selected' : ''}>기타 사유(고객센터로 문의)</option>
              </select>
            </td>
            <td rowspan="${items.length + (order.total < 30000 ? 1 : 0)}">
              <input class="input-box" value="${order.remarks || ''}" onchange="updateField('${order.order_id}', 'remarks', this.value)" />
            </td>
          ` : ''}
        </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', rowHtml);
    });

    // 🚚 배송비 행 추가
    if (order.total < 30000) {
      const deliveryRow = `
        <tr class="${order.payment_confirmed ? 'confirmed-row' : ''}">
          <td colspan="4" style="text-align:right; font-weight:bold;">배송비</td>
          <td>₩3,000</td>
        </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', deliveryRow);
    }
  });
}


async function updateField(orderId, field, value) {
  const { error } = await supabase.from("orders").update({ [field]: value || null }).eq("order_id", orderId);
  if (error) alert("업데이트 실패: " + error.message);
  else loadOrders();
}

async function updateFieldByItem(orderId, itemCode, field, value) {
  const { data: orderData } = await supabase.from("orders").select("*").eq("order_id", orderId).single();
  if (!orderData || !orderData.items) return;
  const items = typeof orderData.items === 'string' ? JSON.parse(orderData.items) : orderData.items;
  const updatedItems = items.map(i =>
    String(i.code) === String(itemCode) ? { ...i, [field]: value || null } : i
  );
  const { error } = await supabase.from("orders").update({ items: JSON.stringify(updatedItems) }).eq("order_id", orderId);
  if (error) alert("항목 업데이트 실패: " + error.message);
}

async function deleteOrder(orderId, isPaid) {
  if (isPaid) return alert("입금 확인된 주문은 삭제할 수 없습니다.");
  if (!confirm("정말 이 주문을 삭제하시겠습니까?")) return;
  const { error } = await supabase.from("orders").delete().eq("order_id", orderId);
  if (error) alert("삭제 중 오류 발생: " + error.message);
  else loadOrders();
}

async function searchOrders() {
  const keyword = document.getElementById("searchInput").value.trim();
  if (!keyword) return loadOrders();

  let query = supabase.from("orders").select("*").eq("is_ready_to_ship", false).eq("is_ordered", false);
  query = /^\d+$/.test(keyword)
    ? query.eq("order_id", keyword)
    : query.ilike("name", `%${keyword}%`);

  const { data, error } = await query;
  if (!error) renderOrders(data);
  else alert("검색 실패: " + error.message);
}

async function loadOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("is_ready_to_ship", false)
    .eq("is_ordered", false)
    .order("created_at", { ascending: false });

  if (error) {
    alert("주문 목록 불러오기 실패: " + error.message);
    return;
  }
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

function showModal(title, content) {
  console.log('[DEBUG] showModal 호출됨:', title, content);
  document.querySelector('.popup-modal')?.remove(); // 기존 팝업 모달 제거

  const modal = document.createElement("div");
  modal.className = "popup-modal";
  modal.innerHTML = `
    <div class="popup-modal-content">
      <h3>${title}</h3>
      <p>${content || '(비어있음)'}</p>
      <div style="text-align: right; margin-top: 20px;">
        <button onclick="this.closest('.popup-modal').remove()">닫기</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
window.showModal = showModal;

async function checkAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    alert("접근 권한이 없습니다. 로그인 페이지로 이동합니다.");
    window.location.href = "/tamiya-order-form/admin/login.html";
  } else {
    loadOrders();
  }
}

function openEditOrderModal() {
  const checked = [...document.querySelectorAll('.download-checkbox:checked')];
  if (checked.length !== 1) return alert("수정할 주문 1개만 선택해주세요.");

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
    document.getElementById("editReceiptInfo").value = data.receipt_info || "";
    document.getElementById("editStaffDiscount").checked = !!data.staff_discount;

    const itemsList = document.getElementById("editItemsList");
    itemsList.innerHTML = "";
    const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items || [];
    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "edit-item-row";
      row.innerHTML = `
        <input type="text" placeholder="시리얼" value="${item.code || ''}" class="editItemCode" style="width:80px;" />
        <input type="text" placeholder="상품명" value="${item.name || ''}" class="editItemName" style="width:200px;" />
        <input type="number" placeholder="수량" value="${item.qty || 1}" class="editItemQty" style="width:60px;" />
        <input type="number" placeholder="단가" value="${item.price || 0}" class="editItemPrice" style="width:80px;" />
        <button type="button" onclick="this.parentElement.remove()">❌</button>
      `;
      itemsList.appendChild(row);
    });

    document.getElementById("editOrderModal").classList.add("show");
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
  const receipt_info = document.getElementById("editReceiptInfo").value.trim();
  const staffDiscount = document.getElementById("editStaffDiscount").checked;

  const itemRows = document.querySelectorAll(".edit-item-row");
  const items = Array.from(itemRows).map(row => ({
    code: row.querySelector(".editItemCode").value.trim(),
    name: row.querySelector(".editItemName").value.trim(),
    qty: Number(row.querySelector(".editItemQty").value),
    price: Number(row.querySelector(".editItemPrice").value)
  }));

  let total = items.reduce((sum, i) => sum + (i.qty * i.price), 0);
  const deliveryFee = total < 30000 ? 3000 : 0;
  if (staffDiscount) total = Math.round((total - deliveryFee) * 0.9);

  const { error } = await supabase.from("orders").update({
    name, phone, email, zipcode, address,
    address_detail: addressDetail,
    remarks, receipt_info,
    items: JSON.stringify(items), total
  }).eq("order_id", orderId);

  if (error) alert("수정 실패: " + error.message);
  else {
    alert("✅ 수정 완료");
    document.getElementById("editOrderModal").style.display = "none";
    document.getElementById("editConfirmModal").style.display = "none";
    loadOrders();
  }
}


function addEditItem() {
  const row = document.createElement("div");
  row.className = "edit-item-row";
  row.innerHTML = `
    <input type="text" placeholder="시리얼" class="editItemCode" style="width:80px;" />
    <input type="text" placeholder="상품명" class="editItemName" style="width:200px;" />
    <input type="number" placeholder="수량" class="editItemQty" value="1" style="width:60px;" />
    <input type="number" placeholder="단가" class="editItemPrice" value="0" style="width:80px;" />
    <button type="button" onclick="this.parentElement.remove()">❌</button>
  `;
  document.getElementById("editItemsList").appendChild(row);
}

async function markAsOrdered(orderId) {
  if (!confirm("발주 완료 처리하시겠습니까?")) return;
  const { error } = await supabase.from("orders").update({ is_ordered: true }).eq("order_id", orderId);
  if (error) alert("발주 완료 실패: " + error.message);
  else {
    alert("발주 완료 처리되었습니다.");
    loadOrders();
  }
}

function logout() {
  supabase.auth.signOut().then(() => {
    window.location.href = "/tamiya-order-form/admin/login.html";
  }).catch(err => {
    alert("로그아웃 실패: " + err.message);
  });
}

async function downloadProductExcelFromServer() {
  const checkboxes = document.querySelectorAll('.download-checkbox:checked');
  const orderIds = Array.from(checkboxes).map(cb => cb.dataset.orderId);
  if (orderIds.length === 0) return alert("주문을 선택하세요.");

  const res = await fetch("http://localhost:3001/generate-excel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderIds)
  });

  if (!res.ok) {
    const errorText = await res.text();
    alert("❌ 주문서 생성 실패:\n" + errorText);
    return;
  }

  alert("✅ 주문서가 서버에 저장되었습니다 (output 폴더 확인).");
}


async function downloadSelectedOrders() {
  const checkboxes = document.querySelectorAll('.download-checkbox:checked');
  if (checkboxes.length === 0) return alert('다운로드할 주문을 선택하세요.');

  const selectedOrderIds = Array.from(checkboxes).map(cb => cb.dataset.orderId);
  const { data: orders, error } = await supabase.from("orders").select("*").in("order_id", selectedOrderIds);

  if (error || !orders) return alert("❌ 주문 데이터 불러오기 실패: " + (error?.message || ''));

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

window.addEventListener("DOMContentLoaded", () => {
  injectColgroup();  // ✅ 여기에 추가
  checkAuth();
});

Object.assign(window, {
  logout,
  searchOrders,
  loadOrders,
  deleteOrder,
  openEditOrderModal,
  downloadSelectedOrders,
  updateField,
  updateFieldByItem,
  confirmEditSave,
  applyOrderEdit,
  addEditItem,
  togglePayment,
  cancelEdit,
  markAsOrdered,
  downloadProductExcelFromServer,
  showModal  // ✅ 이 줄 추가!
});
