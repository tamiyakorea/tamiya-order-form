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

  // ✅ 업로드된 데이터 구성
  const uploadedMap = new Map();
  const itemCodes = [];

  rows.forEach(row => {
    if (row.item_code) {
      const item_code = String(row.item_code);
      itemCodes.push(item_code);
      uploadedMap.set(item_code, {
        item_code,
        description: row.description || '',
        order_unit_ctn: Number(row.order_unit_ctn) || 0,
        order_unit_pck: Number(row.order_unit_pck) || 0,
        j_retail: Number(row.j_retail) || 0,
        price: Number(row.price) || 0,
        hide: row.hide_from_customer_search === true || row.hide_from_customer_search === 'TRUE' || row.hide_from_customer_search === 1
      });
    }
  });

  // ✅ 기존 DB 데이터 불러오기 (item_code 기준으로 in() 조회)
  const { data: existing, error } = await supabase
    .from('tamiya_items')
    .select('item_code, description, order_unit_ctn, order_unit_pck, j_retail, price, hide_from_customer_search')
    .in('item_code', itemCodes);

  if (error) {
    alert('DB 로딩 실패: ' + error.message);
    return;
  }

  const dbMap = new Map(existing.map(row => [String(row.item_code), row]));

  // ✅ 비교 처리
  comparisonData = [];
  uploadedMap.forEach((newItem, code) => {
    const oldItem = dbMap.get(code);
    const isDiff =
      !oldItem ||
      oldItem.j_retail !== newItem.j_retail ||
      oldItem.price !== newItem.price ||
      oldItem.order_unit_ctn !== newItem.order_unit_ctn ||
      oldItem.order_unit_pck !== newItem.order_unit_pck ||
      (oldItem.hide_from_customer_search ?? false) !== newItem.hide;

    if (isDiff) {
      comparisonData.push({
        item_code: code,
        description: newItem.description,
        old_j: oldItem?.j_retail ?? '-',
        new_j: newItem.j_retail,
        old_p: oldItem?.price ?? '-',
        new_p: newItem.price,
        old_ctn: oldItem?.order_unit_ctn ?? '-',
        new_ctn: newItem.order_unit_ctn,
        old_pck: oldItem?.order_unit_pck ?? '-',
        new_pck: newItem.order_unit_pck,
        old_hide: oldItem?.hide_from_customer_search ?? false,
        new_hide: newItem.hide,
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

  const previewLimit = 100;
  const toPreview = comparisonData.slice(0, previewLimit);

  toPreview.forEach((item, i) => {
    const tr = document.createElement('tr');
    tr.className = item.isNew ? 'new-item' : 'diff';
    tr.innerHTML = `
      <td>${item.item_code}</td>
      <td>${item.description}</td>
      <td>${item.old_j}</td>
      <td>${item.new_j}</td>
      <td>${item.old_p}</td>
      <td>${item.new_p}</td>
      <td>${item.old_ctn}</td>
      <td>${item.new_ctn}</td>
      <td>${item.old_pck}</td>
      <td>${item.new_pck}</td>
      <td>${item.old_hide ? '✔' : ''}</td>
      <td>${item.new_hide ? '✔' : ''}</td>
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

  if (comparisonData.length > previewLimit) {
    const info = document.createElement('div');
    info.style.marginTop = '10px';
    info.style.color = 'gray';
    info.innerText = `※ 총 ${comparisonData.length}건 중 상위 ${previewLimit}건만 미리보기로 표시됩니다.`;
    table.parentElement.appendChild(info);
  }
}

async function applyUpdates() {
  const updates = comparisonData.filter(row => row.apply);
  if (updates.length === 0) return alert('반영할 항목을 선택하세요.');

  let successCount = 0, failCount = 0;

  for (let i = 0; i < updates.length; i += 100) {
    const batch = updates.slice(i, i + 100);
    const inserts = batch.filter(b => b.isNew);
    const modifies = batch.filter(b => !b.isNew);

    // ✅ 1. 신규 항목은 한 번에 insert
    if (inserts.length > 0) {
      const payloads = inserts.map(toPayload);
      const { error } = await supabase.from('tamiya_items').insert(payloads);
      if (error) failCount += inserts.length;
      else successCount += inserts.length;
    }

    // ✅ 2. 수정 항목은 10건씩 병렬 update 처리
    for (let j = 0; j < modifies.length; j += 10) {
      const chunk = modifies.slice(j, j + 10);

      const updatePromises = chunk.map(item =>
        supabase.from('tamiya_items')
          .update(toPayload(item))
          .eq('item_code', item.item_code)
      );

      const results = await Promise.all(updatePromises);

      results.forEach(result => {
        if (result.error) failCount++;
        else successCount++;
      });
    }
  }

  alert(`✅ ${successCount}건 반영 완료\n❌ ${failCount}건 실패`);
  location.reload();
}

function toPayload(item) {
  return {
    item_code: item.item_code,
    description: item.description,
    order_unit_ctn: item.new_ctn,
    order_unit_pck: item.new_pck,
    j_retail: item.new_j,
    price: item.new_p,
    hide_from_customer_search: item.new_hide
  };
}
