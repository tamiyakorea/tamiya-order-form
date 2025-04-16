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

async function markShipped(orderId) {
  await supabase.from('orders').update({ is_shipped: true }).eq('order_id', orderId);
  loadShippingOrders();
}

async function markDelivered(orderId) {
  await supabase.from('orders').update({ is_delivered: true }).eq('order_id', orderId);
  loadShippingOrders();
}

async function revertShipping(orderId) {
  await supabase.from('orders').update({ is_shipped: false, is_delivered: false }).eq('order_id', orderId);
  loadShippingOrders();
}

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

async function updateShippingNote(orderId, value) {
  await supabase.from('orders').update({ shipping_note: value || null }).eq('order_id', orderId);
}

async function markRefunded(orderId) {
  const now = new Date().toISOString();
  await supabase.from('orders').update({ is_refunded: true, refunded_at: now }).eq('order_id', orderId);
  loadShippingOrders();
}

function groupByCustomerInfo(orders) {
  const map = new Map();
  for (const order of orders) {
    const key = [order.name, order.phone, order.zipcode, order.address, order.address_detail].join('|');
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

async function handleMergeShipping() {
  const selectedIds = Array.from(document.querySelectorAll('.select-order:checked')).map(cb => cb.value);
  if (selectedIds.length < 2) return alert("2개 이상 주문을 선택해야 합니다.");
  const { data, error } = await supabase.from('orders').select('*').in('order_id', selectedIds);
  if (error || !data) return alert("주문 데이터 로딩 실패");

  const groups = groupByCustomerInfo(data);
  if (!groups.length) return alert("고객정보가 일치하는 주문이 없습니다.");

  for (const group of groups) {
    const refund = calculateRefundAmount(group);
    for (const order of group) {
      await supabase.from('orders').update({ is_merged: true, refund_amount: refund }).eq('order_id', order.order_id);
    }
  }
  alert("합배송 처리가 완료되었습니다.");
  loadShippingOrders();
}

async function downloadExcel() {
  const selected = Array.from(document.querySelectorAll('.select-order:checked')).map(cb => cb.value);
  if (!selected.length) return alert("선택된 주문이 없습니다.");

  const { data, error } = await supabase.from('orders').select('*').in('order_id', selected);
  if (error || !data) return alert("엑셀 생성 실패");

  const rows = [];
  data.forEach(order => {
    const items = JSON.parse(order.items || '[]');
    const name = order.name, phone = order.phone, zip = order.zipcode;
    const addr = order.address, detail = order.address_detail;
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

window.markShipped = markShipped;
window.markDelivered = markDelivered;
window.revertShipping = revertShipping;
window.moveToOrderManagement = moveToOrderManagement;
window.markRefunded = markRefunded;
window.updateTrackingNumber = updateTrackingNumber;
window.updateShippingNote = updateShippingNote;
