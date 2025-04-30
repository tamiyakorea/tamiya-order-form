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

function formatDateInput(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    alert("접근 권한이 없습니다. 로그인 페이지로 이동합니다.");
    window.location.href = "/tamiya-order-form/admin/login.html";
  } else {
    loadOrdered();
  }
}

async function loadOrdered() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("is_ordered", true)
    .eq("is_ready_to_ship", false)
    .order("created_at", { ascending: false });

  if (error) {
    alert("불러오기 실패: " + error.message);
    return;
  }

  renderOrdered(data);
}

function renderOrdered(data) {
  const tbody = document.getElementById("orderedBody");
  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="15">발주 완료된 주문이 없습니다.</td></tr>';
    return;
  }

  data.forEach(order => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
    const paymentDate = order.payment_date ? formatDateOnly(order.payment_date) : '';

    items.forEach((item, idx) => {
      const isFirst = idx === 0;
      const row = document.createElement("tr");
      row.innerHTML = `
        ${isFirst ? `<td rowspan="${items.length}"><button class="delete-btn" onclick="deleteOrdered('${order.order_id}')">삭제</button></td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${formatDateOnly(order.created_at)}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.order_id}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${paymentDate}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.name}</td>` : ''}
        <td>${item.code}</td>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>₩${item.price.toLocaleString()}</td>
        ${isFirst ? `<td rowspan="${items.length}">₩${order.total.toLocaleString()}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}"><input class="input-box" value="${order.po_info || ''}" onchange="updateField('${order.order_id}', 'po_info', this.value)" /></td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}"><input class="input-box" value="${order.remarks || ''}" onchange="updateField('${order.order_id}', 'remarks', this.value)" /></td>` : ''}
        <td><input class="input-box" value="${item.arrival_status || ''}" onchange="updateItemField('${order.order_id}', '${item.code}', 'arrival_status', this.value)" /></td>
        <td><input class="input-box" value="${item.arrival_due || ''}" onchange="updateItemField('${order.order_id}', '${item.code}', 'arrival_due', this.value)" /></td>
        ${isFirst ? `<td rowspan="${items.length}"><button class="ship-btn" onclick="moveToShipping('${order.order_id}')">배송관리로 이동</button></td>` : ''}
      `;
      tbody.appendChild(row);
    });
  });
}

async function updateField(orderId, field, value) {
  const { error } = await supabase.from("orders").update({ [field]: value || null }).eq("order_id", orderId);
  if (error) alert("업데이트 실패: " + error.message);
}

async function updateItemField(orderId, itemCode, field, value) {
  const { data } = await supabase.from("orders").select("items").eq("order_id", orderId).single();
  if (!data || !data.items) return;

  const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
  const updated = items.map(i => {
    if (String(i.code) === String(itemCode)) {
      return { ...i, [field]: value || null };
    }
    return i;
  });

  const { error } = await supabase.from("orders").update({ items: JSON.stringify(updated) }).eq("order_id", orderId);
  if (error) alert("항목 업데이트 실패: " + error.message);
}

async function deleteOrdered(orderId) {
  const confirmDelete = confirm("이 주문을 삭제하고 주문관리로 되돌리시겠습니까?");
  if (!confirmDelete) return;

  const { error } = await supabase.from("orders").update({ is_ordered: false }).eq("order_id", orderId);
  if (error) alert("삭제 실패: " + error.message);
  else loadOrdered();
}

async function moveToShipping(orderId) {
  const confirmMove = confirm("배송관리 탭으로 이동하시겠습니까?");
  if (!confirmMove) return;

  const { error } = await supabase.from("orders").update({ is_ready_to_ship: true }).eq("order_id", orderId);
  if (error) alert("이동 실패: " + error.message);
  else loadOrdered();
}

async function searchOrdered() {
  const keyword = document.getElementById("searchInput").value.trim();
  if (!keyword) return loadOrdered();

  let query = supabase.from("orders").select("*").eq("is_ordered", true).eq("is_ready_to_ship", false);

  if (/^\d+$/.test(keyword)) {
    query = query.eq("order_id", keyword);
  } else {
    query = query.ilike("name", `%${keyword}%`);
  }

  const { data, error } = await query;
  if (!error) renderOrdered(data);
  else alert("검색 실패: " + error.message);
}

window.addEventListener("load", checkAuth);

Object.assign(window, {
  updateField,
  updateItemField,
  deleteOrdered,
  moveToShipping,
  searchOrdered,
  loadOrdered
});
