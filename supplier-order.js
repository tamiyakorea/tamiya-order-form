// ✅ Supabase 클라이언트 생성
const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

const cart = [];
let priceMultiplier = 1;

window.searchSupplier = async function () {
  const businessNumber = document.getElementById("businessNumber").value.trim();
  if (!businessNumber) {
    alert("사업자번호를 입력해주세요.");
    return;
  }

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('business_registration_number', businessNumber)
    .single();

  if (error || !data) {
    alert("해당 사업자 정보를 찾을 수 없습니다.");
    return;
  }

  // ✅ 화면에 정보 표시
  document.getElementById("supplierName").value = data.name;
  document.getElementById("supplierContact").value = data.contact;
  document.getElementById("supplierAddress").value = data.address;
  document.getElementById("priceMultiplier").value = data.price_multiplier;
  priceMultiplier = data.price_multiplier;
};

window.toggleEdit = function (checkbox) {
  const fields = ["supplierName", "supplierContact", "supplierAddress", "priceMultiplier"];
  fields.forEach(id => {
    document.getElementById(id).readOnly = !checkbox.checked;
  });
};

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

  const price = data.j_retail * priceMultiplier;
  cart.push({ code: data.item_code, name: data.description, price, qty: 1 });
  renderCart();
};

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

window.updateQty = function (index, value) {
  cart[index].qty = parseInt(value, 10);
  renderCart();
};

window.removeItem = function (index) {
  cart.splice(index, 1);
  renderCart();
};

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
  const priceMultiplier = parseFloat(document.getElementById("priceMultiplier").value.trim());

  if (!businessNumber || !supplierName || !supplierContact || !supplierAddress) {
    alert("사업자 정보를 모두 입력해주세요.");
    return;
  }

  // ✅ 주문 번호 생성
  const orderId = `S-${new Date().getTime().toString(36).toUpperCase()}`;

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
    email: null,                       // 업체 주문 시 이메일은 생략
    zipcode: null,                     // 업체 주문 시 우편번호는 생략
    address: supplierAddress,
    address_detail: null,              // 상세주소는 생략
    receipt_info: null,                // 현금영수증 정보 생략
    proof_images: [],                  // 증빙 이미지 생략
    items: JSON.stringify(items),
    total: total,
    created_at: new Date().toISOString(),
    business_registration_number: businessNumber,  // 추가된 컬럼
    supplier: true                                // 추가된 컬럼
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
