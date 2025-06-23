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

  document.querySelectorAll('.row-check').forEach(cb =>
    cb.addEventListener('change', updateRowHighlight)
  );
}

function updateRowHighlight() {
  document.querySelectorAll("tr").forEach(row => {
    const cb = row.querySelector(".row-check");
    if (cb?.checked) row.style.backgroundColor = "#eef5ff";
    else row.style.backgroundColor = "";
  });
}

function addEditListeners() {
  const editableCells = document.querySelectorAll("td[contenteditable='true']");
  editableCells.forEach(cell => {
    cell.addEventListener("input", () => {
      const id = cell.dataset.id;
      const key = cell.dataset.key;
      const value = cell.textContent.trim();
      const idx = editData.findIndex(r => String(r.item_code) === id);
      if (idx !== -1) {
        editData[idx][key] = isNaN(value) || key === "description" ? value : Number(value);
      }
    });
  });
}

async function loadData() {
  const { data, error } = await supabase.from("tamiya_items").select("*").order("item_code", { ascending: true });
  if (error) return alert("불러오기 실패: " + error.message);
  originalData = JSON.parse(JSON.stringify(data));
  editData = JSON.parse(JSON.stringify(data));
  renderTable(editData);
}

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = editData.filter(row =>
    row.item_code.toString().includes(q) || (row.description?.toLowerCase().includes(q))
  );
  renderTable(filtered);
});

toggleEditBtn.addEventListener("click", () => {
  if (!isEditing) {
    isEditing = true;
    toggleEditBtn.textContent = "저장하기";
    renderTable(editData);
  } else {
    confirmModal.style.display = "block";
  }
});

confirmNo.addEventListener("click", () => {
  isEditing = false;
  editData = JSON.parse(JSON.stringify(originalData));
  toggleEditBtn.textContent = "수정하기";
  confirmModal.style.display = "none";
  renderTable(editData);
});

confirmYes.addEventListener("click", async () => {
  confirmModal.style.display = "none";
  isEditing = false;
  toggleEditBtn.textContent = "수정하기";

  for (const row of editData) {
    const original = originalData.find(r => String(r.item_code) === String(row.item_code));
    if (!original) continue;

    const updates = {};
    for (const key of ['description', 'order_unit_ctn', 'order_unit_pck', 'j_retail', 'price']) {
      if (row[key] !== original[key]) {
        updates[key] = row[key];
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("tamiya_items").update(updates).eq("item_code", row.item_code);
      if (error) alert(`🚨 ${row.item_code} 업데이트 실패: ${error.message}`);
    }
  }

  originalData = JSON.parse(JSON.stringify(editData));
  renderTable(editData);
  alert("✅ 수정사항 저장 완료!");
});

deleteBtn.addEventListener("click", () => {
  const checked = [...document.querySelectorAll('.row-check:checked')];
  if (!checked.length) return alert("삭제할 항목을 선택하세요.");
  deleteModal.style.display = "block";
});

deleteNo.addEventListener("click", () => {
  deleteModal.style.display = "none";
});

deleteYes.addEventListener("click", async () => {
  const checkedIds = [...document.querySelectorAll('.row-check:checked')].map(cb => cb.dataset.id);
  const { error } = await supabase.from("tamiya_items").delete().in("item_code", checkedIds);
  if (error) alert("삭제 실패: " + error.message);
  else alert("✅ 삭제 완료");
  deleteModal.style.display = "none";
  await loadData();
});

addBtn.addEventListener("click", () => {
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
    price: Number(document.getElementById("add_price").value),
  };

  if (!newItem.item_code || !newItem.description) {
    alert("제품코드와 제품명은 필수입니다.");
    return;
  }

  const { error } = await supabase.from("tamiya_items").insert([newItem]);
  if (error) {
    alert("추가 실패: " + error.message);
  } else {
    alert("✅ 항목 추가 완료");
    addModal.style.display = "none";
    await loadData();
  }
});

loadData();
