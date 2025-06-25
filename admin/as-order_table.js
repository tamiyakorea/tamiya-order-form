import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

// ✅ 주문 데이터 불러오기
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

// ✅ 테이블 렌더링
function renderOrders(orders) {
  const tbody = document.getElementById('orderBody');
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="13">결과가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  for (const order of orders) {
    const faultDate = extractMessageField(order.message, '고장시기');
    const faultDesc = escapeQuotes(extractMessageField(order.message, '고장증상'));
    const request = escapeQuotes(extractMessageField(order.message, '요청사항'));
    const address = escapeQuotes(order.address || '주소');
    const address_detail = escapeQuotes(order.address_detail || '상세 주소');


    const receivedDate = order.status === '접수됨'
      ? `<div class="received-date">${order.status_updated_at?.split('T')[0]}</div>`
      : '';
    const rowClass = order.status === '접수됨' ? 'highlighted' : '';
    const buttonLabel = order.status === '접수됨' ? '수리진행' : '접수';

    const row = document.createElement('tr');
    row.className = rowClass;
    row.setAttribute('data-order-id', order.order_id);
row.innerHTML = `
  <td><input type="checkbox" class="order-checkbox" data-id="${order.order_id}" /></td>
  <td><button onclick="deleteOrder('${order.order_id}')">삭제</button></td>
  <td>${order.created_at?.split('T')[0] || ''}</td>
  <td>${order.order_id}</td>
  <td>${order.name}</td>
  <td>${order.phone}</td>
  <td>${order.zipcode}</td>
  <td>
    <button onclick="showModal('주소', \`${address.replace(/`/g, '\\`')}\`)">확인</button>
  </td>
  <td>
    <button onclick="showModal('상세 주소', \`${address_detail.replace(/`/g, '\\`')}\`)">확인</button>
  </td>
  <td>${order.email}</td>
  <td>${(order.product_name || '').split(' > ')[0] || ''}</td>
  <td>${(order.product_name || '').split(' > ')[1] || ''}</td>
  <td>${order.request_type || ''}</td>
  <td>${order.inspection_followup || ''}</td>
  <td>${faultDate}</td>
  <td>
    <button onclick="showModal('고장증상', \`${faultDesc.replace(/`/g, '\\`')}\`)">확인</button>
  </td>
  <td>
    <button onclick="showModal('요청사항', \`${request.replace(/`/g, '\\`')}\`)">확인</button>
  </td>
  <td>
    <button onclick="toggleStatus('${order.order_id}', this)">${buttonLabel}</button>
    ${receivedDate}
  </td>
`;

    tbody.appendChild(row);
  }
}

// ✅ 문자열 추출 유틸
function extractMessageField(message, field) {
  if (!message) return '';
  const regex = new RegExp(`${field}:\\s*([\\s\\S]*?)(?=\\n(?:고장시기|고장증상|요청사항):|$)`, 'g');
  const match = regex.exec(message + '\n');
  return match ? match[1].trim() : '';
}

function escapeQuotes(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

// ✅ 상태 토글
window.toggleStatus = async function (orderId, btn) {
  const current = btn.textContent.trim();
  const newStatus = current === '접수' ? '수리진행' : '접수대기';
  const update = {
    status: newStatus.trim(),
    status_updated_at: new Date().toISOString()
  };
  const { error } = await supabase
    .from('as_orders')
    .update(update)
    .eq('order_id', orderId);

  if (error) {
    console.error('상태 업데이트 실패:', error);
  } else {
    loadOrders();
  }
};

// ✅ 삭제
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

// ✅ 수정 모달 열기
window.openEditModal = async function () {
  const selected = [...document.querySelectorAll('.order-checkbox:checked')];
  if (selected.length !== 1) {
    alert("하나의 주문만 선택해주세요.");
    return;
  }

  const orderId = selected[0].dataset.id;
  const { data, error } = await supabase
    .from('as_orders')
    .select('*')
    .eq('order_id', orderId)
    .single();
  if (error || !data) return alert("주문 정보를 불러올 수 없습니다.");

  const [category, model] = (data.product_name || '').split(' > ');
  const faultDate = extractMessageField(data.message, '고장시기');
  const faultDesc = extractMessageField(data.message, '고장증상');
  const request = extractMessageField(data.message, '요청사항');

  document.getElementById('editOrderId').value = orderId;
  document.getElementById('editName').value = data.name;
  document.getElementById('editPhone').value = data.phone;
  document.getElementById('editEmail').value = data.email;
  document.getElementById('editCategory').value = category;
  document.getElementById('editModel').value = model;
  document.getElementById('editFaultDate').value = faultDate;
  document.getElementById('editFaultDesc').value = faultDesc;
  document.getElementById('editRequest').value = request;

  document.getElementById('editModal').classList.add('show');
};

// ✅ 수정 저장
window.saveEdit = async function () {
  const orderId = document.getElementById('editOrderId').value;
  const name = document.getElementById('editName').value;
  const phone = document.getElementById('editPhone').value;
  const email = document.getElementById('editEmail').value;
  const category = document.getElementById('editCategory').value;
  const model = document.getElementById('editModel').value;
  const faultDate = document.getElementById('editFaultDate').value;
  const faultDesc = document.getElementById('editFaultDesc').value;
  const request = document.getElementById('editRequest').value;

  const update = {
    name,
    phone,
    email,
    product_name: `${category} > ${model}`,
    message: `고장시기: ${faultDate}\n고장증상: ${faultDesc}\n요청사항: ${request}`,
  };

  const { error } = await supabase
    .from('as_orders')
    .update(update)
    .eq('order_id', orderId);

  if (error) return alert("수정 실패");

  alert("✅ 수정 완료");
  document.getElementById('editModal').classList.remove('show');
  loadOrders();
};

// ✅ 전체 체크박스
window.toggleAllCheckboxes = function (master) {
  document.querySelectorAll('.order-checkbox').forEach(cb => cb.checked = master.checked);
};

// ✅ 모달 닫기
window.closeEditModal = function () {
  document.getElementById('editModal').classList.remove('show');
};

// ✅ 상세 확인 모달
window.showModal = function (title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').innerHTML = content.replace(/\n/g, '<br>');
  document.getElementById('modal').style.display = 'block';
};

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

// ✅ 검색 Enter 처리
document.getElementById('searchInput')?.addEventListener('keypress', e => {
  if (e.key === 'Enter') window.searchOrders();
});

// ✅ 검색 함수
window.searchOrders = async function () {
  const keyword = document.getElementById('searchInput').value.trim();
  if (!keyword) return loadOrders();

  const { data, error } = await supabase
    .from('as_orders')
    .select('*')
    .or(`order_id.ilike.%${keyword}%,name.ilike.%${keyword}%`)
    .eq('status', '접수대기')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('검색 오류:', error);
    return;
  }

  renderOrders(data);
};

// ✅ 로그아웃
window.logout = async function () {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('로그아웃 실패:', error);
  } else {
    location.href = '/admin/login.html';
  }
};

// ✅ 주문 초기 로드
loadOrders();

// ✅ 선택 수정 버튼 이벤트 바인딩
const btnEdit = document.getElementById('btnEdit');
if (btnEdit) {
  btnEdit.addEventListener('click', window.openEditModal);
} else {
  console.warn('⛔ btnEdit 버튼이 HTML에 존재하지 않습니다.');
}
