// Supabase 클라이언트 생성
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

const cart = [];
let priceMultiplier = 1;

// 배송비 상수 및 목록 선언
const DELIVERY_FEE = 3000;
const DELIVERY_FREE_METHODS = [
  "이천창고 직접 수령",
  "도매 주문과 합배송",
];

// ✅ DOMContentLoaded 이벤트 처리
// ✅ DOMContentLoaded 이벤트 처리
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ 페이지 로딩 완료 - 이벤트 리스너 등록 시작");

  // 🔹 전역 등록
  window.removeItem = removeItem;
  window.searchSupplier = searchSupplier;  // ✅ 이 부분이 누락되면 검색이 작동하지 않음
  window.toggleEdit = toggleEdit;
  window.updateQty = updateQty;
  
  // 🔹 정보 수정 가능 체크박스 이벤트 등록
  const unlockEditCheckbox = document.getElementById("unlockEdit");
  if (unlockEditCheckbox) {
    unlockEditCheckbox.addEventListener("change", (e) => {
      toggleEdit(e.target);
      console.log("✅ 정보 수정 가능 토글 등록 완료");
    });
  } else {
    console.error("❌ unlockEdit 체크박스를 찾을 수 없습니다.");
  }


  // 🔹 사업자 검색 버튼 이벤트 등록
  const searchButton = document.getElementById("supplierSearchButton");
  if (searchButton) {
    searchButton.addEventListener("click", searchSupplier);
    console.log("✅ 검색 버튼에 이벤트 리스너 등록 완료");
  } else {
    console.error("❌ 검색 버튼을 찾을 수 없습니다.");
  }

  // 🔹 배송 방법 변경 시 비고란 업데이트
  const deliverySelect = document.getElementById("deliveryMethod");
  if (deliverySelect) {
    deliverySelect.addEventListener("change", (event) => {
      const selectedMethod = event.target.value;
      const remarksField = document.getElementById("remarks");

      if (selectedMethod === "") {
        remarksField.value = ""; // 빈 값으로 초기화
      } else {
        remarksField.value = selectedMethod;
      }
    });
    console.log("✅ 배송 방법 변경 리스너 등록 완료");
  } else {
    console.error("❌ 배송 방법 선택 요소를 찾을 수 없습니다.");
  }
});

  window.toggleCashReceipt = function () {
  document.getElementById("cashReceiptSection").style.display =
    document.getElementById("receiptRequested").checked ? "block" : "none";
};

  document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("phoneNumber").addEventListener("input", function (e) {
    e.target.value = formatPhoneNumberLive(e.target.value);
  });

  document.getElementById("receiptInfo").addEventListener("input", function (e) {
    e.target.value = formatReceiptInfo(e.target.value);
  });
});

  function formatReceiptInfo(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (digits.length === 10) return digits.replace(/(\d{3})(\d{2})(\d{5})/, "$1-$2-$3");
  return digits;
}


// ✅ 정보 수정 가능 토글 함수
function toggleEdit(checkbox) {
  const editableFields = [
    document.getElementById("supplierContact"),
    document.getElementById("supplierAddress"),
    document.getElementById("supplierEmail"),
    document.getElementById("supplierZipcode")
  ];

  editableFields.forEach(field => {
    if (field) {
      if (checkbox.checked) {
        field.removeAttribute('readonly');
        field.removeAttribute('disabled');
        field.classList.remove('disabled-input');
      } else {
        field.setAttribute('readonly', true);
        field.setAttribute('disabled', true);
        field.classList.add('disabled-input');
      }
    }
  });
}

// ✅ 상품 검색 및 장바구니 추가
async function searchProduct() {
  const productCode = document.getElementById("productCode").value.trim();
  if (!productCode) {
    alert("제품 코드를 입력해주세요.");
    return;
  }

  try {
    const { data, error } = await supabase
  .from('tamiya_items')
  .select('*')
  .eq('item_code', productCode)
  .eq('hide_from_customer_search', false)  // ✅ 추가된 조건
  .single();

    if (error || !data) {
      alert("해당 제품을 찾을 수 없습니다.");
      return;
    }

    const isEightDigit = productCode.length === 8;
    const multiplier = isEightDigit ? 15 : 13;
    const price = data.j_retail * multiplier * priceMultiplier;
    const consumerPrice = data.j_retail * multiplier;

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

    renderCart();
  } catch (err) {
    console.error("상품 검색 중 오류 발생:", err.message);
    alert("상품을 검색하는 동안 오류가 발생했습니다.");
  }
}

