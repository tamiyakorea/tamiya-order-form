# 🇰🇷 Tamiya Order Form

한국타미야 주문·배송·A/S 통합 관리 시스템

본 프로젝트는 한국타미야의 고객 주문, 발주, 배송, A/S 처리까지 전 과정을 웹에서 통합 관리하기 위해 개발된 **Supabase 기반 웹 애플리케이션**입니다. 고객과 관리자 모두를 위한 직관적인 UI와, 실시간 데이터 저장·처리를 제공합니다.

---

## 🌍 배포 주소

- **고객용 주문 페이지**: [https://order.kidult-hobby.co.kr](https://order.kidult-hobby.co.kr)
- **관리자 페이지**: [https://order.kidult-hobby.co.kr/admin/orders.html](https://order.kidult-hobby.co.kr/admin/orders.html) *(인증 필요)*

---

## 🚀 주요 기능

### 고객
- 타미야/산와 제품 주문 및 A/S 신청
- 주문 조회 및 입금 상태 확인
- 파일 업로드 및 현금영수증 정보 입력
- FAQ 및 약관 동의 절차 제공

### 관리자
- 주문 관리: 주문 조회, 수정, 삭제, 입금 확인
- 발주 관리: 입금된 주문 자동 이동
- 배송 관리: 송장 등록, 배송 완료 처리, 합배송, 환불 관리
- A/S 관리: 수리접수, 청구비용, 수리 완료 처리
- 상품 관리: 상품 단가 일괄 업로드 및 수정
- 통계 분석: 고객별 주문 분석, 배송 소요일, 품목별 매출 집계

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| **Frontend** | HTML, CSS, JavaScript (Vanilla) |
| **Backend** | [Supabase](https://supabase.com/) |
| **Storage** | Supabase Storage (파일 업로드) |
| **Auth** | Supabase Authentication |
| **PDF/Excel 처리** | [pdfmake](https://pdfmake.github.io/), [SheetJS](https://sheetjs.com/) |
| **배포** | Cloudflare Pages, Supabase Edge Functions |

---

## 📁 디렉터리 구조

tamiyakorea/tamiya-order-form/
├── index.html # 고객 주문 페이지

├── as-order.html # A/S 신청 페이지

├── admin/

│ ├── orders.html # 관리자 주문 관리

│ ├── shipping.html # 배송 처리

│ ├── shipped.html # 배송 완료

│ ├── accounting.html # 회계 관리

│ ├── as-progress.html # A/S 수리 진행

│ └── as-charge.html # A/S 청구 관리

├── items.html # 상품 DB 관리

├── order-stats.html # 통계 대시보드

└── supabase/functions/ # Edge Functions

---

## 📄 Supabase 테이블 구조 요약

### `orders`
| 필드 | 설명 |
|------|------|
| `order_id` | 주문번호 |
| `items` | 주문 상품 목록(JSON) |
| `payment_status` | `입금대기`, `입금확인` |
| `shipping_status` | 주문 상태 흐름 |
| `payment_date` | 입금 확인일 |
| `created_at` | 주문일시 |
| 기타 주소, 연락처, 비고 등 포함 |

### `tamiya_items`
| 필드 | 설명 |
|------|------|
| `item_code` | 제품 코드 (PK) |
| `description`, `price`, `j_retail` | 제품명, 단가 |
| `order_unit_pck` | 최소 주문 수량 |
| `hide_from_customer_search` | 검색 제외 여부 |

### `as_orders`
| 필드 | 설명 |
|------|------|
| `name`, `phone`, `product_name`, `symptom` | 고객/제품 정보 |
| `status` | `접수대기`, `수리진행`, `청구관리`, `처리완료` |
| `status_updated_at` | 상태 변경일 |
| `repair_cost`, `shipping_invoice`, `receipt_code` 등 |

---

## ⚙️ Supabase Edge Function 사용법

### 주요 함수

| 함수명 | 설명 |
|--------|------|
| `get-product-by-code` | 제품 코드로 상품 정보 조회 |
| `create-order` | 주문 생성 |
| `upload-proof` | 첨부파일 업로드 처리 |
| `get-order-by-id` | 주문번호로 주문 상세 조회 |

### 로컬 실행 / 배포

```bash
# Supabase CLI 로그인 및 초기화
npx supabase login
npx supabase init

# 함수 로컬 실행
npx supabase functions serve get-product-by-code

# 함수 배포
npx supabase functions deploy get-product-by-code

로컬 개발 및 테스트
필수 설치
Node.js + npm

Supabase CLI

Live Server (VS Code 확장)

테스트 절차
bash
코드 복사
# Supabase 프로젝트 로컬 실행
npx supabase start

# Live Server 등으로 index.html 테스트
.env 또는 supabase.js에 URL 및 익명 키 필요

로컬 Edge Function은 http://localhost:54321/functions/v1/... 으로 호출됨


🔐 Supabase 인증 및 RLS 정책
1. Supabase Auth 사용
관리자 페이지는 supabase.auth.getUser()로 로그인 확인

supabase.auth.signInWithPassword()로 로그인 구현

로그인 후 localStorage에 세션 저장

2. RLS 설정 예시
sql
코드 복사
-- orders 테이블 RLS 정책 예시
create policy "Allow read for authenticated users"
on orders for select
using (auth.role() = 'authenticated');
관리자 전용 권한은 role = 'admin' 기반으로 설정 가능

as_orders, tamiya_items 등 테이블도 동일한 방식 적용

주의: anon 키를 사용하는 클라이언트 접근 시 RLS 정책에 따라 데이터 접근 여부가 결정됩니다.

📜 라이선스
본 프로젝트는 한국타미야 사내 운영 목적의 전용 시스템으로, 외부 공개용 라이선스를 제공하지 않습니다.

📬 문의
Email: trade@tamiya.co.kr
