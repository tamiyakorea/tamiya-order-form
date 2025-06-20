// 📦 Supabase 클라이언트 설정
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

// ✅ A/S 신청 목록 불러오기
window.loadOrders = async function () {
  console.log("✅ loadOrders 실행됨");

  const { data, error } = await supabase
    .from('as_orders')
    .select('*')
    .order('created_at', { ascending: false });

  console.log("📦 Supabase 응답:", { data, error });

  if (error) {
    console.error('불러오기 오류:', error);
    return;
  }

  renderOrders(data);
};

// 🔍 검색
window.searchOrders = async function () {
  const keyword = document.getElementById('searchInput').value.trim();
  if (!keyword) return loadOrders();

  const { data, error } = await supabase
    .from('as_orders')
    .select('*')
    .or(`order_id.ilike.%${keyword}%,name.ilike.%${keyword}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('검색 오류:', error);
    return;
  }

  renderOrders(data);
};

// 🧼 테이블 렌더링
function renderOrders(orders) {
  const tbody = document.getElementById('orderBody');
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="12">결과가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  for (const order of orders) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><button onclick="deleteOrder('${order.order_id}')">삭제</button></td>
      <td>${order.created_at?.split('T')[0] || ''}</td>
      <td>${order.order_id}</td>
      <td>${order.name}</td>
      <td>${order.phone}</td>
      <td>${order.email}</td>
      <td>${(order.product_name || '').split(' > ')[0] || ''}</td>
      <td>${(order.product_name || '').split(' > ')[1] || ''}</td>
      <td><button onclick="showModal('고장시기', '${escapeHtml(extractMessageField(order.message, '고장시기'))}')">확인</button></td>
      <td><button onclick="showModal('고장증상', '${escapeHtml(extractMessageField(order.message, '고장증상'))}')">확인</button></td>
      <td><button onclick="showModal('요청사항', '${escapeHtml(extractMessageField(order.message, '요청사항'))}')">확인</button></td>
      <td></td>
    `;
    tbody.appendChild(row);
  }
}

function extractMessageField(message, field) {
  if (!message) return '';
  const match = message.match(new RegExp(`${field}: ?([^\n]*)`));
  return match ? match[1].trim() : '';
}

function escapeHtml(text) {
  return text.replace(/[&<>'"]/g, (tag) => {
    const chars = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    };
    return chars[tag] || tag;
  });
}

window.showModal = function (title, content) {
  const modal = document.createElement('div');
  modal.id = 'modalOverlay';
  modal.style = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 20px; border-radius: 10px; max-width: 400px; text-align: center;">
      <h3>${title}</h3>
      <p style="white-space: pre-wrap; margin-top: 10px;">${content}</p>
      <button onclick="document.getElementById('modalOverlay').remove()" style="margin-top: 20px;">닫기</button>
    </div>
  `;

  document.body.appendChild(modal);
};

// ❌ 삭제
window.deleteOrder = async function (orderId) {
  if (!confirm('정말 삭제하시겠습니까?')) return;

  const { error } = await supabase
    .from('as_orders')
    .delete()
    .eq('order_id', orderId);

  if (error) {
    alert('삭제 중 오류 발생');
    console.error(error);
    return;
  }

  loadOrders();
};

// ✅ 선택 엘셀 다운로드 (추후 구현 가능)
window.downloadSelectedOrders = function () {
  alert('엑셀 다운로드 기능은 추후 구현 예정입니다.');
};

// 🔐 로그아웃
window.logout = async function () {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('로그아웃 실패:', error);
  } else {
    location.href = '/admin/login.html';
  }
};

// 페이지 로버 데이터 불러오기
loadOrders();
