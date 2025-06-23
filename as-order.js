// 📦 Supabase 클라이언트 설정
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz...생략...'
);

// 📋 제품 분류 데이터
const productOptions = {
  송신기: ["MT-44", "MT-5", "MX-6", "M17", "M12S", "M12", "MT-S", "MX-V"],
  수신기: ["RX-45", "RX-461", "RX-381", "RX-462", "RX-472", "RX-481", "RX-482", "RX-47T", "RX-481WP", "RX-371_WP", "RX-493", "RX-492B", "RX-481", "RX-493I", "RX-492I"],
  서보: ["SRG-LS BLACK", "PGS-CLE", "PGS-LH2", "PGS-XB2", "PGS-LH", "ERS-XT", "PGS-CX", "PGS-CL", "PGS-LH TYPE-D", "PGS-XB", "PGS-XR", "SRG-BX Brushless Torque Type", "SRG-BS Brushless Torque Type", "SRM-102"],
};

// 🧠 옵션 연동 처리
document.addEventListener('DOMContentLoaded', () => {
  const categorySelect = document.getElementById("category");
  const productSelect = document.getElementById("product");

  categorySelect.addEventListener("change", () => {
    const selectedCategory = categorySelect.value;
    productSelect.innerHTML = "";
    if (productOptions[selectedCategory]) {
      productOptions[selectedCategory].sort((a, b) => a.localeCompare(b, 'ko')).forEach(item => {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        productSelect.appendChild(option);
      });
    }
  });
});

// 📮 다음 주소 검색
window.execDaumPostcode = function () {
  new daum.Postcode({
    oncomplete: function (data) {
      document.getElementById('zipcode').value = data.zonecode;
      document.getElementById('address').value = data.roadAddress;
      document.getElementById('addressDetail').focus();
    }
  }).open();
};

// 🧾 주문번호 생성
function generateOrderNumber() {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return Number(`${yyyy}${MM}${dd}${random}`);  // ✅ 숫자형 반환
}

// 📤 신청서 제출
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

  if (!name || !phone || !email || !zipcode || !address || !addressDetail || !category || !product) {
    alert("모든 필수 정보를 입력해주세요.");
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
    status: '접수대기',
    status_updated_at: null,
    progress_stage: 'received',
    progress_updated_at: null,
  };

  try {
    const response = await fetch("https://edgvrwekvnavkhcqwtxa.functions.supabase.co/create-as-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert("신청이 완료되었습니다! 신청번호: " + orderId);
      window.location.href = "as-complete.html?orderId=" + orderId;
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


const subcategories = {
  "송신기": ["MT-44", "MT-5", "MX-6", "M17", "M12S", "M12", "MT-S", "MX-V"],
  "수신기": ["RX-45", "RX-461", "RX-381", "RX-462", "RX-472", "RX-481", "RX-482", "RX-47T", "RX-481WP", "RX-371_WP", "RX-493", "RX-492B", "RX-493I", "RX-492I"],
  "서보": ["SRG-LS BLACK", "PGS-CLE", "PGS-LH2", "PGS-XB2", "PGS-LH", "ERS-XT", "PGS-CX", "PGS-CL", "PGS-LH TYPE-D", "PGS-XB", "PGS-XR", "SRG-BX Brushless Torque Type", "SRG-BS Brushless Torque Type", "SRM-102"]
};

document.getElementById("category").addEventListener("change", function () {
  const selected = this.value;
  const productSelect = document.getElementById("product");
  productSelect.innerHTML = '<option value="">선택</option>';

  if (subcategories[selected]) {
    subcategories[selected].forEach(item => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      productSelect.appendChild(option);
    });
  }
});

// 현금영수증 요청 여부에 따라 입력창 표시/숨김
window.toggleCashReceipt = function () {
  const checked = document.getElementById("receiptRequested").checked;
  document.getElementById("receiptInfoWrapper").style.display = checked ? "block" : "none";
};


