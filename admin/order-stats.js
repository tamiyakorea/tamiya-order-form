import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'' // 배포 시 보안 필요
);

// ✅ 기간 계산
function getDateRange(period) {
  const today = new Date();
  let from = new Date();

  if (period === '3m') from.setMonth(today.getMonth() - 3);
  else if (period === '6m') from.setMonth(today.getMonth() - 6);
  else if (period === '12m') from.setFullYear(today.getFullYear() - 1);
  else from = new Date('2000-01-01'); // 전체 기간

  return { from: from.toISOString(), to: today.toISOString() };
}

// ✅ 날짜 차이 (일 단위)
function dateDiffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

// ✅ 통계 불러오기
window.loadStats = async function () {
  const period = document.getElementById('periodSelect').value;
  const keyword = document.getElementById('searchKeyword').value.trim().toLowerCase();
  const { from, to } = getDateRange(period);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', from)
    .lte('created_at', to);

  if (error || !orders) {
    alert("주문 데이터를 불러올 수 없습니다.");
    return;
  }

  const filtered = keyword
    ? orders.filter(o =>
        o.name?.toLowerCase().includes(keyword) ||
        o.order_id?.toString().includes(keyword)
      )
    : orders;

  renderStats(filtered);
};

function renderStats(orders) {
  const itemMap = new Map();
  const customerMap = new Map();
  const itemRevenue = new Map();
  const itemPriceMap = new Map();
  const monthlyCount = {};
  const repeatMap = new Map();

  let totalOrders = 0;
  let totalItems = 0;
  let totalAmount = 0;
  let totalShipDays = 0;
  let shipCount = 0;

  for (const order of orders) {
    totalOrders++;
    totalAmount += order.total || 0;

    const key = `${order.name}|${order.phone}`;
    customerMap.set(key, (customerMap.get(key) || 0) + 1);

    // 반복 주문 카운트
    if (!repeatMap.has(key)) repeatMap.set(key, new Set());
    repeatMap.get(key).add(order.order_id);

    // 배송 소요일
    if (order.tracking_date) {
      const diff = dateDiffDays(order.created_at, order.tracking_date);
      totalShipDays += diff;
      shipCount++;
    }

    const month = order.created_at?.slice(0, 7); // yyyy-mm
    monthlyCount[month] = (monthlyCount[month] || 0) + 1;

    const items = typeof order.items === 'string'
      ? JSON.parse(order.items || '[]')
      : (order.items || []);

    for (const item of items) {
      const key = item.name;
      itemMap.set(key, (itemMap.get(key) || 0) + item.qty);
      itemRevenue.set(key, (itemRevenue.get(key) || 0) + item.qty * item.price);

      if (!itemPriceMap.has(key)) itemPriceMap.set(key, []);
      itemPriceMap.get(key).push(item.price);

      totalItems += item.qty;
    }
  }

  // 📦 상위 아이템
  updateTable("topItemsTable", [...itemMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, qty], i) => `<tr><td>${i + 1}</td><td>${name}</td><td>${qty}</td></tr>`));

  // 💰 매출 상위 아이템
  updateTable("topSalesItemsTable", [...itemRevenue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, amt], i) => `<tr><td>${i + 1}</td><td>${name}</td><td>₩${amt.toLocaleString()}</td></tr>`));

  // 💎 고가 아이템
  updateTable("topExpensiveItemsTable", [...itemPriceMap.entries()]
    .map(([name, prices]) => [name, prices.reduce((a, b) => a + b, 0) / prices.length])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, price], i) => `<tr><td>${i + 1}</td><td>${name}</td><td>₩${Math.round(price).toLocaleString()}</td></tr>`));

  // 👤 단골 고객
  updateTable("topCustomersTable", [...customerMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, cnt], i) => {
      const [name, phone] = key.split('|');
      return `<tr><td>${i + 1}</td><td>${name}</td><td>${phone}</td><td>${cnt}</td></tr>`;
    }));

  // 📈 월별 추이
  const sortedMonths = Object.keys(monthlyCount).sort();
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (window.monthChart) window.monthChart.destroy();
  window.monthChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedMonths,
      datasets: [{
        label: '주문 건수',
        data: sortedMonths.map(m => monthlyCount[m]),
        backgroundColor: '#007bff'
      }]
    }
  });

  // 📊 수치 표시
  document.getElementById("totalOrders").textContent = `${totalOrders.toLocaleString()} 건`;
  document.getElementById("totalSales").textContent = `₩${totalAmount.toLocaleString()}`;
  document.getElementById("totalItems").textContent = `${totalItems.toLocaleString()} 개`;
  document.getElementById("avgShipDays").textContent = shipCount ? `${(totalShipDays / shipCount).toFixed(1)} 일` : '-';

  // 🔁 반복 주문 비율
  const repeatCount = [...repeatMap.values()].filter(set => set.size > 1).length;
  const repeatRate = totalOrders ? (repeatCount / repeatMap.size) * 100 : 0;
  document.getElementById("repeatRate").textContent = `${repeatRate.toFixed(1)} %`;
}

function updateTable(tableId, rows) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = rows.join('');
}

// 자동 로딩
document.addEventListener("DOMContentLoaded", loadStats);
