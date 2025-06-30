import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';

// ✅ Supabase 클라이언트
const supabase = createClient(
  'https://edgvrwekvnavkhcqwtxa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3Zyd2Vrdm5hdmtoY3F3dHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNDkzNTAsImV4cCI6MjA1OTgyNTM1MH0.Qg5zp-QZPFMcB1IsnxaCZMP7zh7fcrqY_6BV4hyp21E'
);

// ✅ 요소 참조
const fileInput = document.getElementById('fileInput');
const table = document.getElementById('compareTable');
const tableBody = table.querySelector('tbody');
const applyBtn = document.getElementById('applyBtn');

let comparisonData = [];

fileInput.addEventListener('change', handleFileUpload);
applyBtn.addEventListener('click', applyUpdates);

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const uploadedMap = new Map();
  rows.forEach(row => {
    if (row.item_code) {
      uploadedMap.set(String(row.item_code), {
        item_code: String(row.item_code),
        description: row.description || '',
        j_retail: Number(row.j_retail) || 0,
        price: Number(row.price) || 0
      });
    }
  });

  // ✅ 기존 DB 데이터 가져오기
  const { data: existing, error } = await supabase.from('tamiya_items').select('item_code, description, j_retail, price');
  if (error) {
    alert('DB 로딩 실패: ' + error.message);
    return;
  }
  const dbMap = new Map(existing.map(row => [String(row.item_code), row]));

  // ✅ 비교
  comparisonData = [];
  uploadedMap.forEach((newItem, code) => {
    const oldItem = dbMap.get(code);
    if (!oldItem || oldItem.j_retail !== newItem.j_retail || oldItem.price !== newItem.price) {
      comparisonData.push({
        item_code: code,
        description: newItem.description,
        old_j: oldItem?.j_retail ?? '-',
        new_j: newItem.j_retail,
        old_p: oldItem?.price ?? '-',
        new_p: newItem.price,
        isNew: !oldItem,
        apply: true
      });
    }
  });

  renderTable();
}

function renderTable() {
  table.style.display = '';
  tableBody.innerHTML = '';

  comparisonData.forEach((item, i) => {
    const tr = document.createElement('tr');
    tr.className = item.isNew ? 'new-item' : 'diff';
    tr.innerHTML = `
      <td>${item.item_code}</td>
      <td>${item.description}</td>
      <td>${item.old_j}</td>
      <td>${item.new_j}</td>
      <td>${item.old_p}</td>
      <td>${item.new_p}</td>
      <td><input type="checkbox" data-index="${i}" ${item.apply ? 'checked' : ''}></td>
    `;
    tableBody.appendChild(tr);
  });

  table.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const idx = Number(e.target.dataset.index);
      comparisonData[idx].apply = e.target.checked;
    });
  });
}

async function applyUpdates() {
  const updates = comparisonData.filter(row => row.apply);
  if (updates.length === 0) return alert('반영할 항목을 선택하세요.');

  let successCount = 0, failCount = 0;

  for (const item of updates) {
    const payload = {
      item_code: item.item_code,
      description: item.description,
      j_retail: item.new_j,
      price: item.new_p
    };

    let result;
    if (item.isNew) {
      result = await supabase.from('tamiya_items').insert([payload]);
    } else {
      result = await supabase.from('tamiya_items').update(payload).eq('item_code', item.item_code);
    }

    if (result.error) {
      console.error(`❌ ${item.item_code} 처리 실패:`, result.error.message);
      failCount++;
    } else {
      successCount++;
    }
  }

  alert(`✅ ${successCount}건 반영 완료\n❌ ${failCount}건 실패`);
  location.reload();
}
