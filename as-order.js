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
    items: [],
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

function generateOrderNumber() {
  const now = new Date();
  return (
    "AS" +
    now.getFullYear().toString().slice(2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "-" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0")
  );
}
