// as-orders.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

const orderBody = document.getElementById('orderBody');

export async function loadOrders() {
  const { data, error } = await supabase
    .from('AS_orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    orderBody.innerHTML = `<tr><td colspan="12">불러오기 실패: ${error.message}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    orderBody.innerHTML = '<tr><td colspan="12">신청 내역이 없습니다.</td></tr>';
    return;
  }

  orderBody.innerHTML = '';
  for (const row of data) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><button onclick="deleteOrder(${row.order_id})">삭제</button></td>
      <td>${formatDate(row.created_at)}</td>
      <td>${row.order_id}</td>
      <td>${row.name}</td>
      <td>${row.phone}</td>
      <td>${row.email}</td>
      <td>${row.category}</td>
      <td>${row.product_name}</td>
      <td>${row.fault_time || ''}</td>
      <td>${escapeText(row.fault_description)}</td>
      <td>${escapeText(row.request_details)}</td>
      <td>${escapeText(row.memo || '')}</td>
    `;
    orderBody.appendChild(tr);
  }
}

window.loadOrders = loadOrders;

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('ko-KR');
}

function escapeText(text) {
  return text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}

window.searchOrders = async function () {
  const keyword = document.getElementById('searchInput').value.trim();
  if (!keyword) return loadOrders();

  const { data, error } = await supabase
    .from('AS_orders')
    .select('*')
    .or(`order_id.eq.${keyword},name.ilike.%${keyword}%`);

  if (error) {
    orderBody.innerHTML = `<tr><td colspan="12">검색 실패: ${error.message}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    orderBody.innerHTML = '<tr><td colspan="12">검색 결과가 없습니다.</td></tr>';
    return;
  }

  orderBody.innerHTML = '';
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><button onclick="deleteOrder(${row.order_id})">삭제</button></td>
      <td>${formatDate(row.created_at)}</td>
      <td>${row.order_id}</td>
      <td>${row.name}</td>
      <td>${row.phone}</td>
      <td>${row.email}</td>
      <td>${row.category}</td>
      <td>${row.product_name}</td>
      <td>${row.fault_time || ''}</td>
      <td>${escapeText(row.fault_description)}</td>
      <td>${escapeText(row.request_details)}</td>
      <td>${escapeText(row.memo || '')}</td>
    `;
    orderBody.appendChild(tr);
  });
}

window.deleteOrder = async function (order_id) {
  if (!confirm(`${order_id}번 신청을 삭제할까요?`)) return;

  const { error } = await supabase
    .from('AS_orders')
    .delete()
    .eq('order_id', order_id);

  if (error) {
    alert(`삭제 실패: ${error.message}`);
    return;
  }

  alert('삭제되었습니다.');
  loadOrders();
}

window.downloadSelectedOrders = async function () {
  const { data, error } = await supabase.from('AS_orders').select('*');
  if (error || !data) {
    alert('엑셀 다운로드 실패');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'AS Orders');
  XLSX.writeFile(wb, 'as-orders.xlsx');
}

window.logout = function () {
  supabase.auth.signOut().then(() => {
    location.reload();
  });
}

// 초기 로드
loadOrders();
