import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

function formatDateOnly(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function getGroupKey(order) {
  return [order.name, order.phone, order.zipcode, order.address, order.address_detail].join('|');
}

function groupLeader(order, allOrders) {
  if (!order.is_merged) return false;
  const sameGroup = allOrders.filter(o => getGroupKey(o) === getGroupKey(order) && o.is_merged);
  const minId = Math.min(...sameGroup.map(o => o.order_id));
  return order.order_id === minId;
}

function groupMemberCount(order, allOrders) {
  return allOrders.filter(o => getGroupKey(o) === getGroupKey(order) && o.is_merged).length;
}

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  document.getElementById("download-selected").addEventListener("click", downloadExcel);
  document.getElementById("merge-shipping").addEventListener("click", handleMergeShipping);
});

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    alert("접근 권한이 없습니다. 로그인 페이지로 이동합니다.");
    window.location.href = "/tamiya-order-form/admin/login.html";
  } else {
    loadShippingOrders();
  }
}

async function updateGroupStatus(groupKey, updates) {
  const { data } = await supabase.from('orders').select('order_id').eq('is_merged', true);
  const group = data.filter(o => getGroupKey(o) === groupKey);
  const ids = group.map(o => o.order_id);
  await supabase.from('orders').update(updates).in('order_id', ids);
  loadShippingOrders();
}

async function markRefundedGroup(groupKey) {
  const now = new Date().toISOString();
  await updateGroupStatus(groupKey, { is_refunded: true, refunded_at: now });
}

async function unmarkRefundedGroup(groupKey) {
  const confirmCancel = confirm("환불 완료 상태를 취소하시겠습니까?");
  if (!confirmCancel) return;
  await updateGroupStatus(groupKey, { is_refunded: false, refunded_at: null });
}

async function markShipped(orderId, groupKey = null) {
  const ids = await getGroupedIds(orderId, groupKey);
  await supabase.from('orders').update({ is_shipped: true }).in('order_id', ids);
  loadShippingOrders();
}

async function markShippedGroup(groupKey) {
  await updateGroupStatus(groupKey, { is_shipped: true });
}

