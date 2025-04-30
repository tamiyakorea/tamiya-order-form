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
  // 기존에는 고객 정보만으로 groupKey 생성
  if (!order.is_merged) return `single-${order.order_id}`; // ✅ is_merged가 false인 경우 고유 키 반환
  return [order.name, order.phone, order.zipcode, order.address, order.address_detail].join('|');
}

async function getGroupedIds(orderId, groupKey) {
  if (!groupKey) {
    const { data } = await supabase.from('orders').select('*').eq('order_id', orderId).limit(1);
    if (!data || data.length === 0) return [orderId];
    groupKey = getGroupKey(data[0]);
  }
  const { data } = await supabase.from('orders').select('order_id').eq('is_merged', true);
  return data.filter(o => getGroupKey(o) === groupKey).map(o => o.order_id);
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

async function unmarkRefunded(orderId, groupKey = null) {
  const confirmCancel = confirm("환불 완료 상태를 취소하시겠습니까?");
  if (!confirmCancel) return;
  const ids = await getGroupedIds(orderId, groupKey);
  await supabase.from('orders').update({ is_refunded: false, refunded_at: null }).in('order_id', ids);
  loadShippingOrders();
}

async function updateGroupStatus(groupKey, updates) {
  console.log("[DEBUG] updateGroupStatus groupKey:", groupKey, "updates:", updates);
  const { data } = await supabase.from('orders').select('*').eq('is_merged', true);
  const group = data.filter(o => getGroupKey(o) === groupKey);
  console.log("[DEBUG] matching group size:", group.length);
  const ids = group.map(o => o.order_id);
  await supabase.from('orders').update(updates).in('order_id', ids);
  loadShippingOrders();
}


async function markRefundedGroup(groupKey) {
  const now = new Date().toISOString();
  if (groupKey.startsWith("single-")) {
    const orderId = parseInt(groupKey.replace("single-", ""));
    await supabase.from('orders').update({ is_refunded: true, refunded_at: now }).eq('order_id', orderId);
  } else {
    await updateGroupStatus(groupKey, { is_refunded: true, refunded_at: now });
  }
  loadShippingOrders();
}


async function unmarkRefundedGroup(groupKey) {
  const confirmCancel = confirm("환불 완료 상태를 취소하시겠습니까?");
  if (!confirmCancel) return;

  if (groupKey.startsWith("single-")) {
    const orderId = parseInt(groupKey.replace("single-", ""));
    await supabase.from('orders').update({ is_refunded: false, refunded_at: null }).eq('order_id', orderId);
  } else {
    await updateGroupStatus(groupKey, { is_refunded: false, refunded_at: null });
  }
  loadShippingOrders();
}


async function markShipped(orderId, groupKey = null) {
  const ids = await getGroupedIds(orderId, groupKey);
  await supabase.from('orders').update({ is_shipped: true }).in('order_id', ids);
  loadShippingOrders();
}

async function markShippedGroup(groupKey) {
  if (groupKey.startsWith("single-")) {
    const orderId = parseInt(groupKey.replace("single-", ""));
    await supabase.from('orders').update({ is_shipped: true }).eq('order_id', orderId);
  } else {
    await updateGroupStatus(groupKey, { is_shipped: true });
  }
  loadShippingOrders();
}

async function markRefunded(orderId, groupKey = null) {
  const now = new Date().toISOString();
  const ids = await getGroupedIds(orderId, groupKey);
  await supabase.from('orders').update({ is_refunded: true, refunded_at: now }).in('order_id', ids);
  loadShippingOrders();
} // ✅ 중괄호 닫기 필요

async function markDelivered(orderId, groupKey = null) {
  const ids = await getGroupedIds(orderId, groupKey);
  await supabase.from('orders').update({ is_delivered: true }).in('order_id', ids);
  loadShippingOrders();
}

async function revertShippingGroup(groupKey) {
  if (groupKey.startsWith("single-")) {
    const orderId = parseInt(groupKey.replace("single-", ""));
    await supabase.from('orders').update({ is_shipped: false, is_delivered: false }).eq('order_id', orderId);
  } else {
    await updateGroupStatus(groupKey, { is_shipped: false, is_delivered: false });
  }
  loadShippingOrders();
}


async function downloadExcel() {
  const selected = Array.from(document.querySelectorAll('.select-order:checked')).map(cb => cb.value);
  if (!selected.length) return alert("선택된 주문이 없습니다.");

  const { data, error } = await supabase.from('orders').select('*').in('order_id', selected);
  if (error || !data) return alert("엑셀 생성 실패");

  const rows = [];
  const today = formatDateOnly(new Date().toISOString());

  data.forEach(order => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : Array.isArray(order.items) ? order.items : [];
    const name = order.name;
    const phone = order.phone;
    const zip = order.zipcode;
    const addr = `${order.address} ${order.address_detail}`; // 주소 + 상세주소 통합
    const paidDate = order.payment_date ? formatDateOnly(order.payment_date) : '';
    const remark = `${paidDate.replace(/\./g, '').slice(2)} ${name} 개별주문`;

    items.forEach(i => {
      // 시리얼번호가 8자리 숫자이고 배송비(15774577)가 아닌 경우 처리
      let spec = i.code;
      let itemName = i.name;
      const is8Digit = /^[0-9]{8}$/.test(i.code);
      if (is8Digit && i.code !== '15774577') {
        spec = '5727777';
        itemName = 'AFTER PARTS SERVICE';
      }

      rows.push({
        영업부서: '10000',
        출고부서: '30000',
        작성일자: today,
        거래처코드: '1040000',
        고객명: name,
        연락처: phone,
        우편번호: zip,
        주소: addr,
        영업담당: '2022004',
        SPEC: spec,
        ITEM: itemName,
        수량: i.qty,
        단가: i.price,
        답기요청일: today,
        입금확인일: paidDate,
        내부비고: remark,
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
    // ✅ 수정: order.items가 문자열인지 객체인지 구분하여 처리
    const items = typeof order.items === 'string'
      ? JSON.parse(order.items || '[]')
      : (order.items || []);

    const arrivalDue = items[0]?.arrival_due || '미정';
    const refund = order.refund_amount || 0;
    const groupKey = getGroupKey(order);
    const groupOrders = groupMap.get(groupKey);
    const groupRowspan = groupOrders.reduce((sum, o) => {
      const groupItems = typeof o.items === 'string'
        ? JSON.parse(o.items || '[]')
        : (o.items || []);
      return sum + groupItems.length;
    }, 0);

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
        ${isFirst ? `<td rowspan="${items.length}"><button onclick="moveToOrderManagement('${order.order_id}')" style="color:red;font-weight:bold;border:none;background:none;cursor:pointer;">✖</button><br/><input type="checkbox" class="select-order" value="${order.order_id}" /></td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${arrivalDue}</td>` : ''}
        ${isFirst ? `<td rowspan="${items.length}">${order.order_id}${order.is_merged ? `<div style="color:red; font-size:0.8em; cursor:pointer;" onclick="unmergeOrder('${order.order_id}')">합배송 처리됨 (클릭 시 취소)</div>` : ''}</td>` : ''}
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
            : isFirst ? `<td rowspan="${items.length}"></td>` : `<td style="display:none"></td>`
        }

        ${
          isFirstOrderInGroup && !shippedHandled.has('tracking-' + groupKey)
            ? (() => {
                shippedHandled.add('tracking-' + groupKey);
                return `<td rowspan="${groupRowspan}">
                  <input class="input-box" value="${order.tracking_number || ''}" ${order.is_shipped ? 'disabled' : ''} onchange="updateTrackingNumber('${order.order_id}', this.value)" />
                  <div style="font-size: 0.85em; color: gray;">${formatDateOnly(order.tracking_date)}</div>
                </td>`;
              })()
            : `<td style="display:none"></td>`
        }

        ${isFirstOrderInGroup && !shippedHandled.has('remark-' + groupKey)
          ? (() => {
              shippedHandled.add('remark-' + groupKey);
              return `<td rowspan="${groupRowspan}">${order.remarks || ''}</td>`;
            })()
          : `<td style="display:none"></td>`
        }

        ${isFirstOrderInGroup && !shippedHandled.has('note-' + groupKey)
          ? (() => {
              shippedHandled.add('note-' + groupKey);
              return `<td rowspan="${groupRowspan}">
                <input class="input-box" value="${order.shipping_note || ''}" ${order.is_shipped ? 'disabled' : ''} onchange="updateShippingNote('${order.order_id}', this.value)" />
              </td>`;
            })()
          : `<td style="display:none"></td>`
        }

        ${isFirstOrderInGroup && !shippedHandled.has('work-' + groupKey)
          ? (() => {
              shippedHandled.add('work-' + groupKey);
              return `<td rowspan="${groupRowspan}">
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
          : `<td style="display:none"></td>`
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

  // 고객정보 기준으로 그룹 키 생성 (is_merged와 무관하게 동일한 고객이면 묶이도록)
  function makeCustomerKey(order) {
    return [order.name, order.phone, order.zipcode, order.address, order.address_detail].join('|');
  }

  for (const order of orders) {
    const key = makeCustomerKey(order); // getGroupKey 대신 사용
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
  if (confirm("이 주문을 배송관리에서 제외하고 발주 완료로 이동하시겠습니까?")) {
    await supabase.from('orders').update({
      is_ready_to_ship: false,
      is_ordered: true  // ✅ 주문 상태를 유지
    }).eq('order_id', orderId);
    loadShippingOrders();
  }
}

async function updateTrackingNumber(orderId, value) {
  const date = value ? new Date().toISOString() : null;
  await supabase.from('orders').update({ tracking_number: value || null, tracking_date: date }).eq('order_id', orderId);
}

async function markDeliveredGroup(groupKey) {
  if (groupKey.startsWith("single-")) {
    const orderId = parseInt(groupKey.replace("single-", ""));
    await supabase.from('orders').update({ is_delivered: true }).eq('order_id', orderId);
  } else {
    await updateGroupStatus(groupKey, { is_delivered: true });
  }
  loadShippingOrders();
}


async function updateShippingNote(orderId, value) {
  await supabase.from('orders').update({ shipping_note: value || null }).eq('order_id', orderId);
} // ← ✅ 이 주석은 "닫혀야 함"이 아니라 "정상 닫힘"

async function unmergeOrder(orderId) {
  const confirmCancel = confirm("합배송 처리를 취소하시겠습니까?");
  if (!confirmCancel) return;

  const { data: orderData, error } = await supabase.from('orders').select('*').eq('order_id', orderId).limit(1);

  if (error || !orderData || orderData.length === 0) {
    alert("주문 정보를 불러오지 못했습니다.");
    console.error('Error loading order:', error);
    return;
  }

  const groupKey = getGroupKey(orderData[0]);

  const { data: allMergedOrders } = await supabase.from('orders').select('*').eq('is_merged', true); // ← 핵심 수정
  const ids = allMergedOrders.filter(o => getGroupKey(o) === groupKey).map(o => o.order_id);

  if (ids.length === 0) {
    alert("해당 그룹의 주문을 찾을 수 없습니다.");
    return;
  }

  const { error: updateError } = await supabase.from('orders').update({
    is_merged: false,
    refund_amount: null,
    is_refunded: false,
    refunded_at: null
  }).in('order_id', ids);

  if (updateError) {
    alert("합배송 취소에 실패했습니다.");
    console.error('Update error:', updateError);
    return;
  }

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
window.revertShipping = revertShipping;   // ✅ OK
window.moveToOrderManagement = moveToOrderManagement;
window.markRefunded = markRefunded;
window.unmarkRefunded = unmarkRefunded;
window.unmergeOrder = unmergeOrder;       // ✅ OK
window.updateTrackingNumber = updateTrackingNumber;
window.updateShippingNote = updateShippingNote;
window.handleMergeShipping = handleMergeShipping;
