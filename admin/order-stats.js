import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm';

const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'' // 배포 시 보안 필요
);

Chart.defaults.animation.duration = 1000;
Chart.defaults.animation.easing = 'easeOutQuart';
Chart.defaults.plugins.legend.display = false;

function getDateRange(period) {
  const today = new Date();
  let from = new Date();

  if (period === '3m') from.setMonth(today.getMonth() - 3);
  else if (period === '6m') from.setMonth(today.getMonth() - 6);
  else if (period === '12m') from.setFullYear(today.getFullYear() - 1);
  else from = new Date('2000-01-01');

  return { from: from.toISOString(), to: today.toISOString() };
}

function dateDiffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

let charts = {}; // 기존 차트 파괴용 저장소

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
    if (!repeatMap.has(key)) repeatMap.set(key, new Set());
    repeatMap.get(key).add(order.order_id);

    if (order.tracking_date) {
      totalShipDays += dateDiffDays(order.created_at, order.tracking_date);
      shipCount++;
    }

    const month = order.created_at?.slice(0, 7);
    monthlyCount[month] = (monthlyCount[month] || 0) + 1;

    const items = typeof order.items === 'string'
      ? JSON.parse(order.items || '[]')
      : (order.items || []);

    for (const item of items) {
      itemMap.set(item.name, (itemMap.get(item.name) || 0) + item.qty);
      itemRevenue.set(item.name, (itemRevenue.get(item.name) || 0) + item.qty * item.price);

      if (!itemPriceMap.has(item.name)) itemPriceMap.set(item.name, []);
      itemPriceMap.get(item.name).push(item.price);

      totalItems += item.qty;
    }
  }

  // 통계 숫자 출력
  document.getElementById("totalOrders").textContent = `${totalOrders.toLocaleString()} 건`;
  document.getElementById("totalSales").textContent = `₩${totalAmount.toLocaleString()}`;
  document.getElementById("totalItems").textContent = `${totalItems.toLocaleString()} 개`;
  document.getElementById("avgShipDays").textContent = shipCount ? `${(totalShipDays / shipCount).toFixed(1)} 일` : '-';
  const repeatCount = [...repeatMap.values()].filter(set => set.size > 1).length;
  const repeatRate = totalOrders ? (repeatCount / repeatMap.size) * 100 : 0;
  document.getElementById("repeatRate").textContent = `${repeatRate.toFixed(1)} %`;

  // 데이터 가공 및 차트 렌더링
  drawBarChart("topItemsChart", itemMap, "주문 수량", true);
  drawBarChart("topSalesItemsChart", itemRevenue, "총 매출액");
  drawBarChart("topExpensiveItemsChart",
    new Map([...itemPriceMap.entries()]
      .map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length])),
    "평균 단가");

  drawBarChart("topCustomersChart",
    new Map([...customerMap.entries()]
      .map(([key, count]) => {
        const [name, phone] = key.split('|');
        return [`${name} (${phone})`, count];
      })),
    "주문 횟수", true
  );

  // 월별 주문 추이
  const sortedMonths = Object.keys(monthlyCount).sort();
  drawChart("monthlyChart", {
    labels: sortedMonths,
    datasets: [{
      label: "주문 건수",
      data: sortedMonths.map(m => monthlyCount[m]),
      backgroundColor: '#007bff'
    }]
  });
}

// 차트 그리기 공통 함수
function drawChart(id, data, type = 'bar', indexAxis = 'x') {
  const ctx = document.getElementById(id).getContext('2d');
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type,
    data,
    options: {
      responsive: true,
      indexAxis,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Map 기반 수평 바차트
function drawBarChart(canvasId, map, label, horizontal = false) {
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  drawChart(canvasId, {
    labels: sorted.map(([k]) => k),
    datasets: [{
      label,
      data: sorted.map(([, v]) => v),
      backgroundColor: 'rgba(0,123,255,0.6)'
    }]
  }, 'bar', horizontal ? 'y' : 'x');
}

// 자동 로딩
document.addEventListener("DOMContentLoaded", loadStats);