// ✅ 배송비 포함한 총 금액 계산
function calculateTotalWithShipping() {
  let total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (cart.length === 0) {
    document.getElementById("cartTotal").textContent = `₩0`;
    return;
  }

  const deliveryMethod = document.getElementById("deliveryMethod").value;

  if (total < 30000 && !DELIVERY_FREE_METHODS.includes(deliveryMethod)) {
    total += DELIVERY_FEE;
  }

  document.getElementById("cartTotal").textContent = `₩${total.toLocaleString()}`;
}

// ✅ 장바구니 수량 업데이트
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

// ✅ 장바구니 렌더링
function renderCart() {
  const tbody = document.getElementById("cartBody");
  tbody.innerHTML = "";

  cart.forEach((item, index) => {
    const rowTotal = item.price * item.qty;

    tbody.innerHTML += `
      <tr>
        <td>${item.code}</td>
        <td>${item.name}</td>
        <td>₩${item.consumerPrice.toLocaleString()}</td>
        <td>₩${item.price.toLocaleString()}</td>
        <td><input type="number" value="${item.qty}" min="1" onchange="updateQty(${index}, this.value)"></td>
        <td>₩${rowTotal.toLocaleString()}</td>
        <td><button onclick="removeItem(${index})">삭제</button></td>
      </tr>
    `;
  });

  calculateTotalWithShipping();
}

// ✅ 장바구니 항목 삭제
function removeItem(index) {
  cart.splice(index, 1);
  renderCart();
}

/////////////////////////////////////////////////////
// ✅ 사업자 정보 검색 (사업자번호 또는 업체명)
/////////////////////////////////////////////////////
async function searchSupplier() {
  const keyword = document.getElementById("searchKeyword").value.trim();
  const uniqueCode = document.getElementById("uniqueCode")?.value.trim(); // 🔹 새 필드

  if (!keyword) {
    alert("사업자번호 또는 업체명을 입력해주세요.");
    return;
  }

  try {
    let query = supabase.from('suppliers').select('*');

    if (/^[0-9]{3}-[0-9]{2}-[0-9]{5}$/.test(keyword)) {
      // 사업자번호로 검색
      query = query.eq('business_registration_number', keyword);
    } else {
      // 업체명 + 고유번호 조합으로 검색
      if (!uniqueCode) {
        alert("고유번호를 함께 입력해주세요.");
        return;
      }
      query = query.eq('company_name', keyword).eq('unique_code', uniqueCode);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      alert("입력한 정보와 일치하는 업체를 찾을 수 없습니다.");

      // ✅ 초기화 처리
      document.getElementById("supplierName").value = "";
      document.getElementById("businessNumberDisplay").value = "";
      document.getElementById("supplierContact").value = "";
      document.getElementById("supplierAddress").value = "";
      document.getElementById("supplierEmail").value = "";
      const zipcodeField = document.getElementById("supplierZipcode");
      if (zipcodeField) {
        zipcodeField.value = "";
      }
      return;
    }

    // ✅ 정보 표시
    document.getElementById("supplierName").value = data.company_name;
    document.getElementById("businessNumberDisplay").value = data.business_registration_number;
    document.getElementById("supplierContact").value = formatPhoneNumber(data.phone);
    document.getElementById("supplierAddress").value = data.address;
    document.getElementById("supplierEmail").value = data.email;
    const zipcodeField = document.getElementById("supplierZipcode");
    if (zipcodeField) {
      zipcodeField.value = data.zipcode;
    }

    // ✅ 단가 배수 적용
    priceMultiplier = parseFloat(data.price_multiplier);

  } catch (error) {
    console.error("Fetch Error:", error.message);
    alert("정보 조회 중 문제가 발생했습니다.");
  }
}

/////////////////////////////////////////////////////
// ✅ 자동완성 기능 구현
/////////////////////////////////////////////////////
const searchInput = document.getElementById("searchKeyword");
const suggestionList = document.getElementById("suggestionList");

