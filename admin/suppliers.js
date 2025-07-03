import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E' // ← 여기에 본인의 anon key 삽입
);

// 거래처 목록 불러오기
window.loadSuppliers = async function () {
  const keyword = document.getElementById('searchInput').value.trim();
  let query = supabase.from('suppliers').select('*').order('company_name', { ascending: true });

  if (keyword) {
    query = query.or(`company_name.ilike.%${keyword}%,business_registration_number.ilike.%${keyword}%`);
  }

  const { data, error } = await query;

  if (error) {
    alert('❌ 거래처 불러오기 실패');
    console.error(error);
    return;
  }

  const tbody = document.querySelector('#supplierTable tbody');
  tbody.innerHTML = '';

  data.forEach(row => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${row.business_registration_number}</td>
      <td>${row.company_name}</td>
      <td>${row.phone || ''}</td>
      <td>${row.email || ''}</td>
      <td>${row.zipcode || ''} ${row.address || ''} ${row.address_detail || ''}</td>
      <td>${row.price_multiplier ?? ''}</td>
      <td>${row.unique_code || ''}</td>
      <td>
        <button onclick="openEditModal('${row.business_registration_number}')">수정</button>
        <button onclick="deleteSupplier('${row.business_registration_number}')">삭제</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
};

// 등록 모달 열기
window.openAddModal = function () {
  document.getElementById('modalTitle').textContent = '거래처 등록';
  clearModalFields();
  document.getElementById('brnInput').disabled = false;
  showModal();
};

// 수정 모달 열기
window.openEditModal = async function (brn) {
  const { data, error } = await supabase.from('suppliers').select('*').eq('business_registration_number', brn).single();
  if (error || !data) {
    alert('❌ 정보 불러오기 실패');
    return;
  }

  document.getElementById('modalTitle').textContent = '거래처 수정';
  document.getElementById('companyNameInput').value = data.company_name || '';
  document.getElementById('brnInput').value = data.business_registration_number || '';
  document.getElementById('brnInput').disabled = true;
  document.getElementById('phoneInput').value = data.phone || '';
  document.getElementById('emailInput').value = data.email || '';
  document.getElementById('zipcodeInput').value = data.zipcode || '';
  document.getElementById('addressInput').value = data.address || '';
  document.getElementById('detailInput').value = data.address_detail || '';
  document.getElementById('multiplierInput').value = data.price_multiplier || '';
  document.getElementById('uniqueCodeInput').value = data.unique_code || '';

  showModal();
};

// 저장 버튼
window.saveSupplier = async function () {
  const supplier = {
    company_name: document.getElementById('companyNameInput').value.trim(),
    business_registration_number: document.getElementById('brnInput').value.trim(),
    phone: document.getElementById('phoneInput').value.trim(),
    email: document.getElementById('emailInput').value.trim(),
    zipcode: document.getElementById('zipcodeInput').value.trim(),
    address: document.getElementById('addressInput').value.trim(),
    address_detail: document.getElementById('detailInput').value.trim(),
    price_multiplier: parseFloat(document.getElementById('multiplierInput').value.trim()),
    unique_code: document.getElementById('uniqueCodeInput').value.trim(),
  };

  const isEdit = document.getElementById('brnInput').disabled;

  let result;
  if (isEdit) {
    result = await supabase.from('suppliers').update(supplier).eq('business_registration_number', supplier.business_registration_number);
  } else {
    result = await supabase.from('suppliers').insert(supplier);
  }

  if (result.error) {
    alert('❌ 저장 실패');
    console.error(result.error);
    return;
  }

  closeModal();
  loadSuppliers();
};

// 삭제
window.deleteSupplier = async function (brn) {
  if (!confirm('정말 삭제하시겠습니까?')) return;

  const { error } = await supabase.from('suppliers').delete().eq('business_registration_number', brn);
  if (error) {
    alert('❌ 삭제 실패');
    console.error(error);
    return;
  }

  loadSuppliers();
};

// 모달 유틸
function showModal() {
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('supplierModal').style.display = 'block';
}

window.closeModal = function () {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('supplierModal').style.display = 'none';
};

function clearModalFields() {
  document.getElementById('companyNameInput').value = '';
  document.getElementById('brnInput').value = '';
  document.getElementById('phoneInput').value = '';
  document.getElementById('emailInput').value = '';
  document.getElementById('zipcodeInput').value = '';
  document.getElementById('addressInput').value = '';
  document.getElementById('detailInput').value = '';
  document.getElementById('multiplierInput').value = '';
  document.getElementById('uniqueCodeInput').value = '';
}

// 초기 로딩
loadSuppliers();
