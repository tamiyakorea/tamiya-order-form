// 📦 Supabase 클라이언트 설정
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
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
  const container = document.getElementById("product").parentElement;

  // 기존 select 또는 input 제거
  const old = document.getElementById("product");
  if (old) old.remove();

  if (selected === "기타") {
    const input = document.createElement("input");
    input.type = "text";
    input.id = "product";
    input.placeholder = "모델명을 직접 입력하세요";
    input.required = true;
    container.appendChild(input);
  } else {
    const select = document.createElement("select");
    select.id = "product";
    select.innerHTML = '<option value="">선택</option>';

    if (subcategories[selected]) {
      subcategories[selected].forEach(item => {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
      });
    }

    container.appendChild(select);
  }
});

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}


// 메시지에서 정보 추출
function extractField(text, key) {
  const match = new RegExp(`${key}\\s*:\\s*(.*?)\\n`).exec(text + '\n');
  return match ? match[1].trim() : "";
}

window.searchOrderById = async function () {
  const input = document.getElementById("orderSearchInput").value.trim();
  const resultBox = document.getElementById("orderResult");
  resultBox.innerHTML = "";

  if (!input || input.length !== 12) {
    resultBox.innerHTML = "<p style='color:red;'>12자리 신청번호를 정확히 입력해주세요.</p>";
    return;
  }

  const { data, error } = await supabase
    .from("as_orders")
    .select("*")
    .eq("order_id", input)
    .single();

  if (error || !data) {
    resultBox.innerHTML = "<p style='color:red;'>해당 신청번호로 조회된 내역이 없습니다.</p>";
    return;
  }

  // 기본 필드 처리
  const [category, model] = (data.product_name || "").split(" > ");
  const message = data.message || "";
  const faultDate = extractField(message, "고장시기");
  const faultDescription = extractField(message, "고장증상");
  const requestDetails = extractField(message, "요청사항");

  // 진행 이력 필드
  const receivedDate = data.status_updated_at ? formatDate(data.status_updated_at) : "";
  const repairDetail = data.repair_detail || "";
  const repairCost = data.repair_cost || "";
  const paymentConfirmed = data.payment_confirmed;
  const paymentDate = data.payment_date ? formatDate(data.payment_date) : "";
  const completedDate = data.shipped_at ? formatDate(data.shipped_at) : "";
  const shippingInvoice = data.shipping_invoice || "";

  resultBox.innerHTML = `
    <div style="background:#f4f4f4; border:1px solid #ccc; padding:15px;">
      <h3>신청번호: ${data.order_id}</h3>

      <h4>고객 정보</h4>
      <ul>
        <li><strong>성명:</strong> ${data.name}</li>
        <li><strong>전화번호:</strong> ${data.phone}</li>
        <li><strong>이메일:</strong> ${data.email}</li>
        <li><strong>우편번호:</strong> ${data.zipcode}</li>
        <li><strong>주소:</strong> ${data.address} ${data.address_detail}</li>
      </ul>

      <h4>신청 제품</h4>
      <p><strong>종류:</strong> ${category || "-"}, <strong>모델명:</strong> ${model || "-"}</p>

      <h4>고장 내역</h4>
      <p>
        <strong>고장시기:</strong> ${faultDate || "-"}<br />
        <strong>고장증상:</strong><br />
        <div style="white-space: pre-wrap; border:1px solid #ccc; background:#fff; padding:10px;">
          ${faultDescription || "-"}
        </div><br />
        <strong>요청사항:</strong><br />
        <div style="white-space: pre-wrap; border:1px solid #ccc; background:#fff; padding:10px;">
          ${requestDetails || "-"}
        </div>
      </p>
  `;

  if (
    receivedDate || repairDetail || repairCost ||
    paymentConfirmed || completedDate || shippingInvoice
  ) {
    resultBox.innerHTML += `
      <h4>진행 이력</h4>
      <ul>
        ${receivedDate ? `<li><strong>입고일:</strong> ${receivedDate}</li>` : ""}
        ${repairDetail ? `<li><strong>수리내역:</strong> ${repairDetail}</li>` : ""}
        ${repairCost ? `<li><strong>수리비용:</strong> ₩${Number(repairCost).toLocaleString()}</li>` : ""}
        ${paymentConfirmed ? `<li><strong>입금 확인:</strong> 확인됨${paymentDate ? ` (${paymentDate})` : ""}</li>` : ""}
        ${completedDate ? `<li><strong>출고일:</strong> ${completedDate}</li>` : ""}
        ${shippingInvoice ? `<li><strong>송장번호:</strong> ${shippingInvoice} (우체국택배)</li>` : ""}
      </ul>
    `;
  }

  resultBox.innerHTML += `
    <h4>소비자 안내</h4>
    <p style="color:#a00;">※ 접수 내역 확인 후, 안내에 따라 제품을 발송해 주세요.</p>
    </div>
  `;
};


