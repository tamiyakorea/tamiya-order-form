import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

const HIDDEN_COL_KEY = "orders_hidden_columns";

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

function applyHiddenColumns() {
  const hiddenCols = JSON.parse(localStorage.getItem(HIDDEN_COL_KEY) || "[]");
  const colgroup = document.querySelector("#colgroup");
  if (!colgroup) return;

  hiddenCols.forEach(index => {
    const ths = document.querySelectorAll(`[data-col-index='${index}']`);
    ths.forEach(th => th.style.display = 'none');

    const col = colgroup.querySelector(`col:nth-child(${index + 1})`);
    if (col) col.style.display = 'none';

    const rows = document.querySelectorAll("#orderTable tbody tr");
    rows.forEach(tr => {
      const td = tr.children[index];
      if (td) td.style.display = 'none';
    });
  });
}

function toggleColumn(index) {
  const hiddenCols = new Set(JSON.parse(localStorage.getItem(HIDDEN_COL_KEY) || "[]"));
  if (hiddenCols.has(index)) hiddenCols.delete(index);
  else hiddenCols.add(index);
  localStorage.setItem(HIDDEN_COL_KEY, JSON.stringify([...hiddenCols]));
  location.reload();
}

function resetHiddenColumns() {
  localStorage.removeItem(HIDDEN_COL_KEY);
  location.reload();
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/admin/login.html";
}

async function updateField(orderId, field, value) {
  const { error } = await supabase.from("orders").update({ [field]: value || null }).eq("order_id", orderId);
  if (error) alert("업데이트 실패: " + error.message);
}

async function togglePayment(orderId, current, button) {
  const row = button.closest('tr');
  const dateInput = row.querySelector('.payment-date');
  const selectedDate = dateInput?.value || getTodayDateString();

  const updates = {
    payment_confirmed: !current,
    payment_date: !current ? selectedDate : null
  };

  const { error } = await supabase.from("orders").update(updates).eq("order_id", orderId);
  if (error) {
    alert("입금 상태 업데이트 실패: " + error.message);
    return;
  }

  loadOrders();
}

async function markAsReadyToShip(orderId, btn) {
  const confirmed = confirm("이 주문을 배송 준비 상태로 이동하시겠습니까?");
  if (!confirmed) return;
  const { error } = await supabase.from("orders").update({ is_ready_to_ship: true }).eq("order_id", orderId);
  if (error) alert("업데이트 실패: " + error.message);
  else loadOrders();
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

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .or(`order_id.ilike.%${keyword}%,name.ilike.%${keyword}%`)
    .order("created_at", { ascending: false });

  if (error) {
    alert("주문 검색 중 오류 발생: " + error.message);
    return;
  }

  renderOrders(orders);
}

async function loadOrders() {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert("주문 불러오기 실패: " + error.message);
    return;
  }

  renderOrders(orders);
}

