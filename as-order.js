// as-order.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://edgvrwekvnavkhcqwtxa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E"
);

window.execDaumPostcode = function () {
  new daum.Postcode({
    oncomplete: function (data) {
      document.getElementById("zipcode").value = data.zonecode;
      document.getElementById("address").value = data.roadAddress || data.jibunAddress;
    },
  }).open();
};

window.toggleCashReceipt = function () {
  document.getElementById("cashReceiptSection").style.display =
    document.getElementById("receiptRequested").checked ? "block" : "none";
};

// 대분류/소분류 연동
const productOptions = {
  송신기: ["MT-44", "MT-5", "MX-6", "M17", "M12S", "M12", "MT-S", "MX-V"],
  수신기: ["RX-45", "RX-461", "RX-381", "RX-462", "RX-472", "RX-481", "RX-482", "RX-47T", "RX-481WP", "RX-371_WP", "RX-493", "RX-492B", "RX-481", "RX-493I", "RX-492I"],
  서보: ["SRG-LS BLACK", "PGS-CLE", "PGS-LH2", "PGS-XB2", "PGS-LH", "ERS-XT", "PGS-CX", "PGS-CL", "PGS-LH TYPE-D", "PGS-XB", "PGS-XR", "SRG-BX Brushless Torque Type", "SRG-BS Brushless Torque Type", "SRM-102"],
  기타: ["기타"]
};

window.addEventListener("DOMContentLoaded", () => {
  const categorySelect = document.getElementById("category");
  const productSelect = document.getElementById("product");

  categorySelect.addEventListener("change", () => {
    const selectedCategory = categorySelect.value;
    productSelect.innerHTML = "<option value=''>선택</option>";

    if (selectedCategory && productOptions[selectedCategory]) {
      productOptions[selectedCategory]
      .slice()
      .sort((a, b) => a.localeCompare(b, 'ko'))
      .forEach(option => {
        const el = document.createElement("option");
        el.value = option;
        el.textContent = option;
        productSelect.appendChild(el);
      });
    }
  });
});

window.confirmOrder = async function () {
  const get = (id) => document.getElementById(id);

  const name = get("customerName").value.trim();
  const phone = get("phoneNumber").value.trim();
  const email = get("email").value.trim();
  const zipcode = get("zipcode").value.trim();
  const address = get("address").value.trim();
  const addressDetail = get("addressDetail").value.trim();
  const receiptChecked = get("receiptRequested").checked;
  const receiptInfo = receiptChecked ? get("receiptInfo").value.trim() : null;

  const category = get("category").value;
  const product = get("product").value;

  const faultDate = get("faultDate").value.trim();
  const faultDescription = get("faultDescription").value.trim();
  const requestDetails = get("requestDetails").value.trim();

  if (!name || !phone || !email || !zipcode || !address || !addressDetail) {
    alert("모든 고객 정보를 입력해주세요.");
    return;
  }
  if (!category || !product) {
    alert("제품 정보를 모두 선택해주세요.");
    return;
  }

  const orderId = generateOrderNumber();

  const payload = {
    order_id: orderId,
    name,
    phone,
    email,
    zipcode,
    address,
    address_detail: addressDetail,
    receipt_info: receiptInfo,
    product_name: `${category} > ${product}`,
    message: `고장시기: ${faultDate}\n고장증상: ${faultDescription}\n요청사항: ${requestDetails}`,
    proof_images: [],
    order_items: [],
    total: 0,
    created_at: new Date().toISOString(),
  };

  try {
    const response = await fetch("https://edgvrwekvnavkhcqwtxa.functions.supabase.co/create-as-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert("신청이 완료되었습니다! 신청번호: " + orderId);
      window.location.href = "as-confirm.html?orderId=" + orderId;
    } else {
      const res = await response.json();
      console.error("저장 오류:", res.error);
      alert("신청 저장에 실패했습니다.");
    }
  } catch (err) {
    console.error("신청 처리 중 오류:", err);
    alert("시스템 오류가 발생했습니다.");
  }
};

window.searchOrderById = async function () {
  const input = document.getElementById("orderSearchInput").value.trim();
  if (!input || isNaN(input)) {
    alert("정확한 신청번호를 입력해주세요.");
    return;
  }

  const response = await fetch("https://edgvrwekvnavkhcqwtxa.functions.supabase.co/get-order-by-id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: Number(input) }),
  });

  const resultDiv = document.getElementById("orderResult");
  const result = await response.json();

  if (response.ok && result.data) {
    const data = result.data;
    const orderDate = new Date(data.created_at).toISOString().split("T")[0];
    resultDiv.innerHTML = `
      <p><strong>신청번호:</strong> ${data.order_id}</p>
      <p><strong>신청일:</strong> ${orderDate}</p>
      <p><strong>성명:</strong> ${data.name}</p>
      <p><strong>이메일:</strong> ${data.email}</p>
      <p><strong>연락처:</strong> ${data.phone}</p>
      <p><strong>주소:</strong> ${data.zipcode} ${data.address} ${data.address_detail}</p>
      <p><strong>제품명:</strong> ${data.product_name}</p>
      <p><strong>요청 내용:</strong><br>${(data.message || '').replace(/\n/g, '<br>')}</p>
    `;
  } else {
    resultDiv.innerHTML = "<p style='color:red;'>신청 정보를 찾을 수 없습니다.</p>";
  }
};

function generateOrderNumber() {
  const now = new Date();
  const MMDD = ("0" + (now.getMonth() + 1)).slice(-2) + ("0" + now.getDate()).slice(-2);
  const mmss = ("0" + now.getMinutes()).slice(-2) + ("0" + now.getSeconds()).slice(-2);
  const rand = Math.floor(10 + Math.random() * 90);
  return Number(MMDD + mmss + rand);
}

console.log("as-order.js loaded successfully.");
