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

function openDataSync() {
    window.open('items-upload.html', '_blank', 'width=1000,height=800');
  }

function renderPaginationControls() {
  paginationContainer.innerHTML = "";

  // ◀️ 이전 버튼
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "◀ 이전";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => loadData(currentPage - 1);
  paginationContainer.appendChild(prevBtn);

  // 🔢 페이지 정보
  const pageInfo = document.createElement("span");
  pageInfo.textContent = ` 페이지 ${currentPage} / ${totalPages} `;
  pageInfo.style.margin = "0 10px";
  paginationContainer.appendChild(pageInfo);

  // ▶️ 다음 버튼
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "다음 ▶";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => loadData(currentPage + 1);
  paginationContainer.appendChild(nextBtn);

  // 📥 페이지 입력창
  const input = document.createElement("input");
  input.type = "number";
  input.min = 1;
  input.max = totalPages;
  input.placeholder = "이동할 페이지";
  input.style.width = "80px";
  input.style.marginLeft = "15px";
  paginationContainer.appendChild(input);

  // 🚀 이동 버튼
  const goBtn = document.createElement("button");
  goBtn.textContent = "이동";
  goBtn.onclick = () => {
    const page = parseInt(input.value);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      loadData(page);
    } else {
      alert(`1부터 ${totalPages} 사이의 페이지 번호를 입력하세요.`);
    }
  };
  paginationContainer.appendChild(goBtn);
}

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

searchInput.addEventListener("input", async () => {
  const q = searchInput.value.trim();
  if (!q) return loadData(1);

  let query = supabase.from("tamiya_items").select("*").order("item_code");

  if (/^\d+$/.test(q)) {
    // 숫자일 경우 item_code 정수 검색
    query = query.eq("item_code", Number(q));
  } else {
    // 문자열일 경우 description 부분검색
    query = query.ilike("description", `%${q.toLowerCase()}%`);
  }

  const { data, error } = await query;
  if (error) return alert("검색 실패: " + error.message);

  originalData = JSON.parse(JSON.stringify(data));
  editData = JSON.parse(JSON.stringify(data));
  totalPages = 1;
  currentPage = 1;
  renderTable(editData);
  renderPaginationControls();
});

document.getElementById("detailSearchBtn").addEventListener("click", () => {
  document.getElementById("detailSearchModal").style.display = "block";
});

document.getElementById("detailSearchExecute").addEventListener("click", async () => {
  const input = document.getElementById("detailSearchInput").value;
  const codes = input
    .split("\n")
    .map(line => line.trim().replace(/,$/, ''))
    .filter(code => code.length > 0);

  if (codes.length === 0) {
    alert("제품코드를 입력하세요.");
    return;
  }

  const { data, error } = await supabase
    .from("tamiya_items")
    .select("*")
    .in("item_code", codes.map(code => isNaN(code) ? code : Number(code)));

  if (error) {
    alert("상세검색 실패: " + error.message);
    return;
  }

  originalData = JSON.parse(JSON.stringify(data));
  editData = JSON.parse(JSON.stringify(data));
  currentPage = 1;
  totalPages = 1;
  renderTable(editData);
  renderPaginationControls();
  document.getElementById("detailSearchModal").style.display = "none";
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
  alert("저장 완료");
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
  alert("항목 추가 완료");
  addModal.style.display = "none";
  editData.push(newItem);
  await saveEdits();
});

loadData();
