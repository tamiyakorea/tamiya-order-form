// ✅ Supabase 클라이언트 생성
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

const cart = [];
let priceMultiplier = 1;

/////////////////////////////////////////////////////
// ✅ 배송비 상수 및 목록 선언 (최상단으로 이동)
/////////////////////////////////////////////////////
const DELIVERY_FEE = 3000;
const DELIVERY_FREE_METHODS = [
  "이천창고 직접 수령",
  "도매 주문과 합배송",
  "양재점 수령",
  "용산점 수령",
  "하남점 수령"
];

/////////////////////////////////////////////////////
// ✅ DOMContentLoaded 이벤트 처리
/////////////////////////////////////////////////////
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchButton").addEventListener("click", searchProduct);
  document.getElementById("deliveryMethod").addEventListener("change", calculateTotalWithShipping);
  document.getElementById("directPickup").addEventListener("change", calculateTotalWithShipping);
});

/////////////////////////////////////////////////////
// ✅ 전역 등록
/////////////////////////////////////////////////////
window.searchSupplier = searchSupplier;
window.searchProduct = searchProduct;
window.updateQty = updateQty;
window.removeItem = removeItem;
window.toggleEdit = toggleEdit;

/////////////////////////////////////////////////////
// ✅ 주문 번호 생성기
/////////////////////////////////////////////////////
function generateOrderNumber() {
  const now = new Date();
  const MMDD = ("0" + (now.getMonth() + 1)).slice(-2) + ("0" + now.getDate()).slice(-2);
  const mmss = ("0" + now.getMinutes()).slice(-2) + ("0" + now.getSeconds()).slice(-2);
  const rand = Math.floor(10 + Math.random() * 90);
  return Number(MMDD + mmss + rand);
}

/////////////////////////////////////////////////////
// ✅ 전화번호 포맷터
/////////////////////////////////////////////////////
function formatPhoneNumber(phone) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return clean.replace(/(\d{2,3})(\d{3,4})(\d{4})/, '$1-$2-$3');
  } else if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  } else {
    return phone;
  }
}

/////////////////////////////////////////////////////
// ✅ 사업자 정보 검색 (사업자번호 또는 업체명)
/////////////////////////////////////////////////////
export async function searchSupplier() {
  const keyword = document.getElementById("searchKeyword").value.trim();

  if (!keyword) {
    alert("사업자번호 또는 업체명을 입력해주세요.");
    return;
  }

  try {
    let query = supabase.from('suppliers').select('*');

    if (/^[0-9]{3}-[0-9]{2}-[0-9]{5}$/.test(keyword)) {
      query = query.eq('business_registration_number', keyword);
    } else {
      query = query.eq('company_name', keyword);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      alert("해당 정보를 찾을 수 없습니다.");
      return;
    }

    document.getElementById("supplierName").value = data.company_name;
    document.getElementById("businessNumberDisplay").value = data.business_registration_number;
    document.getElementById("supplierContact").value = formatPhoneNumber(data.phone);
    document.getElementById("supplierAddress").value = data.address;
    document.getElementById("supplierEmail").value = data.email;
    priceMultiplier = parseFloat(data.price_multiplier);

  } catch (error) {
    console.error("Fetch Error:", error.message);
    alert("정보 조회 중 문제가 발생했습니다.");
  }
}

/////////////////////////////////////////////////////
// ✅ 배송비 포함한 총 금액 계산
/////////////////////////////////////////////////////
function calculateTotalWithShipping() {
  let total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryMethod = document.getElementById("deliveryMethod").value;
  const isDirectPickup = document.getElementById("directPickup").checked;

  if (total < 30000) {
    if (!(isDirectPickup && DELIVERY_FREE_METHODS.includes(deliveryMethod))) {
      total += DELIVERY_FEE;
    }
  }

  document.getElementById("cartTotal").textContent = `₩${total.toLocaleString()}`;
}

/////////////////////////////////////////////////////
// ✅ 장바구니 수량 변경 처리
/////////////////////////////////////////////////////
function updateQty(index, value) {
  cart[index].qty = parseInt(value, 10);
  renderCart();
}

/////////////////////////////////////////////////////
// ✅ 장바구니 렌더링
/////////////////////////////////////////////////////
function renderCart() {
  const tbody = document.getElementById("cartBody");
  tbody.innerHTML = "";

  cart.forEach((item, index) => {
    const rowTotal = item.price * item.qty;

    tbody.innerHTML += `
      <tr>
        <td>${item.code}</td>
        <td>${item.name}</td>
        <td>₩${item.price.toLocaleString()}</td>
        <td><input type="number" value="${item.qty}" min="1" onchange="updateQty(${index}, this.value)"></td>
        <td>₩${rowTotal.toLocaleString()}</td>
        <td><button onclick="removeItem(${index})">삭제</button></td>
      </tr>
    `;
  });

  calculateTotalWithShipping();
}

/////////////////////////////////////////////////////
// ✅ 장바구니 항목 삭제 처리
/////////////////////////////////////////////////////
function removeItem(index) {
  cart.splice(index, 1);
  renderCart();
}

/////////////////////////////////////////////////////
// ✅ 정보 수정 가능 토글 처리
/////////////////////////////////////////////////////
window.toggleEdit = function (checkbox) {
  const editableFields = [
    document.getElementById("supplierContact"),
    document.getElementById("supplierAddress"),
    document.getElementById("supplierEmail")
  ];

  editableFields.forEach(field => {
    if (checkbox.checked) {
      field.removeAttribute('readonly');
    } else {
      field.setAttribute('readonly', true);
    }
  });
};

/////////////////////////////////////////////////////
// ✅ 이벤트 리스너 추가
/////////////////////////////////////////////////////
document.getElementById("searchButton").addEventListener("click", searchProduct);
document.getElementById("deliveryMethod").addEventListener("change", calculateTotalWithShipping);
document.getElementById("directPickup").addEventListener("change", calculateTotalWithShipping);