function renderOrders(orders) {
  const tbody = document.getElementById("orderBody");
  tbody.innerHTML = "";

  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="22">주문이 없습니다.</td></tr>';
    return;
  }

  orders.forEach(order => {
    const items = JSON.parse(order.items || '[]');

    items.forEach((item, idx) => {
      const isFirst = idx === 0;
      const row = document.createElement("tr");
      row.className = order.payment_confirmed ? "confirmed-row" : "";

      row.innerHTML = `
        ${isFirst ? `<td rowspan="${items.length}"><button class="delete-btn" onclick="deleteOrder(${order.order_id}, ${order.payment_confirmed})">삭제</button></td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}"><button class="proof-btn" onclick="window.open('/proof/${order.order_id}', '_blank')">파일</button></td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${formatDateOnly(order.created_at)}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.order_id}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.name}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.phone}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.email}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.zipcode}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.address}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.address_detail}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.receipt_info ? '신청' : '-'}</td>` : ''}
        <td>${item.code}</td>
        <td class="ellipsis">${item.name}</td>
        <td>${item.qty}</td>
        <td>${item.price.toLocaleString()}</td>
        ${isFirst ? `<td rowspan="${items.length}">₩${order.total.toLocaleString()}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">
          <div class="pay-status">
            <button onclick="togglePayment(${order.order_id}, ${order.payment_confirmed}, this)">
              ${order.payment_confirmed ? '✅ 입금확인됨' : '❌ 미입금'}
            </button><br/>
            <input type="date" class="payment-date" value="${order.payment_date ? formatDateInput(order.payment_date) : getTodayDateString()}" />
          </div>
        </td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}"><input class="input-box" value="${order.po_number || ''}" onchange="updateField(${order.order_id}, 'po_number', this.value)" /></td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}"><input class="input-box" value="${order.remarks || ''}" onchange="updateField(${order.order_id}, 'remarks', this.value)" /></td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}"><input class="input-box" value="${item.arrival_info || ''}" onchange="updateFieldByItem(${order.order_id}, ${idx}, 'arrival_info', this.value)" /></td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${item.arrival_due || '미정'}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}"><button class="ship-btn" onclick="markAsReadyToShip(${order.order_id}, this)">출고 준비</button></td>` : ''}
      `;

      tbody.appendChild(row);
    });
  });
}

function injectColgroup() {
  const colCount = document.querySelectorAll("thead tr:nth-child(2) th").length || 22;
  const colgroup = document.getElementById("colgroup");
  colgroup.innerHTML = "";
  for (let i = 0; i < colCount; i++) {
    const col = document.createElement("col");
    colgroup.appendChild(col);
  }
}

function makeColumnsResizable(table) {
  const cols = table.querySelectorAll("thead tr:nth-child(2) th");
  cols.forEach((th, index) => {
    const resizer = document.createElement("div");
    resizer.classList.add("resizer");
    th.appendChild(resizer);
    let x = 0, w = 0;

    resizer.addEventListener("mousedown", e => {
      x = e.clientX;
      const styles = window.getComputedStyle(th);
      w = parseInt(styles.width, 10);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    function onMouseMove(e) {
      const dx = e.clientX - x;
      th.style.width = `${w + dx}px`;
      table.querySelector(`colgroup col:nth-child(${index + 1})`).style.width = `${w + dx}px`;
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
  });
}

function updateFieldByItem(orderId, itemIndex, field, value) {
  supabase.from("orders").select("items").eq("order_id", orderId).single()
    .then(({ data, error }) => {
      if (error || !data) return alert("아이템 정보 조회 실패");
      const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
      if (!items[itemIndex]) return;
      items[itemIndex][field] = value;
      return supabase.from("orders").update({ items }).eq("order_id", orderId);
    })
    .then(({ error }) => {
      if (error) alert("업데이트 실패: " + error.message);
    });
}

function downloadSelectedOrders() {
  const checkedRows = [...document.querySelectorAll("#orderBody input[type='checkbox']:checked")].map(el => el.closest("tr"));
  if (!checkedRows.length) return alert("선택된 항목이 없습니다.");

  const headers = [...document.querySelectorAll("thead tr:nth-child(2) th")].map(th => th.textContent.trim());
  const rows = checkedRows.map(tr => {
    return [...tr.children].reduce((obj, td, idx) => {
      obj[headers[idx]] = td.innerText;
      return obj;
    }, {});
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "선택 주문");
  XLSX.writeFile(wb, `selected_orders_${getTodayDateString()}.xlsx`);
}

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    alert("접근 권한이 없습니다. 로그인 페이지로 이동합니다.");
    window.location.href = "/tamiya-order-form/admin/login.html";
  } else {
    loadOrders();
    applyHiddenColumns();
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
  downloadSelectedOrders,
  updateField,
  updateFieldByItem,
  togglePayment,
  markAsReadyToShip,
  toggleColumn,
  resetHiddenColumns
});
