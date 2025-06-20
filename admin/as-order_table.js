// 📦 Supabase 클라이언트 설정
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'YOUR_ANON_KEY' // 보안상 실제 배포 시 환경변수로 처리할 것
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

// 🧾 테이블 렌더링
function renderOrders(orders) {
  const tbody = document.getElementById('orderBody');
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="13">결과가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  for (const order of orders) {
    const row = document.createElement('tr');
    if (order.status === '접수') row.style.backgroundColor = '#d8f9c1';

    row.innerHTML = `
      <td><button onclick="deleteOrder('${order.order_id}')">삭제</button></td>
      <td>${order.created_at?.split('T')[0] || ''}</td>
      <td>${order.order_id}</td>
      <td>${order.name}</td>
      <td>${order.phone}</td>
      <td>${order.email}</td>
      <td>${(order.product_name || '').split(' > ')[0] || ''}</td>
      <td>${(order.product_name || '').split(' > ')[1] || ''}</td>
      <td>${extractMessageField(order.message, '고장시기')}</td>
      <td>${extractMessageField(order.message, '고장증상')}</td>
      <td>${extractMessageField(order.message, '요청사항')}</td>
      <td>
        <button onclick="toggleStatus(this, '${order.order_id}', '${order.status || ''}')">
          ${order.status === '접수' ? '되돌리기' : '접수'}
        </button>
        ${order.status_updated_at ? `<div class="status-date" onclick="toggleStatus(this.parentElement.querySelector('button'), '${order.order_id}', '${order.status || ''}')">${order.status_updated_at.split('T')[0]}</div>` : ''}
      </td>
    `;

    tbody.appendChild(row);
  }
}

// 🔄 상태 토글
window.toggleStatus = async function (buttonEl, orderId, currentStatus) {
  const newStatus = currentStatus === '접수' ? null : '접수';
  const updatedAt = newStatus ? new Date().toISOString() : null;

  const { error } = await supabase
    .from('as_orders')
    .update({
      status: newStatus,
      status_updated_at: updatedAt
    })
    .eq('order_id', orderId);

  if (error) {
    alert('상태 변경 오류');
    console.error(error);
    return;
  }

  loadOrders(); // UI 갱신
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

// 🧹 메시지 추출 유틸
function extractMessageField(message, field) {
  if (!message) return '';
  const match = message.match(new RegExp(`${field}: ?([^\n]*)`));
  return match ? match[1].trim() : '';
}

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

// 📥 엑셀 다운로드 (미구현)
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

// 초기 로딩
loadOrders();
