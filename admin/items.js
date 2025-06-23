import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase 클라이언트 생성
const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

const tableBody = document.querySelector("#itemsTable tbody");
const searchInput = document.getElementById("searchInput");
const toggleEditBtn = document.getElementById("toggleEditBtn");
const deleteBtn = document.getElementById("deleteSelectedBtn");
const addBtn = document.getElementById("addItemBtn");
const paginationContainer = document.getElementById("pagination");

const confirmModal = document.getElementById("confirmModal");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const deleteModal = document.getElementById("deleteModal");
const deleteYes = document.getElementById("deleteYes");
const deleteNo = document.getElementById("deleteNo");
const addModal = document.getElementById("addModal");
const addSave = document.getElementById("addSave");
const addCancel = document.getElementById("addCancel");

let originalData = [];
let editData = [];
let isEditing = false;
let currentPage = 1;
const pageSize = 50;
let totalPages = 1;

deleteBtn.disabled = true;
addBtn.disabled = true;

function escapeHTML(str) {
  if (typeof str !== 'string') str = String(str ?? '');
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderTable(data) {
  tableBody.innerHTML = "";
  if (!data.length) {
    tableBody.innerHTML = '<tr><td colspan="7">데이터가 없습니다</td></tr>';
    return;
  }
  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="row-check" data-id="${row.item_code}" /></td>
      <td>${escapeHTML(row.item_code)}</td>
      <td contenteditable="${isEditing}" data-key="description" data-id="${row.item_code}">${escapeHTML(row.description)}</td>
      <td contenteditable="${isEditing}" data-key="order_unit_ctn" data-id="${row.item_code}">${row.order_unit_ctn ?? ''}</td>
      <td contenteditable="${isEditing}" data-key="order_unit_pck" data-id="${row.item_code}">${row.order_unit_pck ?? ''}</td>
      <td contenteditable="${isEditing}" data-key="j_retail" data-id="${row.item_code}">${row.j_retail ?? ''}</td>
      <td contenteditable="${isEditing}" data-key="price" data-id="${row.item_code}">${row.price ?? ''}</td>
    `;
    tr.dataset.id = row.item_code;
    tableBody.appendChild(tr);
  });
  updateRowHighlight();
  if (isEditing) addEditListeners();
  document.querySelectorAll('.row-check').forEach(cb => cb.addEventListener('change', updateRowHighlight));
}

function updateRowHighlight() {
  document.querySelectorAll("tr").forEach(row => {
    const cb = row.querySelector(".row-check");
    row.style.backgroundColor = cb?.checked ? "#eef5ff" : "";
  });
}

function addEditListeners() {
  document.querySelectorAll("td[contenteditable='true']").forEach(cell => {
    cell.addEventListener("input", () => {
      const id = cell.dataset.id;
      const key = cell.dataset.key;
      const value = cell.textContent.trim();
      const idx = editData.findIndex(r => String(r.item_code) === id);
      if (idx !== -1) editData[idx][key] = isNaN(value) || key === "description" ? value : Number(value);
    });
  });
}

async function loadData(page = 1) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const [{ data, error }, { count }] = await Promise.all([
    supabase.from("tamiya_items").select("*", { count: "exact" }).range(from, to).order("item_code"),
    supabase.from("tamiya_items").select("*", { count: "exact" })
  ]);
  if (error || !data) return alert("불러오기 실패: " + (error?.message || ""));
  originalData = JSON.parse(JSON.stringify(data));
  editData = JSON.parse(JSON.stringify(data));
  totalPages = Math.ceil(count / pageSize);
  currentPage = page;
  renderTable(editData);
  renderPaginationControls();
}

function renderPaginationControls() {
  paginationContainer.innerHTML = "";
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.disabled = true;
    btn.addEventListener("click", () => loadData(i));
    paginationContainer.appendChild(btn);
  }
}

searchInput.addEventListener("input", async () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return loadData(1); // 검색어 없을 경우 첫 페이지 로드

  const { data, error } = await supabase
    .from("tamiya_items")
    .select("*")
    .ilike("description", `%${q}%`)
    .order("item_code");

  if (error) return alert("검색 실패: " + error.message);

  originalData = JSON.parse(JSON.stringify(data));
  editData = JSON.parse(JSON.stringify(data));
  totalPages = 1;
  currentPage = 1;
  renderTable(editData);
  renderPaginationControls();
});

toggleEditBtn.addEventListener("click", () => {
  if (!isEditing) {
    isEditing = true;
    toggleEditBtn.textContent = "저장하기";
    deleteBtn.disabled = false;
    addBtn.disabled = false;
    renderTable(editData);
  } else {
    confirmModal.style.display = "block";
  }
});

confirmNo.addEventListener("click", () => {
  isEditing = false;
  toggleEditBtn.textContent = "수정하기";
  deleteBtn.disabled = true;
  addBtn.disabled = true;
  confirmModal.style.display = "none";
  editData = JSON.parse(JSON.stringify(originalData));
  renderTable(editData);
});

confirmYes.addEventListener("click", async () => {
  confirmModal.style.display = "none";
  await saveEdits();
});

async function saveEdits() {
  for (const row of editData) {
    const original = originalData.find(r => String(r.item_code) === String(row.item_code));
    const updates = {};
    for (const key of ['description', 'order_unit_ctn', 'order_unit_pck', 'j_retail', 'price']) {
      if (!original || row[key] !== original[key]) updates[key] = row[key];
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("tamiya_items").update(updates).eq("item_code", row.item_code);
      if (error) alert(`${row.item_code} 업데이트 실패: ${error.message}`);
    }
  }
  alert("✅ 저장 완료");
  isEditing = false;
  toggleEditBtn.textContent = "수정하기";
  deleteBtn.disabled = true;
  addBtn.disabled = true;
  await loadData(currentPage);
}

deleteBtn.addEventListener("click", () => {
  if (!isEditing) return;
  const checked = [...document.querySelectorAll('.row-check:checked')];
  if (!checked.length) return alert("삭제할 항목을 선택하세요.");
  deleteModal.style.display = "block";
});

deleteNo.addEventListener("click", () => {
  deleteModal.style.display = "none";
});

deleteYes.addEventListener("click", async () => {
  const checkedIds = [...document.querySelectorAll('.row-check:checked')].map(cb => cb.dataset.id);
  const { error: deleteError } = await supabase.from("tamiya_items").delete().in("item_code", checkedIds);
  if (deleteError) return alert("삭제 실패: " + deleteError.message);
  editData = editData.filter(row => !checkedIds.includes(String(row.item_code)));
  originalData = originalData.filter(row => !checkedIds.includes(String(row.item_code)));
  await saveEdits();
  deleteModal.style.display = "none";
});

addBtn.addEventListener("click", () => {
  if (!isEditing) return;
  addModal.style.display = "block";
});

addCancel.addEventListener("click", () => {
  addModal.style.display = "none";
});

addSave.addEventListener("click", async () => {
  const newItem = {
    item_code: document.getElementById("add_item_code").value.trim(),
    description: document.getElementById("add_description").value.trim(),
    order_unit_ctn: Number(document.getElementById("add_order_unit_ctn").value),
    order_unit_pck: Number(document.getElementById("add_order_unit_pck").value),
    j_retail: Number(document.getElementById("add_j_retail").value),
    price: Number(document.getElementById("add_price").value)
  };
  if (!newItem.item_code || !newItem.description) return alert("제품코드와 제품명은 필수입니다.");
  const { error } = await supabase.from("tamiya_items").insert([newItem]);
  if (error) return alert("추가 실패: " + error.message);
  alert("✅ 항목 추가 완료");
  addModal.style.display = "none";
  editData.push(newItem);
  await saveEdits();
});

loadData();
