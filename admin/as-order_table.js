// 📦 Supabase 클라이언트 설정
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

// ✅ A/S 신청 목록 불러오기
window.loadOrders = async function () {
  console.log('✅ loadOrders 실행됨');
  const { data, error } = await supabase
  .from('as_orders')
  .select('*')
  .eq('status', '접수대기')
  .order('created_at', { ascending: false });

  console.log('📦 Supabase 응답:', { data, error });
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
    .eq('progress_stage', '대기')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('검색 오류:', error);
    return;
  }

  renderOrders(data);
};

// 🧾 테이블 렌더링
function renderOrders(orders) {
  const tbody = document.getElementById('orderBody');
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="12">결과가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  for (const order of orders) {
    const faultDateBtn = `<button onclick="showModal('고장시기', '${escapeQuotes(extractMessageField(order.message, '고장시기'))}')">확인</button>`;
    const faultDescBtn = `<button onclick="showModal('고장증상', '${escapeQuotes(extractMessageField(order.message, '고장증상'))}')">확인</button>`;
    const requestBtn = `<button onclick="showModal('요청사항', '${escapeQuotes(extractMessageField(order.message, '요청사항'))}')">확인</button>`;

    const receivedDate = order.status === '접수됨' ? `<div style='font-size:0.8em; color:#555;'>${order.status_updated_at?.split('T')[0]}</div>` : '';
    const rowClass = order.status === '접수됨' ? 'style="background-color:#e0f8d8"' : '';
    const buttonLabel = order.status === '접수됨' ? '수리진행' : '접수';

    const row = document.createElement('tr');
    row.setAttribute('data-order-id', order.order_id);
    row.innerHTML = `
      <td><button onclick="deleteOrder('${order.order_id}')">삭제</button></td>
      <td>${order.created_at?.split('T')[0] || ''}</td>
      <td>${order.order_id}</td>
      <td>${order.name}</td>
      <td>${order.phone}</td>
      <td>${order.email}</td>
      <td>${(order.product_name || '').split(' > ')[0] || ''}</td>
      <td>${(order.product_name || '').split(' > ')[1] || ''}</td>
      <td>${faultDateBtn}</td>
      <td>${faultDescBtn}</td>
      <td>${requestBtn}</td>
      <td>
        <button onclick="toggleStatus('${order.order_id}', this)" ${rowClass}>${buttonLabel}</button>
        ${receivedDate}
      </td>
    `;
    tbody.appendChild(row);
  }
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function extractMessageField(message, field) {
  if (!message) return '';
  const match = message.match(new RegExp(`${field}: ?([^\n]*)`));
  return match ? match[1].trim() : '';
}

// ✅ 상태 토글
window.toggleStatus = async function (orderId, button) {
  const currentLabel = button.textContent.trim();
  const isReceived = currentLabel === '접수';
  const newStatus = isReceived ? '접수됨' : '대기';
  const newStage = isReceived ? '대기' : '진행';
  const newDate = isReceived ? new Date().toISOString() : null;

  const { error } = await supabase
    .from('as_orders')
    .update({
      status: newStatus,
      status_updated_at: newDate,
      progress_stage: newStage
    })
    .eq('order_id', orderId);

  if (error) {
    console.error('상태 변경 오류:', error);
    alert('상태 변경 중 오류 발생');
    return;
  }

  loadOrders();
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

// 🔐 로그아웃
window.logout = async function () {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('로그아웃 실패:', error);
  } else {
    location.href = '/admin/login.html';
  }
};

function showModal(text) {
    document.getElementById("modalText").textContent = text;
    document.getElementById("modal").style.display = "block";
  }

  function closeModal() {
    document.getElementById("modal").style.display = "none";
  }

  // ESC 누르면 모달 닫기
  window.addEventListener('keydown', function (e) {
    if (e.key === "Escape") closeModal();
  });

// 페이지 로드시 데이터 불러오기
loadOrders();
