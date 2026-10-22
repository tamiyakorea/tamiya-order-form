// 📦 Supabase 클라이언트 설정
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

// 📋 제품 분류 데이터
const productOptions = {
  송신기: ["MT-44", "MT-5", "MX-6", "M17", "M12S", "M12", "MT-S", "MX-V", "M17S"],
  수신기: ["RX-45", "RX-461", "RX-381", "RX-462", "RX-472", "RX-481", "RX-482", "RX-47T", "RX-481WP", "RX-371_WP", "RX-493", "RX-492B", "RX-481", "RX-493I", "RX-492I"],
  서보: ["SRG-LS BLACK", "PGS-CLE", "PGS-LH2", "PGS-XB2", "PGS-LH", "ERS-XT", "PGS-CX", "PGS-CL", "PGS-LH TYPE-D", "PGS-XB", "PGS-XR", "SRG-BX Brushless Torque Type", "SRG-BS Brushless Torque Type", "SRM-102"],
};

// 🧠 옵션 연동 처리
document.addEventListener("DOMContentLoaded", () => {
  const checkInspection = document.getElementById("checkInspection");
  const checkRepair = document.getElementById("checkRepair");
  const inspectionOptions = document.getElementById("inspectionOptions");
  const costNotice = document.getElementById("costNotice");

  const checkInspectionLabel = checkInspection.parentElement;
  const checkRepairLabel = checkRepair.parentElement;

  checkInspection.addEventListener("change", () => {
    if (checkInspection.checked) {
      checkRepair.checked = false;
      checkRepairLabel.style.display = "none";
      inspectionOptions.style.display = "block";
    } else {
      checkRepairLabel.style.display = "inline-block";
      inspectionOptions.style.display = "none";
      costNotice.style.display = "none";
      document.querySelectorAll('input[name="inspectionFollowup"]').forEach(el => el.checked = false);
    }
  });

  checkRepair.addEventListener("change", () => {
    if (checkRepair.checked) {
      checkInspection.checked = false;
      checkInspectionLabel.style.display = "none";
      inspectionOptions.style.display = "none";
      costNotice.style.display = "none";
      document.querySelectorAll('input[name="inspectionFollowup"]').forEach(el => el.checked = false);
    } else {
      checkInspectionLabel.style.display = "inline-block";
    }
  });

  document.querySelectorAll('input[name="inspectionFollowup"]').forEach(el => {
    el.addEventListener("change", () => {
      costNotice.style.display = el.value === "repair" ? "block" : "none";
    });
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

// 🔹 현금영수증 입력창 보이기/숨기기 토글 함수
window.toggleCashReceipt = function () {
  const isChecked = document.getElementById("receiptRequested").checked;
  const section = document.getElementById("cashReceiptSection");
  if (section) {
    section.style.display = isChecked ? "block" : "none";
  }
};

// 🔹 현금영수증 번호 형식 정리 (- 자동 삽입)
function formatReceiptInfo(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (digits.length === 10) return digits.replace(/(\d{3})(\d{2})(\d{5})/, "$1-$2-$3");
  return digits;
}

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

  //필수 확인 사항 검사 (총 6개)
  const totalAgreements = 6;
  let allAgreed = true;

  for (let i = 1; i <= totalAgreements; i++) {
    const checkedRadio = document.querySelector(`input[name="agree${i}"]:checked`);
    // 선택을 안 했거나 '아니오(no)'를 선택한 경우
    if (!checkedRadio || checkedRadio.value === 'no') {
      allAgreed = false;
      break;
    }
  }

  if (!allAgreed) {
    alert("전체 필수 확인 사항을 확인하시고 모든 항목에 '네'를 선택하셔야 신청이 가능합니다.");
    return; // 더 이상 진행되지 않고 함수 종료
  }
  
  const name = get("customerName").value.trim();
  const phone = get("phoneNumber").value.trim();
  const email = get("email").value.trim();
  const zipcode = get("zipcode").value.trim();
  const address = get("address").value.trim();
  const addressDetail = get("addressDetail").value.trim();
  // 🔹 현금영수증 입력값 확인
  const receiptChecked = get("receiptRequested").checked;
  const receiptInfoRaw = receiptChecked ? get("receiptInfo").value.trim() : null;
  const receiptInfo = receiptInfoRaw ? formatReceiptInfo(receiptInfoRaw) : null;

  if (receiptChecked && !receiptInfo) {
    alert("현금영수증 발행을 위한 휴대폰 번호 또는 사업자등록번호를 입력해주세요.");
    return;
  }
  const category = get("category").value;
  const product = get("product").value;

  const requestType = checkRepair.checked ? '수리요청' : (checkInspection.checked ? '점검요청' : null);
if (!requestType) {
  alert("점검 요청 또는 수리 요청 중 하나를 선택해주세요.");
  return;
}

let inspectionFollowup = null;
let showCostNotice = false;

if (requestType === '점검요청') {
  const selected = document.querySelector('input[name="inspectionFollowup"]:checked');
  if (!selected) {
    alert("점검 시 수리 여부를 선택해주세요.");
    return;
  }
  inspectionFollowup = selected.value === 'repair' ? '수리요청함' : '수리요청안함';
  showCostNotice = selected.value === 'repair';
}

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
    request_type: requestType,
    inspection_followup: inspectionFollowup,
    show_cost_notice: showCostNotice,
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
  const shippingInvoice = data.delivery_invoice || "";

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
        ${delivery_invoice ? `<li><strong>송장번호:</strong> ${delivery_invoice}</li>` : ""}
      </ul>
    `;
  }

  resultBox.innerHTML += `
    <h4>소비자 안내</h4>
    <p style="color:#a00;">※ 접수 내역 확인 후, 안내에 따라 제품을 발송해 주세요.</p>
    </div>
  `;
};

// ✅ FAQ 아코디언 동작
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".faq-question").forEach((question) => {
    question.addEventListener("click", () => {
      const answer = question.nextElementSibling;

      // 클래스 토글
      question.classList.toggle("active");
      answer.classList.toggle("open");
    });
  });
});

