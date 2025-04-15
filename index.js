import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://edgvrwekvnavkhcqwtxa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E"
);

const cart = [];

window.execDaumPostcode = function () {
  new daum.Postcode({
    oncomplete: function (data) {
      document.getElementById('zipcode').value = data.zonecode;
      document.getElementById('address').value = data.roadAddress || data.jibunAddress;
    }
  }).open();
};

window.toggleCashReceipt = function () {
  document.getElementById("cashReceiptSection").style.display =
    document.getElementById("receiptRequested").checked ? "block" : "none";
};

function generateOrderNumber() {
  const now = new Date();
  const MMDD = ("0" + (now.getMonth() + 1)).slice(-2) + ("0" + now.getDate()).slice(-2);
  const mmss = ("0" + now.getMinutes()).slice(-2) + ("0" + now.getSeconds()).slice(-2);
  const rand = Math.floor(10 + Math.random() * 90);
  return Number(MMDD + mmss + rand);
}

window.searchProduct = async function () {
  const serial = document.getElementById("serialSearch").value.trim();
  const serialNum = parseInt(serial, 10);
  if (isNaN(serialNum)) return;

  const { data, error } = await supabase
    .from('tamiya_items')
    .select('item_code, description, j_retail')
    .eq('item_code', serialNum)
    .single();

  if (!error && data) {
    const existing = cart.find(item => item.item_code === serialNum);
    if (existing) {
      existing.qty++;
    } else {
      const codeLen = String(data.item_code).length;
      const multiplier = codeLen === 8 ? 15 : 13;
      const price = Math.floor(data.j_retail * multiplier);
      cart.push({
        item_code: data.item_code,
        description: data.description,
        price,
        qty: 1
      });
    }
    renderCart();
  }
};

window.updateQty = function (index, newQty) {
  const qty = parseInt(newQty);
  if (qty > 0) {
    cart[index].qty = qty;
    renderCart();
  }
};

window.removeItem = function (index) {
  cart.splice(index, 1);
  renderCart();
};

function renderCart() {
  const tbody = document.getElementById("cartBody");
  const table = document.getElementById("cartTable");
  tbody.innerHTML = "";
  let subtotal = 0;
  cart.forEach((item, index) => {
    const rowTotal = item.price * item.qty;
    subtotal += rowTotal;
    tbody.innerHTML += `
      <tr>
        <td>${item.item_code}</td>
        <td>${item.description}</td>
        <td>₩${item.price.toLocaleString()}</td>
        <td><input type="number" class="qty-input" value="${item.qty}" min="1" onchange="updateQty(${index}, this.value)"></td>
        <td>₩${rowTotal.toLocaleString()}</td>
        <td><button onclick="removeItem(${index})">삭제</button></td>
      </tr>
    `;
  });
  const shipping = subtotal < 30000 ? 3000 : 0;
  const total = subtotal + shipping;
  tbody.innerHTML += `
    <tr class="total">
      <td colspan="4">배송비</td>
      <td colspan="2">₩${shipping.toLocaleString()}</td>
    </tr>
  `;
  document.getElementById("cartTotal").textContent = `₩${total.toLocaleString()}`;
  table.style.display = cart.length ? "table" : "none";
}

window.confirmOrder = async function () {
  const get = id => document.getElementById(id);
  const name = get("customerName").value.trim();
  const phone = get("phoneNumber").value.trim();
  const email = get("email").value.trim();
  const zipcode = get("zipcode").value.trim();
  const address = get("address").value.trim();
  const addressDetail = get("addressDetail").value.trim();
  const receiptChecked = get("receiptRequested").checked;
  const receiptInfo = receiptChecked ? get("receiptInfo").value.trim() : null;

  if (!name || !phone || !email || !zipcode || !address || !addressDetail) {
    alert("모든 고객 정보를 정확히 입력해 주세요.");
    return;
  }
  if (!cart.length) {
    alert("장바구니에 담긴 상품이 없습니다.");
    return;
  }

  const fileInput = document.getElementById("proofImages");
  if (!fileInput.files.length) {
    alert("사진 첨부는 필수입니다.");
    return;
  }

  const orderId = generateOrderNumber();
  const imageUrls = [];
  for (let i = 0; i < fileInput.files.length; i++) {
    const file = fileInput.files[i];
    if (file.size > 1024 * 1024) {
      alert("각 파일은 1MB 이하로 제한됩니다.");
      return;
    }
    const ext = file.name.split('.').pop();
    const safeName = `${orderId}_${Date.now()}_${i}.${ext}`;
    const filePath = `proof/${safeName}`;
    const { error: uploadError } = await supabase.storage.from("order-proof").upload(filePath, file, { upsert: false });
    if (uploadError) {
      alert("이미지 업로드 중 오류가 발생했습니다.");
      console.error(uploadError);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("order-proof").getPublicUrl(filePath);
    imageUrls.push(publicUrl);
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0) + (cart.reduce((sum, item) => sum + item.price * item.qty, 0) < 30000 ? 3000 : 0);
  const payload = {
    order_id: orderId,
    name,
    phone,
    email,
    zipcode,
    address,
    address_detail: addressDetail,
    receipt_info: receiptInfo,
    proof_images: imageUrls,
    items: JSON.stringify(cart.map(item => ({ code: item.item_code, name: item.description, qty: item.qty, price: item.price }))),
    total,
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from("orders").insert(payload);
  if (error) {
    console.error("주문 저장 오류:", error);
    alert("주문 저장에 실패했습니다. 다시 시도해주세요.");
  } else {
    alert("주문이 완료되었습니다! 주문번호: " + orderId);
    window.location.href = "payment-info.html?orderId=" + orderId;
  }
};

window.searchOrderById = async function () {
  const input = document.getElementById("orderSearchInput").value.trim();
  const resultDiv = document.getElementById("orderResult");
  resultDiv.innerHTML = "";
  if (!input) {
    resultDiv.innerHTML = "<p>주문번호를 입력해주세요.</p>";
    return;
  }
  const { data, error } = await supabase.from("orders").select("*").eq("order_id", input).single();
  if (error || !data) {
    resultDiv.innerHTML = "<p>주문 내역을 찾을 수 없습니다. 주문번호를 확인해주세요.</p>";
    return;
  }
  const items = JSON.parse(data.items || "[]");
  const itemList = items.map(item => `<li>${item.name} (${item.qty}개)</li>`).join("");
  function formatDate(d) {
    const date = new Date(d);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  }
  const depositStatus = data.payment_confirmed ? `입금 확인 (${formatDate(data.payment_date)})` : "입금 전";
  const arrivalDue = data.arrival_due?.trim() ? data.arrival_due : "미정";
  resultDiv.innerHTML = `
    <h3>주문 정보</h3>
    <p><strong>주문번호:</strong> ${data.order_id}</p>
    <p><strong>고객명:</strong> ${data.name}</p>
    <p><strong>전화번호:</strong> ${data.phone}</p>
    <p><strong>주문일시:</strong> ${formatDate(data.created_at)}</p>
    <p><strong>총 금액:</strong> ₩${data.total.toLocaleString()}</p>
    <p><strong>입금 상태:</strong> ${depositStatus}</p>
    <p><strong>입고 예정일:</strong> ${arrivalDue}</p>
    <p><strong>주문 상품:</strong></p>
    <ul>${itemList}</ul>
  `;
};
