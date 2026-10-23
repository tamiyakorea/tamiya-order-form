import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://edgvrwekvnavkhcqwtxa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E"
);

// 🔍 주문번호 추출
const orderId = new URLSearchParams(window.location.search).get("orderId");

if (!orderId || isNaN(Number(orderId))) {
  alert("잘못된 접근입니다. 주문번호가 없습니다.");
} else {
  loadOrder(orderId);
}

// ✅ 주문 데이터 불러오기
async function loadOrder(orderId) {
  try {
    const res = await fetch(
      "https://edgvrwekvnavkhcqwtxa.supabase.co/functions/v1/get-as-order-by-id",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: Number(orderId) }) // int8 대응
      }
    );

    const result = await res.json();
    if (!res.ok || !result.data) throw new Error(result.error || "데이터 없음");

    const data = result.data;
    document.getElementById("orderId").textContent = data.order_id;
    document.getElementById("createdAt").textContent = formatDate(data.created_at);
    document.getElementById("name").textContent = data.name || "-";
    document.getElementById("phone").textContent = data.phone || "-";
    document.getElementById("email").textContent = data.email || "-";
    document.getElementById("address").textContent =
      `${data.zipcode || ''} ${data.address || ''} ${data.address_detail || ''}`;
    const receiptEl = document.getElementById("receiptInfo");
    if (receiptEl) {
      receiptEl.textContent = data.receipt_info || "-";
    }
  } catch (err) {
    alert("신청 정보를 불러오지 못했습니다.");
    console.error("❌ Edge Function 오류:", err);
  }
}

// ✅ 날짜 포맷 함수
function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ✅ PDF 다운로드
function downloadPDF() {
  const createdAt = document.getElementById("createdAt")?.textContent || "-";
  const name = document.getElementById("name")?.textContent || "-";
  const phone = document.getElementById("phone")?.textContent || "-";
  const email = document.getElementById("email")?.textContent || "-";
  const address = document.getElementById("address")?.textContent || "-";
  const doc = {
  content: [
    { text: "A/S 신청 확인서", style: "header" },
    { text: " " },

    {
      style: "infoTable",
      table: {
        widths: ['30%', '70%'],
        body: [
          ["주문번호", orderId],
          ["신일시", createdAt],
          ["고객명", name],
          ["연락처", phone],
          ["이메일", email],
          ["주소", address],
          ["현금영수증", document.getElementById("receiptInfo")?.textContent || "-"],
        ],
      },
      layout: "lightHorizontalLines"
    },

    { text: " ", margin: [0, 10] },

    {
      style: "noticeBox",
      table: {
        widths: ["*"],
        body: [
          [{
            text: [
              { text: "수리 요청 안내\n\n", bold: true, fontSize: 13 },
              "A/S 신청이 정상적으로 접수되었습니다.\n",
              "수리 요청품을 아래 주소로 보내주시기 바랍니다:\n\n",
              "서울특별시 서초구 바우뫼로 215, 2층\n",
              "070-8671-7440 / 수신자: SANWA A/S 담당자\n\n",
              "수리 기간은 1~3개월 이상 소요될 수 있으며,\n수리 완료 후 비용이 청구됩니다."
            ]
          }]
        ]
      },
      layout: "noBorders"
    }
  ],
  styles: {
    header: {
      fontSize: 20,
      bold: true,
      alignment: "center",
      margin: [0, 10]
    },
    infoTable: {
      fontSize: 11,
      margin: [0, 0, 0, 10]
    },
    noticeBox: {
      fontSize: 11,
      margin: [0, 0, 0, 10]
    }
  },
  defaultStyle: {
    font: "NanumGothic"
  }
};

  pdfMake.createPdf(doc).download(`AS_${document.getElementById("orderId").textContent}.pdf`);
}

// ✅ 홈으로 이동
function goHome() {
  window.location.href = "https://order.kidult-hobby.co.kr/as-order.html";
}

// ✅ 전역 등록
window.goHome = goHome;
window.downloadPDF = downloadPDF;
