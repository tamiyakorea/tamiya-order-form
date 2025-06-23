import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase 클라이언트 생성
const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

const tableBody = document.querySelector("#itemsTable tbody");
const searchInput = document.getElementById("searchInput");

let originalData = [];

function escapeHTML(str) {
  if (typeof str !== 'string') str = String(str ?? '');
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
}

function renderTable(data) {
  tableBody.innerHTML = "";
  if (!data.length) {
    tableBody.innerHTML = '<tr><td colspan="6">데이터가 없습니다</td></tr>';
    return;
  }

  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHTML(row.item_code)}</td>
      <td contenteditable="true" data-key="description" data-id="${row.item_code}">${escapeHTML(row.description)}</td>
      <td contenteditable="true" data-key="order_unit_ctn" data-id="${row.item_code}">${row.order_unit_ctn ?? ''}</td>
      <td contenteditable="true" data-key="order_unit_pck" data-id="${row.item_code}">${row.order_unit_pck ?? ''}</td>
      <td contenteditable="true" data-key="j_retail" data-id="${row.item_code}">${row.j_retail ?? ''}</td>
      <td contenteditable="true" data-key="price" data-id="${row.item_code}">${row.price ?? ''}</td>
    `;
    tableBody.appendChild(tr);
  });

  addEditListeners();
}

function addEditListeners() {
  const editableCells = document.querySelectorAll("td[contenteditable='true']");
  editableCells.forEach(cell => {
    cell.addEventListener("blur", async () => {
      const newValue = cell.textContent.trim();
      const key = cell.dataset.key;
      const id = cell.dataset.id;

      const row = originalData.find(r => String(r.item_code) === id);
      if (!row || String(row[key]) === newValue) return; // 변경 없음

      const value = isNaN(newValue) || key === 'description' ? newValue : Number(newValue);

      const { error } = await supabase
        .from("tamiya_items")
        .update({ [key]: value })
        .eq("item_code", id);

      if (error) {
        alert("업데이트 실패: " + error.message);
        cell.style.backgroundColor = "#fdd";
      } else {
        cell.classList.add("edit-success");
        setTimeout(() => cell.classList.remove("edit-success"), 1000);
        row[key] = value;
      }
    });
  });
}

async function loadData() {
  const { data, error } = await supabase.from("tamiya_items").select("*").order("item_code", { ascending: true });

  if (error) {
    alert("데이터 불러오기 실패: " + error.message);
    return;
  }

  originalData = data;
  renderTable(data);
}

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = originalData.filter(row =>
    row.item_code.toString().includes(q) || (row.description?.toLowerCase().includes(q))
  );
  renderTable(filtered);
});

loadData();
