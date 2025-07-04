# 🇰🇷 Tamiya Order Form

한국타미야 주문·배송·A/S 통합 관리 시스템

본 프로젝트는 한국타미야의 고객 주문, 발주, 배송, A/S 처리까지 전 과정을 웹에서 통합 관리하기 위해 개발된  
**Supabase 기반의 내부 전용 웹 애플리케이션**입니다.  
고객과 관리자를 위한 직관적인 UI, 실시간 데이터 처리, 엑셀/PDF 생성 등 다양한 기능을 포함합니다.

---

## 🌍 배포 주소

- **개별주문 고객 주문 페이지**: [https://order.kidult-hobby.co.kr](https://order.kidult-hobby.co.kr)
- **개별주문 B2B 주문 페이지**: [https://order.kidult-hobby.co.kr/supplier-order.html](https://order.kidult-hobby.co.kr/supplier-order.html)
- **SANWA A/S 신청 페이지**: [https://order.kidult-hobby.co.kr/as-order.html](https://order.kidult-hobby.co.kr/as-order.html)
- **관리자 페이지**: [https://order.kidult-hobby.co.kr/admin/orders.html](https://order.kidult-hobby.co.kr/admin/orders.html) *(인증 필요)*

---

## 🚀 주요 기능

### 고객
- 타미야/산와 제품 주문 및 A/S 신청
- 주문 조회 및 입금 상태 확인
- 파일 업로드 및 현금영수증 입력
- FAQ 및 약관 동의

### 관리자
- 주문 관리: 조회, 수정, 삭제, 입금 처리
- 발주 관리: 입금 확인 시 자동 이동
- 배송 관리: 송장 등록, 배송완료 처리, 합배송/환불 관리
- A/S 처리: 접수 → 수리 → 청구 → 완료
- 상품 관리: 상품 단가 일괄 수정 및 검색
- 통계 분석: 품목별 주문 수, 고객별 주문 횟수, 배송 소요일 등 시각화 제공

---

## 📄 엑셀 주문서 자동 생성 기능

### 📌 개요

관리자 페이지에서 주문 항목을 선택 후 버튼 클릭 시,  
**타미야 전용 엑셀 주문서 양식**에 맞춰 서버에서 자동으로 주문서를 생성합니다.

- 제품코드 기준으로 8자리 / 5자리 구분
- 제품명, 단가, 수량, 합계 등 삽입
- 설명란 자동 생성 (제품코드 + 고객명 + 입금일)
- 총계 행 및 서명 이미지 포함
- 고객정보 포함/제외 2종 생성

> 생성된 파일은 `/output/` 폴더에 저장됩니다.

### 📂 예시 결과

<pre><code>output/ 
  ├── TKC250704-USER-8digit_보관용.xlsx ← 고객정보 포함 
  └── TKC250704-USER-8digit.xlsx ← 고객정보 제외 </code></pre>

---

## 🧱 디렉터리 구조

<pre><code>tamiya-order-form/ 
  ├── index.html # 고객 주문 페이지 
  ├── as-order.html # A/S 신청 페이지 
  ├── items.html # 상품 DB 관리 
  ├── order-stats.html # 통계 대시보드 
  ├── public/ # 프론트엔드 리소스 
  ├── output/ # 생성된 엑셀 저장 폴더 
  ├── admin/ 
  │ ├── orders.html # 주문 관리 
  │ ├── shipping.html # 배송 처리 
  │ ├── shipped.html # 배송 완료 
  │ ├── accounting.html # 회계 관리 
  │ ├── as-progress.html # A/S 수리 진행 
  │ └── as-charge.html # A/S 청구 관리 
  ├── supabase/ 
  │ └── functions/ # Edge Functions 
  ├── server.js # 주문서 엑셀 생성 서버 
  └── package.json </code></pre>


---

## 🗃 Supabase 테이블 요약

| 필드             | 설명                     |
| -------------- | ---------------------- |
| `order_id`     | 주문번호                   |
| `items`        | 주문 상품 배열 (JSON)        |
| `payment_date` | 입금일                    |
| `created_at`   | 주문일시                   |
| 기타 필드          | 주소, 연락처, 배송상태, 비고 등 포함 |



### `tamiya_items`
| 필드                                 | 설명        |
| ---------------------------------- | --------- |
| `item_code`                        | 제품코드 (PK) |
| `description`, `price`, `j_retail` | 제품명 및 단가  |
| `order_unit_pck`                   | 최소 주문 수량  |
| `hide_from_customer_search`        | 검색 제외 여부  |


### `as_orders`
| 필드                                                | 설명                  |
| ------------------------------------------------- | ------------------- |
| `name`, `phone`, `product_name`, `symptom`        | 고객/제품 정보            |
| `status`                                          | 접수 / 수리 / 청구 / 완료 등 |
| `repair_cost`, `receipt_code`, `shipping_invoice` | 수리비용 및 송장 정보        |
| `status_updated_at`                               | 상태 변경일              |


---

## ⚙️ Supabase Edge Functions

서버리스 API 호출을 위해 다음과 같은 Edge Functions을 사용합니다:

| 함수명                   | 설명                            |
| --------------------- | ----------------------------- |
| `get-product-by-code` | 제품코드로 단가 조회                   |
| `create-order`        | 주문 저장 처리                      |
| `upload-proof`        | 첨부파일(Supabase Storage) 업로드 처리 |
| `get-order-by-id`     | 주문번호로 상세 주문 정보 조회             |


### 🧪 로컬 실행

```bash
npx supabase start                    # Supabase 로컬 서버 실행
npx supabase functions serve         # Edge Function 테스트


🛠 기술 스택
분류	기술
Frontend	HTML, CSS, JavaScript (Vanilla)
Backend	Supabase (PostgreSQL + Edge Functions)
File Handling	Supabase Storage, ExcelJS, pdfmake
인증	Supabase Authentication
배포	Cloudflare Pages, Supabase Hosting

🔐 Supabase 인증 및 보안 (RLS)
로그인 인증: supabase.auth.getUser()

RLS 정책 예시:

sql
create policy "Allow read for authenticated users"
on orders for select
using (auth.role() = 'authenticated');
관리자 권한은 역할(Role)을 admin으로 구분하여 설정 가능

📜 라이선스
본 시스템은 한국타미야 사내 운영 목적의 전용 시스템이며, 외부에 공개/배포되지 않습니다.
문의 시 별도 허가를 통해 사용 가능합니다.

📬 문의
Email: trade@tamiya.co.kr
