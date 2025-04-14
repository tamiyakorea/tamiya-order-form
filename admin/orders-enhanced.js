// /tamiya-order-form/admin/orders-enhanced.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

function formatDateOnly(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/tamiya-order-form/admin/login.html";
}

async function updateField(orderId, field, value) {
  await supabase.from("orders").update({ [field]: value || null }).eq("order_id", orderId);
}

async function togglePayment(orderId, current) {
  const updates = {
    payment_confirmed: !current,
    payment_date: !current ? new Date().toISOString() : null
  };
  await supabase.from("orders").update(updates).eq("order_id", orderId);
  loadOrders();
}

async function markAsReadyToShip(orderId, btn) {
  const confirmed = confirm("이 주문을 배송 준비 상태로 이동하시겠습니까?");
  if (!confirmed) return;
  await supabase.from("orders").update({ is_ready_to_ship: true }).eq("order_id", orderId);
  loadOrders();
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

  let query = supabase.from("orders").select("*").eq("is_ready_to_ship", false);

  if (/^\d+$/.test(keyword)) {
    query = query.eq("order_id", keyword);
  } else {
    query = query.ilike("name", `%${keyword}%`);
  }

  const { data, error } = await query;
  if (!error) renderOrders(data);
}

async function loadOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("is_ready_to_ship", false)
    .order("created_at", { ascending: false });

  if (!error) renderOrders(data);
}

function renderOrders(data) {
  const tbody = document.getElementById("orderBody");
  tbody.innerHTML = "";
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="21">주문 내역이 없습니다.</td></tr>';
    return;
  }
  data.forEach(order => {
    const items = JSON.parse(order.items || "[]");
    items.forEach((i, idx) => {
      const isFirstRow = idx === 0;
      const rowClass = `${isFirstRow ? 'order-separator' : ''} ${order.payment_confirmed ? 'confirmed-row' : ''}`;
      tbody.innerHTML += `
        <tr class="${rowClass}">
          ${isFirstRow ? `
            <td rowspan="${items.length}"><button class="delete-btn" onclick="deleteOrder(${order.order_id}, ${order.payment_confirmed})">삭제</button></td>
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
          <td>${i.code || '-'}</td>
          <td class="ellipsis" title="${i.name}">${i.name}</td>
          <td>${i.qty}</td>
          <td>₩${i.price ? i.price.toLocaleString() : '-'}</td>
          ${isFirstRow ? `
            <td rowspan="${items.length}">₩${order.total.toLocaleString()}</td>
            <td rowspan="${items.length}" class="pay-status">
              <button onclick="togglePayment(${order.order_id}, ${order.payment_confirmed})">
                ${order.payment_confirmed ? '입금 확인' : '입금 전'}
              </button><br>
              ${order.payment_date ? formatDateOnly(order.payment_date) : ''}
            </td>
            <td rowspan="${items.length}"><input class="input-box" value="${order.po_info || ''}" onchange="updateField(${order.order_id}, 'po_info', this.value)" /></td>
            <td rowspan="${items.length}"><input class="input-box" value="${order.remarks || ''}" onchange="updateField(${order.order_id}, 'remarks', this.value)" /></td>
          ` : ''}
          <td><input class="input-box" value="${i.arrival_status || ''}" onchange="updateFieldByItem(${order.order_id}, '${i.code}', 'arrival_status', this.value)" /></td>
          <td><input class="input-box" value="${i.arrival_due || ''}" onchange="updateFieldByItem(${order.order_id}, '${i.code}', 'arrival_due', this.value)" /></td>
          ${isFirstRow ? `
            <td rowspan="${items.length}"><button class="ship-btn" onclick="markAsReadyToShip(${order.order_id}, this)" ${order.is_ready_to_ship ? 'disabled' : ''}>준비</button></td>
          ` : ''}
        </tr>
      `;
    });
  });
}

async function updateFieldByItem(orderId, itemCode, field, value) {
  const { data: orderData } = await supabase.from("orders").select("*").eq("order_id", orderId).single();
  if (!orderData || !orderData.items) return;
  const items = JSON.parse(orderData.items);
  const updatedItems = items.map(i => String(i.code) === String(itemCode) ? { ...i, [field]: value || null } : i);
  await supabase.from("orders").update({ items: JSON.stringify(updatedItems) }).eq("order_id", orderId);
}

function injectColgroup() {
  const colgroup = document.getElementById("colgroup");
  colgroup.innerHTML = '';
  for (let i = 1; i <= 21; i++) {
    const col = document.createElement("col");
    colgroup.appendChild(col);
  }
}

function makeColumnsResizable(table) {
  const ths = table.querySelectorAll("thead tr:nth-child(1) th, thead tr:nth-child(2) th");
  ths.forEach((th, index) => {
    const resizer = document.createElement("div");
    resizer.className = "resizer";
    th.appendChild(resizer);
    resizer.addEventListener("mousedown", function (e) {
      e.preventDefault();
      const startX = e.pageX;
      const startWidth = th.offsetWidth;
      const onMouseMove = e => {
        const newWidth = startWidth + (e.pageX - startX);
        th.style.width = newWidth + "px";
        const col = document.querySelector(`#colgroup col:nth-child(${index + 1})`);
        if (col) col.style.width = newWidth + "px";
      };
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  });
}

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    alert("접근 권한이 없습니다. 로그인 페이지로 이동합니다.");
    window.location.href = "/tamiya-order-form/admin/login.html";
  } else {
    loadOrders();
  }
}

window.addEventListener("load", () => {
  injectColgroup();
  makeColumnsResizable(document.querySelector("table"));
  checkAuth();
});

Object.assign(window, {
  logout,
  searchOrders,
  loadOrders,
  deleteOrder,
  updateField,
  updateFieldByItem,
  togglePayment,
  markAsReadyToShip
});
