// ✅ Supabase 클라이언트 생성
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

const cart = [];
let priceMultiplier = 1;

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

    // ✅ 화면에 정보 표시
    document.getElementById("supplierName").value = data.company_name;
    document.getElementById("businessNumberDisplay").value = data.business_registration_number;
    document.getElementById("supplierContact").value = formatPhoneNumber(data.phone);
    document.getElementById("supplierAddress").value = data.address;
    document.getElementById("supplierEmail").value = data.email;

    // ✅ priceMultiplier 전역 변수에 반영
    priceMultiplier = parseFloat(data.price_multiplier);

  } catch (error) {
    console.error("Fetch Error:", error.message);
    alert("정보 조회 중 문제가 발생했습니다.");
  }
}

// ✅ 전화번호 포맷터
function formatPhoneNumber(phone) {
  if (!phone) return '';
  // 숫자만 남기기
  const clean = phone.replace(/\D/g, '');

  // 형식에 맞춰 포맷팅
  if (clean.length === 10) {
    return clean.replace(/(\d{2,3})(\d{3,4})(\d{4})/, '$1-$2-$3');
  } else if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  } else {
    return phone; // 포맷팅 불가한 경우 원본 반환
  }
}

/////////////////////////////////////////////////////
// ✅ 상품 검색 및 단가 계산
/////////////////////////////////////////////////////
export async function searchProduct() {
  console.log("🛠️ searchProduct 함수 실행됨");
  
  const productCode = document.getElementById("productCode").value.trim();
  if (!productCode) {
    alert("제품 코드를 입력해주세요.");
    return;
  }

  console.log(`🔍 검색할 제품 코드: ${productCode}`);

  const { data, error } = await supabase
    .from('tamiya_items')
    .select('*')
    .eq('item_code', productCode)
    .single();

  if (error || !data) {
    console.error("🔴 제품 검색 실패:", error);
    alert("해당 제품을 찾을 수 없습니다.");
    return;
  }

  console.log("✅ 제품 검색 성공:", data);

  // ✅ 단가 계산
  const isEightDigit = productCode.length === 8;
  const multiplier = isEightDigit ? 15 : 13;
  const price = data.j_retail * multiplier * priceMultiplier;

  // ✅ 장바구니에 추가
  cart.push({
    code: data.item_code,
    name: data.description,
    price: Math.round(price),
    qty: 1
  });

  console.log("✅ 장바구니에 추가됨", cart);

  renderCart();
}

/////////////////////////////////////////////////////
// ✅ 장바구니 렌더링
/////////////////////////////////////////////////////
function renderCart() {
  const tbody = document.getElementById("cartBody");
  tbody.innerHTML = "";

  let total = 0;
  cart.forEach((item, index) => {
    const rowTotal = item.price * item.qty;
    total += rowTotal;

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

  document.getElementById("cartTotal").textContent = `₩${total.toLocaleString()}`;
}

/////////////////////////////////////////////////////
// ✅ 수량 변경 처리
/////////////////////////////////////////////////////
window.updateQty = function (index, value) {
  const qty = parseInt(value, 10);
  if (isNaN(qty) || qty < 1) {
    alert("수량은 1개 이상이어야 합니다.");
    renderCart();
    return;
  }
  cart[index].qty = qty;
  renderCart();
};

/////////////////////////////////////////////////////
// ✅ 장바구니 항목 삭제 처리
/////////////////////////////////////////////////////
window.removeItem = function (index) {
  cart.splice(index, 1);
  renderCart();
};

/////////////////////////////////////////////////////
// ✅ 주문 확정 처리
/////////////////////////////////////////////////////
window.confirmOrder = async function () {
  if (!cart.length) {
    alert("장바구니에 상품이 없습니다.");
    return;
  }

  const businessNumber = document.getElementById("businessNumberDisplay").value.trim();
  const supplierName = document.getElementById("supplierName").value.trim();
  const supplierContact = document.getElementById("supplierContact").value.trim();
  const supplierAddress = document.getElementById("supplierAddress").value.trim();

  if (!businessNumber || !supplierName || !supplierContact || !supplierAddress) {
    alert("사업자 정보를 모두 입력해주세요.");
    return;
  }

  const orderId = generateOrderNumber();
  const items = cart.map(item => ({
    code: item.code,
    name: item.name,
    qty: item.qty,
    price: item.price
  }));

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const payload = {
    order_id: orderId,
    name: supplierName,
    phone: supplierContact,
    address: supplierAddress,
    items: JSON.stringify(items),
    total: total,
    created_at: new Date().toISOString(),
    business_registration_number: businessNumber,
    supplier: true
  };

  const { data, error } = await supabase.from('orders').insert([payload]);

  if (error) {
    console.error("주문 저장 오류:", error.message);
    alert("주문 저장에 실패하였습니다.");
    return;
  }

  alert(`주문이 성공적으로 접수되었습니다.\n주문번호: ${orderId}`);
  location.reload();
};

/////////////////////////////////////////////////////
// ✅ 정보 수정 가능 토글 처리
/////////////////////////////////////////////////////
window.toggleEdit = function (checkbox) {
  const editableFields = [
    document.getElementById("supplierContact"),
    document.getElementById("supplierAddress"),
    document.getElementById("supplierEmail")
  ];

  // ✅ 수정이 불가능한 필드 (업체명, 사업자번호)
  const lockedFields = [
    document.getElementById("supplierName"),
    document.getElementById("businessNumberDisplay")
  ];

  // ✅ 수정 가능 여부에 따른 처리
  if (checkbox.checked) {
    // 수정 가능 필드만 활성화
    editableFields.forEach(field => {
      field.removeAttribute('readonly');
      field.classList.add('active');
    });

    // 수정 불가능 필드는 항상 비활성화 상태 유지
    lockedFields.forEach(field => {
      field.setAttribute('readonly', true);
      field.classList.remove('active');
    });
  } else {
    // 모든 필드 다시 비활성화
    editableFields.forEach(field => {
      field.setAttribute('readonly', true);
      field.classList.remove('active');
    });
    lockedFields.forEach(field => {
      field.setAttribute('readonly', true);
      field.classList.remove('active');
    });
  }
};

// ✅ 상품 검색 버튼 클릭 리스너
document.getElementById("searchButton").addEventListener("click", async (e) => {
  e.preventDefault();
  console.log("🔍 상품 검색 버튼 클릭됨");
  await searchProduct();
});