searchInput.addEventListener("keyup", async (event) => {
  const keyword = event.target.value.trim();
  
  // 🔹 입력이 없으면 리스트 숨김
  if (keyword === "") {
    suggestionList.innerHTML = "";
    return;
  }

  suggestionList.innerHTML = ""; // 기존 리스트 초기화

  if (keyword.length < 2) return; // 최소 2글자 이상 입력 시 검색

  try {
    // 🔹 Supabase에서 유사 업체명 검색
    const { data, error } = await supabase
      .from('suppliers')
      .select('company_name')
      .ilike('company_name', `%${keyword}%`); // 부분 일치 검색

    if (error) {
      console.error("검색 오류:", error.message);
      return;
    }

    if (data.length > 0) {
      // 🔹 중복 제거: 회사명만 추출 후 Set으로 변환하여 중복 제거
      const uniqueNames = [...new Set(data.map(item => item.company_name))];

      // 🔹 검색 결과 리스트 표시
      uniqueNames.forEach(companyName => {
        const li = document.createElement("li");
        li.textContent = companyName;
        
        // 🔹 항목 클릭 시, 입력란에 반영하고 리스트 초기화
        li.addEventListener("click", () => {
          searchInput.value = companyName;
          suggestionList.innerHTML = "";
        });

        suggestionList.appendChild(li);
      });
    }
  } catch (err) {
    console.error("자동완성 로딩 중 오류 발생:", err.message);
  }
});

// 🔹 입력 창 이외의 곳을 클릭하면 리스트 닫기
document.addEventListener("click", (event) => {
  if (!event.target.closest(".input-group")) {
    suggestionList.innerHTML = "";
  }
});

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
// ✅ 주문 번호 생성기
/////////////////////////////////////////////////////
function generateOrderNumber() {
  const now = new Date();
  const MMDD = ("0" + (now.getMonth() + 1)).slice(-2) + ("0" + now.getDate()).slice(-2);
  const mmss = ("0" + now.getMinutes()).slice(-2) + ("0" + now.getSeconds()).slice(-2);
  const rand = Math.floor(10 + Math.random() * 90);
  return Number(MMDD + mmss + rand);
}

// ✅ 주문 확정 처리
function confirmOrder() {
  if (!cart.length) {
    alert("장바구니에 상품이 없습니다.");
    return;
  }

  // ✅ 사업자 정보 가져오기
  const businessNumber = document.getElementById("businessNumberDisplay").value.trim();
  const supplierName = document.getElementById("supplierName").value.trim();
  const supplierContact = document.getElementById("supplierContact").value.trim();
  const supplierAddress = document.getElementById("supplierAddress").value.trim();
  const supplierEmail = document.getElementById("supplierEmail").value.trim();
  const supplierZipcodeElement = document.getElementById("supplierZipcode");
  const remarksElement = document.getElementById("remarks");

  // ✅ Null 참조 방지
  const supplierZipcode = supplierZipcodeElement ? supplierZipcodeElement.value.trim() : "";
  const remarks = remarksElement ? remarksElement.value.trim() : "";

  if (!businessNumber || !supplierName || !supplierContact || !supplierAddress) {
    alert("사업자 정보를 모두 입력해주세요.");
    return;
  }

  // ✅ 주문 정보 생성
  const orderId = generateOrderNumber();
  
  // ✅ 현금영수증
  const receiptInfo = document.getElementById("receiptInfo")?.value.trim() || "";

  // ✅ 장바구니 항목 정리
  const items = cart.map(item => ({
    code: item.code,
    name: item.name,
    qty: item.qty,
    price: item.price
  }));

  // ✅ 총 금액 계산
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  // ✅ Payload 생성
  const payload = {
    order_id: orderId,
    name: supplierName,
    phone: supplierContact,
    address: supplierAddress,
    email: supplierEmail,
    zipcode: supplierZipcode,
    remarks: remarks,
    receipt_info: receiptInfo,
    items: JSON.stringify(items),
    total: total,
    created_at: new Date().toISOString(),
    business_registration_number: businessNumber,
    supplier: true
  };

  // ✅ Supabase에 주문 정보 저장
  supabase.from('orders').insert([payload])
    .then(({ data, error }) => {
      if (error) {
        console.error("주문 저장 오류:", error.message);
        alert("주문 저장에 실패하였습니다.");
        return;
      }
      alert(`주문이 성공적으로 접수되었습니다.\n주문번호: ${orderId}`);
      
      // ✅ 🚀 페이지 이동 (payment-info.html로 주문번호와 함께 이동)
      window.location.href = `payment-info.html?orderId=${orderId}`;
    });
}


// ✅ 모듈 내보내기
export {
  searchProduct,
  toggleEdit,
  renderCart,
  removeItem,
  updateQty,
  calculateTotalWithShipping,
  confirmOrder,
  searchSupplier
};

