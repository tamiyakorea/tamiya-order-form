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
  window.searchProduct = searchProduct;
  window.confirmOrder = confirmOrder;
  window.updateQty = updateQty;
  window.removeItem = removeItem;
  window.toggleEdit = toggleEdit;
  window.searchSupplier = searchSupplier;

  document.getElementById("searchButton").addEventListener("click", searchProduct);
  document.getElementById("deliveryMethod").addEventListener("change", calculateTotalWithShipping);
});

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

    // ✅ 화면에 데이터 표시
    document.getElementById("supplierName").value = data.company_name;
    document.getElementById("businessNumberDisplay").value = data.business_registration_number;
    document.getElementById("supplierContact").value = formatPhoneNumber(data.phone);
    document.getElementById("supplierAddress").value = data.address;
    document.getElementById("supplierEmail").value = data.email;
    document.getElementById("supplierZipcode").value = data.zipcode;
    priceMultiplier = parseFloat(data.price_multiplier);

  } catch (error) {
    console.error("Fetch Error:", error.message);
    alert("정보 조회 중 문제가 발생했습니다.");
  }
}

/////////////////////////////////////////////////////
// ✅ 상품 검색 및 단가 계산 (중복 방지, 수량 증가)
/////////////////////////////////////////////////////
export async function searchProduct() {
  const productCode = document.getElementById("productCode").value.trim();
  if (!productCode) {
    alert("제품 코드를 입력해주세요.");
    return;
  }

  try {
    // ✅ Supabase에서 상품 정보 조회
    const { data, error } = await supabase
      .from('tamiya_items')
      .select('*')
      .eq('item_code', productCode)
      .single();

    if (error || !data) {
      alert("해당 제품을 찾을 수 없습니다.");
      return;
    }

    // ✅ 단가 계산
    const isEightDigit = productCode.length === 8;
    const multiplier = isEightDigit ? 15 : 13;
    const price = data.j_retail * multiplier * priceMultiplier;
    const consumerPrice = data.j_retail * multiplier;

    // ✅ 장바구니 중복 확인
    const existingItem = cart.find(item => item.code === data.item_code);

    if (existingItem) {
      existingItem.qty += 1;
    } else {
      cart.push({
        code: data.item_code,
        name: data.description,
        price: Math.round(price),
        consumerPrice: Math.round(consumerPrice),
        qty: 1
      });
    }

    // ✅ 렌더링 업데이트
    renderCart();
  } catch (err) {
    console.error("상품 검색 중 오류 발생:", err.message);
    alert("상품을 검색하는 동안 오류가 발생했습니다.");
  }
}

/////////////////////////////////////////////////////
// ✅ 배송비 포함한 총 금액 계산
/////////////////////////////////////////////////////
function calculateTotalWithShipping() {
  let total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (cart.length === 0) {
    document.getElementById("cartTotal").textContent = `₩0`;
    document.getElementById("deliveryMethod").value = "";
    return;
  }

  const deliveryMethod = document.getElementById("deliveryMethod").value;
  if (total < 30000 && !DELIVERY_FREE_METHODS.includes(deliveryMethod) && deliveryMethod !== "") {
    total += DELIVERY_FEE;
  }

  document.getElementById("cartTotal").textContent = `₩${total.toLocaleString()}`;
}

/////////////////////////////////////////////////////
// ✅ 장바구니 수량 변경 처리
/////////////////////////////////////////////////////
function updateQty(index, value) {
  const newQty = parseInt(value, 10);
  if (isNaN(newQty) || newQty < 1) {
    alert("수량은 1개 이상이어야 합니다.");
    renderCart();
    return;
  }
  cart[index].qty = newQty;
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
        <td>₩${(item.consumerPrice || item.price).toLocaleString()}</td>
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
  calculateTotalWithShipping(); // 🚀 삭제 후에도 금액 업데이트
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
// ✅ 주문 확정 처리
/////////////////////////////////////////////////////
function confirmOrder() {
  if (!cart.length) {
    alert("장바구니에 상품이 없습니다.");
    return;
  }

  const businessNumber = document.getElementById("businessNumberDisplay").value.trim();
  const supplierName = document.getElementById("supplierName").value.trim();
  const supplierContact = document.getElementById("supplierContact").value.trim();
  const supplierAddress = document.getElementById("supplierAddress").value.trim();
  const supplierEmail = document.getElementById("supplierEmail").value.trim();
  const supplierZipcode = document.getElementById("supplierZipcode").value.trim();
  const remarks = document.getElementById("remarks").value.trim();

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
    email: supplierEmail,
    zipcode: supplierZipcode,
    remarks: remarks,
    items: JSON.stringify(items),
    total: total,
    created_at: new Date().toISOString(),
    business_registration_number: businessNumber,
    supplier: true
  };

  supabase.from('orders').insert([payload])
    .then(({ data, error }) => {
      if (error) {
        console.error("주문 저장 오류:", error.message);
        alert("주문 저장에 실패하였습니다.");
        return;
      }
      alert(`주문이 성공적으로 접수되었습니다.\n주문번호: ${orderId}`);
      location.reload();
    });
}

