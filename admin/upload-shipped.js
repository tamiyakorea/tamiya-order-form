import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

function generateOrderNumber() {
  const now = new Date();
  const MMDD = ("0" + (now.getMonth() + 1)).slice(-2) + ("0" + now.getDate()).slice(-2);
  const mmss = ("0" + now.getMinutes()).slice(-2) + ("0" + now.getSeconds()).slice(-2);
  const rand = Math.floor(10 + Math.random() * 90);
  return Number(MMDD + mmss + rand);
}

function parseItemsFromRow(row) {
  const items = [];
  for (let i = 1; i <= 10; i++) {
    const code = row[`serial_${i}`];
    const name = row[`product_name_${i}`];
    const qty = row[`qty_${i}`];
    const price = row[`price_${i}`];
    if (code && name && qty && price) {
      items.push({ code, name, qty: Number(qty), price: Number(price) });
    }
  }
  return items;
}

function excelDateToISOString(dateValue) {
  if (!dateValue) return null;
  if (typeof dateValue === 'number') {
    const date = new Date((dateValue - 25569) * 86400 * 1000);
    return date.toISOString();
  }
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

document.getElementById('excel-upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return alert("파일을 선택해주세요.");

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const orders = rows.map(row => {
    const items = parseItemsFromRow(row);
    const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);

    return {
      order_id: row.order_id ? Number(row.order_id) : generateOrderNumber(),
      name: row.customer_name,
      phone: row.phone,
      email: row.email || null,
      zipcode: String(row.zipcode || ''),
      address: row.address,
      address_detail: row.address_detail,
      receipt_info: row.receipt_info || null,
      tracking_number: row.tracking_number || null,
      tracking_date: excelDateToISOString(row.tracking_date),
      items,
      total,
      is_ordered: true,
      is_shipped: true,
      is_delivered: true,
      created_at: excelDateToISOString(row.order_date) || new Date().toISOString(),
      payment_date: excelDateToISOString(row.payment_date)
    };
  });

  const { error } = await supabase.from('orders').insert(orders);
  if (error) {
    console.error(error);
    alert("업로드 실패: " + error.message);
  } else {
    alert("배송 완료 주문 업로드 완료!");
    window.close();
  }
});
