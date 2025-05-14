// ✅ Supabase 클라이언트 생성 (module 방식으로 import)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

const cart = [];
let priceMultiplier = 1;

/////////////////////////////////////////////////////
// ✅ 주문 번호 생성기 (기존 index.js 방식과 동일하게 생성)
/////////////////////////////////////////////////////
function generateOrderNumber() {
  const now = new Date();
  const MMDD = ("0" + (now.getMonth() + 1)).slice(-2) + ("0" + now.getDate()).slice(-2);
  const mmss = ("0" + now.getMinutes()).slice(-2) + ("0" + now.getSeconds()).slice(-2);
  const rand = Math.floor(10 + Math.random() * 90);
  return Number(MMDD + mmss + rand);
}

/////////////////////////////////////////////////////
// ✅ 사업자 정보 검색
/////////////////////////////////////////////////////
window.searchSupplier = async function () {
  const businessNumber = document.getElementById("businessNumber").value.trim();
  const companyName = document.getElementById("companyName").value.trim();

  if (!businessNumber && !companyName) {
    alert("사업자번호 또는 업체명을 입력해주세요.");
    return;
  }

  try {
    let query = supabase.from('suppliers').select('*');

    if (businessNumber) {
      query = query.eq('business_registration_number', businessNumber);
    } else if (companyName) {
      query = query.eq('company_name', companyName);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error("Error fetching supplier:", error.message);
      alert("해당 정보를 찾을 수 없습니다.");
      return;
    }

    if (!data) {
      alert("검색된 정보가 없습니다.");
      return;
    }

    // ✅ 화면에 정보 표시
    document.getElementById("supplierName").value = data.company_name;
    document.getElementById("businessNumber").value = data.business_registration_number;
    document.getElementById("supplierContact").value = formatPhoneNumber(data.phone);
    document.getElementById("supplierAddress").value = data.address;
    document.getElementById("supplierEmail").value = data.email;

    // ✅ priceMultiplier 전역 변수에 반영
    priceMultiplier = parseFloat(data.price_multiplier);

  } catch (error) {
    console.error("Fetch Error:", error.message);
    alert("정보 조회 중 문제가 발생했습니다.");
  }
};

/////////////////////////////////////////////////////
// ✅ 업체명으로 검색 + 자동완성
/////////////////////////////////////////////////////
const companyInput = document.getElementById("companyName");
const autoCompleteList = document.getElementById("autocomplete-list");

companyInput.addEventListener("input", async function () {
  const keyword = companyInput.value.trim();
  autoCompleteList.innerHTML = '';

  if (keyword.length < 2) return;

  // ✅ Supabase에서 유사한 이름 검색
  const { data, error } = await supabase
    .from('suppliers')
    .select('company_name')
    .ilike('company_name', `%${keyword}%`);

  if (error) {
    console.error("Error fetching company names:", error.message);
    return;
  }

  if (data.length === 0) {
    autoCompleteList.style.display = 'none';
    return;
  }

  autoCompleteList.style.display = 'block';

  data.forEach((item) => {
    const div = document.createElement("div");
    div.textContent = item.company_name;
    div.onclick = () => {
      companyInput.value = item.company_name;
      autoCompleteList.innerHTML = '';
    };
    autoCompleteList.appendChild(div);
  });
});

// ✅ 텍스트박스 클릭 외 다른 곳 클릭 시 자동완성 숨김
document.addEventListener('click', function (event) {
  if (!event.target.closest('.autocomplete')) {
    autoCompleteList.innerHTML = '';
  }
});

