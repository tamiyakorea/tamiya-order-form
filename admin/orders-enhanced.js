async function renderOrders(data) {
  const tbody = document.getElementById("orderBody");
  tbody.innerHTML = "";

  data.forEach(order => {
    const items = JSON.parse(order.items || "[]");
    items.forEach((item, idx) => {
      const isFirstRow = idx === 0;
      const row = document.createElement("tr");

      if (isFirstRow) {
        row.innerHTML += `
          <td rowspan="${items.length}"><button onclick="deleteOrder(${order.order_id})">삭제</button></td>
          <td rowspan="${items.length}">
            ${(order.proof_images || []).map((url, i) => `
              <a href="${url}" class="download-btn" target="_blank" download>파일${i + 1} 다운로드</a><br>
            `).join('')}
          </td>
          <td rowspan="${items.length}">${order.created_at}</td>
          <td rowspan="${items.length}">${order.order_id}</td>
          <td rowspan="${items.length}">${order.name}</td>
          <td rowspan="${items.length}">${order.phone}</td>
          <td rowspan="${items.length}">${order.email}</td>
          <td rowspan="${items.length}">${order.zipcode}</td>
          <td rowspan="${items.length}">${order.address}</td>
          <td rowspan="${items.length}">${order.address_detail}</td>
          <td rowspan="${items.length}">${order.receipt_info || ''}</td>
        `;
      }

      row.innerHTML += `
        <td>${item.code}</td>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>₩${item.price.toLocaleString()}</td>
      `;

      if (isFirstRow) {
        row.innerHTML += `
          <td rowspan="${items.length}">₩${order.total.toLocaleString()}</td>
          <td rowspan="${items.length}">${order.payment_confirmed ? '입금 확인' : '입금 전'}</td>
          <td rowspan="${items.length}">${order.po_info || ''}</td>
          <td rowspan="${items.length}">${order.remarks || ''}</td>
          <td rowspan="${items.length}">${item.arrival_status || ''}</td>
          <td rowspan="${items.length}">${item.arrival_due || ''}</td>
          <td rowspan="${items.length}"><button class="ship-btn" onclick="markAsReadyToShip(${order.order_id})">배송</button></td>
        `;
      }

      tbody.appendChild(row);
    });
  });
}

function markAsReadyToShip(orderId) {
  console.log("Marking order as ready to ship:", orderId);
}

function deleteOrder(orderId) {
  console.log("Deleting order:", orderId);
}
