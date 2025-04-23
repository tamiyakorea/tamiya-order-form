import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const orderId = new URLSearchParams(window.location.search).get("orderId");

export const supabase = createClient(
  "https://edgvrwekvnavkhcqwtxa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E",
  {
    auth: {
      persistSession: false
    },
    global: {
      headers: {
        'order-id': orderId || '0'  // 없으면 0 (불필요한 전체 조회 막기)
      }
    }
  }
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

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("phoneNumber").addEventListener("input", function (e) {
    e.target.value = formatPhoneNumberLive(e.target.value);
  });

  document.getElementById("receiptInfo").addEventListener("input", function (e) {
    e.target.value = formatReceiptInfo(e.target.value);
  });
});

function formatPhoneNumberLive(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function formatReceiptInfo(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (digits.length === 10) return digits.replace(/(\d{3})(\d{2})(\d{5})/, "$1-$2-$3");
  return digits;
}

function generateOrderNumber() {
  const now = new Date();
  const MMDD = ("0" + (now.getMonth() + 1)).slice(-2) + ("0" + now.getDate()).slice(-2);
  const mmss = ("0" + now.getMinutes()).slice(-2) + ("0" + now.getSeconds()).slice(-2);
  const rand = Math.floor(10 + Math.random() * 90);
  return Number(MMDD + mmss + rand);
}

function setSupabaseOrderId(orderId) {
  supabase.rest.global.headers['order-id'] = String(orderId);
}

function compressImage(file, maxWidth = 2000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error("Blob 변환 실패"));
        }, 'image/jpeg', quality);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

window.searchProduct = async function () {
  const serial = document.getElementById("serialSearch").value.trim();
  const serialNum = parseInt(serial, 10);
  if (isNaN(serialNum)) return;

  const { data, error } = await supabase
    .from('tamiya_items')
    .select('item_code, description, j_retail, order_unit_ctn, order_unit_pck')
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
      const minQty = data.order_unit_pck > 0 ? data.order_unit_pck : (data.order_unit_ctn > 0 ? data.order_unit_ctn : 0);
      cart.push({
        item_code: data.item_code,
        description: data.description,
        price,
        qty: minQty > 0 ? minQty : 1,
        min_qty: minQty
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
    const minQtyNote = item.min_qty > 0 ? `<div style='color: red; font-size: 0.8em'>(최소 주문 수량: ${item.min_qty}개)</div>` : "";
    tbody.innerHTML += `
      <tr>
        <td>${item.item_code}</td>
        <td>${item.description}${minQtyNote}</td>
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
  const phoneRaw = get("phoneNumber").value.trim();
  const phone = formatPhoneNumberLive(phoneRaw);
  const email = get("email").value.trim();
  const zipcode = get("zipcode").value.trim();
  const address = get("address").value.trim();
  const addressDetail = get("addressDetail").value.trim();
  const receiptChecked = get("receiptRequested").checked;
  const receiptInfoRaw = receiptChecked ? get("receiptInfo").value.trim() : null;
  const receiptInfo = receiptInfoRaw ? formatReceiptInfo(receiptInfoRaw) : null;

  if (!name || !phone || !email || !zipcode || !address || !addressDetail) {
    alert("모든 고객 정보를 정확히 입력해 주세요.");
    return;
  }
  if (!cart.length) {
    alert("장바구니에 담긴 상품이 없습니다.");
    return;
  }

  for (let item of cart) {
    if (item.min_qty > 0 && item.qty < item.min_qty) {
      alert("상품별 최소 주문 수량을 확인해주세요.");
      return;
    }
  }

  const fileInput = document.getElementById("proofImages");
  if (fileInput.files.length !== 1) {
    alert("사진 1장을 반드시 첨부해야 합니다.");
    return;
  }

  const rawFile = fileInput.files[0];
  const compressedFile = await compressImage(rawFile, 2000, 0.8);

  if (compressedFile.size > 5 * 1024 * 1024) {
    alert("압축 후에도 파일이 5MB를 초과합니다. 더 작은 이미지를 첨부해주세요.");
    return;
  }

  const orderId = generateOrderNumber();
  const ext = 'jpg';
  const safeName = `${orderId}_${Date.now()}.${ext}`;
  const filePath = `proof/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("order-proof")
    .upload(filePath, compressedFile, { upsert: false });

  if (uploadError) {
    alert("이미지 업로드 중 오류가 발생했습니다.");
    console.error(uploadError);
    return;
  }

  const { data } = supabase.storage.from("order-proof").getPublicUrl(filePath);
  const publicUrl = data.publicUrl;


  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0) + 
    (cart.reduce((sum, item) => sum + item.price * item.qty, 0) < 30000 ? 3000 : 0);

  const payload = {
    order_id: orderId,
    name,
    phone,
    email,
    zipcode,
    address,
    address_detail: addressDetail,
    receipt_info: receiptInfo,
    proof_images: [publicUrl],
    items: JSON.stringify(cart.map(item => ({
      code: item.item_code,
      name: item.description,
      qty: item.qty,
      price: item.price
    }))),
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
    setSupabaseOrderId(input);  // 🔥 이거 추가
  if (!input) {
    alert("주문번호를 입력해주세요.");
    return;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", input)
    .single();

  const resultDiv = document.getElementById("orderResult");
  if (error || !data) {
    resultDiv.innerHTML = "<p style='color:red;'>주문 정보를 찾을 수 없습니다.</p>";
  } else {
    const items = Array.isArray(data.items) ? data.items : JSON.parse(data.items);
    const itemsHTML = items.map(item => `
      <tr>
        <td>${item.code}</td>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>₩${item.price.toLocaleString()}</td>
      </tr>
    `).join("");

    const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const shipping = subtotal < 30000 ? 3000 : 0;
    const orderDate = new Date(data.created_at).toISOString().split("T")[0];
    const receiptInfo = data.receipt_info ? `<p><strong>현금영수증:</strong> ${data.receipt_info}</p>` : "";

    const paymentStatus = data.payment_confirmed
      ? `<p style="color:green;"><strong>입금 확인됨</strong> (입금일: ${new Date(data.payment_date).toISOString().split("T")[0]})</p>`
      : `<p style="color:red;"><strong>아직 입금 확인되지 않았습니다.</strong></p>`;

    resultDiv.innerHTML = `
      <p><strong>주문번호:</strong> ${data.order_id}</p>
      <p><strong>주문일시:</strong> ${orderDate}</p>
      <p><strong>이름:</strong> ${data.name}</p>
      <p><strong>전화번호:</strong> ${data.phone}</p>
      <p><strong>이메일:</strong> ${data.email}</p>
      <p><strong>주소:</strong> ${data.zipcode} ${data.address} ${data.address_detail}</p>
      ${receiptInfo}
      ${paymentStatus}
      <p><strong>총 금액:</strong> ₩${data.total.toLocaleString()} (배송비: ₩${shipping.toLocaleString()})</p>
      <table style="width:100%; margin-top: 10px; border-collapse: collapse;" border="1">
        <thead style="background:#f0f0f0;">
          <tr>
            <th>시리얼</th>
            <th>제품명</th>
            <th>수량</th>
            <th>단가</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
    `;
  }
};




console.log("index.js loaded successfully.");