async function markRefunded(orderId, groupKey = null) {
  const now = new Date().toISOString();
  const ids = await getGroupedIds(orderId, groupKey);
  await supabase.from('orders').update({ is_refunded: true, refunded_at: now }).in('order_id', ids);
  loadShippingOrders();

async function markDelivered(orderId, groupKey = null) {
  const ids = await getGroupedIds(orderId, groupKey);
  await supabase.from('orders').update({ is_delivered: true }).in('order_id', ids);
  loadShippingOrders();
}

async function revertShippingGroup(groupKey) {
  await updateGroupStatus(groupKey, { is_shipped: false, is_delivered: false });
}

async function downloadExcel() {
  const selected = Array.from(document.querySelectorAll('.select-order:checked')).map(cb => cb.value);
  if (!selected.length) return alert("선택된 주문이 없습니다.");

  const { data, error } = await supabase.from('orders').select('*').in('order_id', selected);
  if (error || !data) return alert("엑셀 생성 실패");

  const rows = [];
  data.forEach(order => {
    const items = JSON.parse(order.items || '[]');
    const name = order.name;
    const phone = order.phone;
    const zip = order.zipcode;
    const addr = order.address;
    const detail = order.address_detail;
    const paidDate = order.payment_date ? formatDateOnly(order.payment_date) : '';
    const remark = `${paidDate.replace(/\./g, '').slice(2)} ${name} 개별주문`;

    let subtotal = 0;
    items.forEach(i => subtotal += i.qty * i.price);
    const finalTotal = subtotal < 30000 ? subtotal + 3000 : subtotal;

    items.forEach(i => {
      rows.push({
        고객명: name,
        연락처: phone,
        우편번호: zip,
        주소: addr,
        상세주소: detail,
        시리얼번호: i.code,
        아이템명: i.name,
        수량: i.qty,
        개별금액: i.price,
        총금액: finalTotal,
        입금확인일: paidDate,
        비고: remark,
        아이템비고: i.code
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '배송목록');
  XLSX.writeFile(wb, 'shipping_export.xls');
}

async function loadShippingOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('is_ready_to_ship', true)
    .eq('is_delivered', false);

  const tbody = document.getElementById("shipping-table-body");
  tbody.innerHTML = "";

  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="18">오류 발생: ${error.message}</td></tr>`;
    return;
  }

  data.sort((a, b) => {
    if (a.is_merged !== b.is_merged) return b.is_merged - a.is_merged;
    return a.order_id - b.order_id;
  });

  const groupMap = new Map();
  for (const order of data) {
    const key = getGroupKey(order);
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push(order);
  }

  const refundHandled = new Set();
  const shippedHandled = new Set();

  data.forEach(order => {
    const items = JSON.parse(order.items || '[]');
    const arrivalDue = items[0]?.arrival_due || '미정';
    const refund = order.refund_amount || 0;
    const groupKey = getGroupKey(order);
    const groupOrders = groupMap.get(groupKey);
    const groupRowspan = items.length * groupOrders.length;
    const isGroupLeader = groupLeader(order, data);
    const isFirstOrderInGroup = order.order_id === Math.min(...groupOrders.map(o => o.order_id));
    const isLastOrderInGroup = order.order_id === Math.max(...groupOrders.map(o => o.order_id));

    items.forEach((item, idx) => {
      const isFirst = idx === 0;
      const row = document.createElement("tr");

      if (order.is_merged) {
        row.classList.add('merged-order');
        if (isFirstOrderInGroup && idx === 0) row.classList.add('merged-top');
        if (isLastOrderInGroup && idx === items.length - 1) row.classList.add('merged-bottom');
      }

      row.innerHTML = `
        ${isFirst ? `<td rowspan="${items.length}">
          <button onclick="moveToOrderManagement('${order.order_id}')" style="color:red;font-weight:bold;border:none;background:none;cursor:pointer;">✖</button><br/>
          <input type="checkbox" class="select-order" value="${order.order_id}" />
        </td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${arrivalDue}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.order_id}
          ${order.is_merged ? `<div style="color:red; font-size:0.8em; cursor:pointer;" onclick="unmergeOrder('${order.order_id}')">합배송 처리됨 (클릭 시 취소)</div>` : ''}
        </td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.name}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.phone}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.zipcode}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.address}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.address_detail}</td>` : ''}
        <td>${item.code}</td>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>${item.price.toLocaleString()}</td>
        ${isFirst ? `<td rowspan="${items.length}">${order.total.toLocaleString()}</td>` : ''}

        ${
          isFirst && isGroupLeader && order.is_merged && !refundHandled.has(groupKey)
            ? (() => {
                refundHandled.add(groupKey);
                return `<td rowspan="${groupRowspan}">
                  <div><strong style="color:red;">₩${refund.toLocaleString()}</strong></div>
                  ${!order.is_refunded ? `<button onclick="markRefundedGroup('${groupKey}')">환불처리 완료</button>` : ''}
                  ${order.refunded_at ? `<div style="font-size:0.8em;color:gray;cursor:pointer;" onclick="unmarkRefundedGroup('${groupKey}')">${formatDateOnly(order.refunded_at)}</div>` : ''}
                </td>`;
              })()
            : isFirst ? `<td rowspan="${items.length}"></td>` : ''
        }

        ${
          isFirst && !shippedHandled.has(groupKey)
            ? (() => {
                shippedHandled.add(groupKey);
                return `<td rowspan="${items.length}">
                  <input class="input-box" value="${order.tracking_number || ''}" ${order.is_shipped ? 'disabled' : ''} onchange="updateTrackingNumber('${order.order_id}', this.value)" />
                  <div style="font-size: 0.85em; color: gray;">${formatDateOnly(order.tracking_date)}</div>
                </td>`;
              })()
            : ''
        }

        ${isFirst ? `<td rowspan="${items.length}">${order.remarks || ''}</td>` : ''}

        ${
          isFirst && !shippedHandled.has('note-' + groupKey)
            ? (() => {
                shippedHandled.add('note-' + groupKey);
                return `<td rowspan="${items.length}">
                  <input class="input-box" value="${order.shipping_note || ''}" ${order.is_shipped ? 'disabled' : ''} onchange="updateShippingNote('${order.order_id}', this.value)" />
                </td>`;
              })()
            : ''
        }

        ${
          isFirst && !shippedHandled.has('work-' + groupKey)
            ? (() => {
                shippedHandled.add('work-' + groupKey);
                return `<td rowspan="${items.length}">
                  ${
                    order.is_shipped
                      ? `<button onclick="markDeliveredGroup('${groupKey}')">배송 완료</button><br/>
                        <span style="color:red;font-size:0.8em;cursor:pointer;" onclick="revertShippingGroup('${groupKey}')">⟲ 되돌리기</span>`
                      : order.is_merged && !order.is_refunded && !isGroupLeader
                        ? `<button disabled>출고 완료 (환불 필요)</button>`
                        : `<button onclick="markShippedGroup('${groupKey}')">출고 완료</button>`
                  }
                </td>`;
              })()
            : ''
        }
      `;

      tbody.appendChild(row);
    });
  });
}

// 그룹 작업 함수들

async function handleMergeShipping() {
  const selectedIds = Array.from(document.querySelectorAll('.select-order:checked')).map(cb => Number(cb.value));
  if (selectedIds.length < 2) return alert("2개 이상 주문을 선택해야 합니다.");

  const { data, error } = await supabase.from('orders').select('*').in('order_id', selectedIds);
  if (error || !data) return alert("주문 데이터 로딩 실패");

  const groups = groupByCustomerInfo(data);
  if (!groups.length) return alert("고객정보가 일치하는 주문이 없습니다.");

  for (const group of groups) {
    const refund = calculateRefundAmount(group);
    const ids = group.map(o => o.order_id);
    await supabase.from('orders').update({ is_merged: true, refund_amount: refund }).in('order_id', ids);
  }

  alert("합배송 처리가 완료되었습니다.");
  loadShippingOrders();
}
async function revertShipping(orderId, groupKey = null) {
  const ids = await getGroupedIds(orderId, groupKey);
  await supabase.from('orders').update({ is_shipped: false, is_delivered: false }).in('order_id', ids);
  loadShippingOrders();
}

function groupByCustomerInfo(orders) {
  const map = new Map();
  for (const order of orders) {
    const key = getGroupKey(order);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(order);
  }
  return Array.from(map.values()).filter(group => group.length > 1);
}

function calculateRefundAmount(group) {
  let totalItems = 0, shippingPaid = 0;
  for (const order of group) {
    const items = JSON.parse(order.items || '[]');
    const itemTotal = items.reduce((sum, i) => sum + (i.qty * i.price), 0);
    const shipping = order.total - itemTotal;
    totalItems += itemTotal;
    if (shipping > 0) shippingPaid += shipping;
  }
  const needsShippingFee = totalItems < 30000 ? 3000 : 0;
  return Math.max(0, shippingPaid - needsShippingFee);
}

// 개별 주문 관리 함수 (move, unmerge, update input 등)
async function moveToOrderManagement(orderId) {
  if (confirm("이 주문을 배송관리에서 제외하고 주문관리로 이동하시겠습니까?")) {
    await supabase.from('orders').update({ is_ready_to_ship: false }).eq('order_id', orderId);
    loadShippingOrders();
  }
}

async function updateTrackingNumber(orderId, value) {
  const date = value ? new Date().toISOString() : null;
  await supabase.from('orders').update({ tracking_number: value || null, tracking_date: date }).eq('order_id', orderId);
}

async function markDeliveredGroup(groupKey) {
  await updateGroupStatus(groupKey, { is_delivered: true });
}

async function updateShippingNote(orderId, value) {
  await supabase.from('orders').update({ shipping_note: value || null }).eq('order_id', orderId);
}

async function unmergeOrder(orderId) {
  const confirmCancel = confirm("합배송 처리를 취소하시겠습니까?");
  if (!confirmCancel) return;

  const { data } = await supabase.from('orders').select('*').eq('order_id', orderId).limit(1);
  const groupKey = getGroupKey(data[0]);

  const groupOrders = await supabase.from('orders').select('order_id').eq('is_merged', true);
  const ids = groupOrders.data.filter(o => getGroupKey(o) === groupKey).map(o => o.order_id);

  await supabase.from('orders').update({
    is_merged: false,
    refund_amount: null,
    is_refunded: false,
    refunded_at: null
  }).in('order_id', ids);

  loadShippingOrders();
}

// 외부에서 접근 가능하도록 등록
window.markRefundedGroup = markRefundedGroup;
window.unmarkRefundedGroup = unmarkRefundedGroup;
window.markShippedGroup = markShippedGroup;
window.markDeliveredGroup = markDeliveredGroup;
window.revertShippingGroup = revertShippingGroup;

window.downloadExcel = downloadExcel;
window.markShipped = markShipped;
window.markDelivered = markDelivered;
window.revertShipping = revertShipping;   // ✅ 추가
window.moveToOrderManagement = moveToOrderManagement;
window.markRefunded = markRefunded;
window.unmarkRefunded = unmarkRefunded;
window.unmergeOrder = unmergeOrder;       // ✅ 추가
window.updateTrackingNumber = updateTrackingNumber;
window.updateShippingNote = updateShippingNote;
window.handleMergeShipping = handleMergeShipping;
