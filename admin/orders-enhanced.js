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
    loadOrders();
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
  if (error) {
    alert("삭제 실패: " + error.message);
  } else {
    alert("삭제 완료");
    loadOrders();
  }
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

window.addEventListener("DOMContentLoaded", () => {
  console.log("🌐 DOMContentLoaded 이벤트 발생!");
  console.log("🛡️ checkAuth() 호출 시작");
  checkAuth();

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
  markAsOrdered
});

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