/////////////////////////////////////////////////////
// ✅ 업체명으로 정보 검색
/////////////////////////////////////////////////////
window.searchSupplierByName = async function () {
  const companyName = document.getElementById("companyName").value.trim();
  if (!companyName) {
    alert("업체명을 입력해주세요.");
    return;
  }

  try {
    const { data, error, status } = await supabase
      .from('suppliers')
      .select('*')
      .eq('company_name', companyName)
      .single();

    if (error) {
      console.error("Error fetching supplier:", error.message);
      alert("해당 업체 정보를 찾을 수 없습니다.");
      return;
    }

    if (!data) {
      alert("검색된 업체 정보가 없습니다.");
      return;
    }

    // ✅ 화면에 정보 표시
    document.getElementById("supplierName").value = data.company_name;
    document.getElementById("supplierContact").value = formatPhoneNumber(data.phone);
    document.getElementById("supplierAddress").value = data.address;

  } catch (error) {
    console.error("Fetch Error:", error.message);
    alert("업체 정보 조회 중 문제가 발생했습니다.");
  }
};


/////////////////////////////////////////////////////
// ✅ 전화번호 포맷팅 함수
/////////////////////////////////////////////////////
function formatPhoneNumber(number) {
  const onlyNums = number.replace(/[^0-9]/g, '');
  if (onlyNums.length === 11) {
    return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 7)}-${onlyNums.slice(7)}`;
  } else if (onlyNums.length === 10) {
    return `${onlyNums.slice(0, 2)}-${onlyNums.slice(2, 6)}-${onlyNums.slice(6)}`;
  }
  return number;
}

/////////////////////////////////////////////////////
// ✅ 정보 수정 가능 처리
/////////////////////////////////////////////////////
window.toggleEdit = function (checkbox) {
  const fields = ["supplierName", "supplierContact", "supplierAddress"];
  fields.forEach(id => {
    const element = document.getElementById(id);
    if (checkbox.checked) {
      element.readOnly = false;
      element.classList.add('active');
    } else {
      element.readOnly = true;
      element.classList.remove('active');
    }
  });
};

/////////////////////////////////////////////////////
// ✅ 상품 검색
/////////////////////////////////////////////////////
window.searchProduct = async function () {
  const productCode = document.getElementById("productCode").value.trim();
  if (!productCode) {
    alert("제품 코드를 입력해주세요.");
    return;
  }

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

  // ✅ 장바구니에 추가
  cart.push({
    code: data.item_code,
    name: data.description,
    price: Math.round(price),
    qty: 1
  });

  renderCart();
};

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

  // ✅ 필드 값 가져오기
  const businessNumber = document.getElementById("businessNumber").value.trim();
  const supplierName = document.getElementById("supplierName").value.trim();
  const supplierContact = document.getElementById("supplierContact").value.trim();
  const supplierAddress = document.getElementById("supplierAddress").value.trim();

  if (!businessNumber || !supplierName || !supplierContact || !supplierAddress) {
    alert("사업자 정보를 모두 입력해주세요.");
    return;
  }

  // ✅ 주문 번호 생성 (기존 index.js 방식으로 생성)
  const orderId = generateOrderNumber();

  // ✅ 장바구니 데이터 포맷팅
  const items = cart.map(item => ({
    code: item.code,
    name: item.name,
    qty: item.qty,
    price: item.price
  }));

  // ✅ 총액 계산
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  // ✅ Supabase로 주문 정보 전송
  const payload = {
    order_id: orderId,
    name: supplierName,
    phone: supplierContact,
    email: null,
    zipcode: null,
    address: supplierAddress,
    address_detail: null,
    receipt_info: null,
    proof_images: [],
    items: items,
    total: total,
    created_at: new Date().toISOString(),
    business_registration_number: businessNumber,
    supplier: true
  };

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([payload]);

    if (error) {
      console.error("주문 저장 오류:", error.message);
      alert("주문 저장에 실패하였습니다.");
      return;
    }

    alert(`주문이 성공적으로 접수되었습니다.\n주문번호: ${orderId}`);
    location.reload();
  } catch (error) {
    console.error("주문 처리 중 오류:", error.message);
    alert("서버와의 통신에 문제가 발생하였습니다.");
  }
};
