# 센 미디어 - 출연자 관리

센 미디어(CEN) 프로그램(인생의 연장전, 질병의 법칙, 중독자들 등) 출연자 정보를 등록하고 관리하는 웹 애플리케이션입니다.

## 지금 되는 것

- **회원 로그인**: 관리자가 발급한 등록번호(CEN-0001~CEN-9999)와 비밀번호로 들어갑니다. 비밀번호를 여러 번 틀리면 잠시 막힙니다.
- **권한**: 회원마다 보기 전용 / 편집 가능 / 관리자 중 하나입니다. 권한은 화면뿐 아니라 데이터베이스(RLS)에서도 검사합니다.
- **회원 관리** (`/admin`, 관리자만): 등록번호 발급, 권한 변경, 비밀번호 재설정, 차단·해제
- **비밀번호 변경** (`/account`): 받은 비밀번호를 직접 바꿉니다.
- **출연자 등록** (`/new`, 편집 가능 이상): 프로그램명, 방송회차, 방송일, 아이템, 출연자 이름, 출연자 유형(악화사례자·성공사례자·체험단·의사·지인·기타), 출연료, 생년월일, 질병 유형·메모(선택), 첨부파일(사진·신분증·기타 서류)
- **만 나이 자동 계산**: 생년월일로 계산하며, 폼에서는 방송일 기준과 오늘 기준을 함께 보여 줍니다.
- **출연자 목록** (`/`): 최신 등록순. 만 나이 기준일을 오늘 / 각 방송일 / 날짜 지정 중에서 고를 수 있습니다.
- **수정·삭제** (편집 가능 이상): 목록 카드의 '수정'으로 등록 내용과 첨부파일을 고치고, '삭제'는 한 번 더 확인한 뒤 지웁니다.

출연자는 Supabase 데이터베이스에, 첨부파일은 회원만 열 수 있는 비공개 저장소에 보관됩니다. 모든 회원이 같은 목록을 봅니다.

## 처음 시작할 때

회원이 한 명도 없으면 로그인 화면 대신 **첫 관리자 설정** 화면이 나옵니다. 여기서 관리자 등록번호 `CEN-0001`의 비밀번호를 정하면, 그 뒤로는 `/admin`에서 다른 회원의 번호를 발급합니다.

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인합니다. 개발 서버도 배포된 사이트와 같은 Supabase 프로젝트를 씁니다.

## 구조

| 경로 | 내용 |
| --- | --- |
| `src/app/page.tsx` | 홈(출연자 목록) |
| `src/app/new/page.tsx` | 출연자 등록 |
| `src/app/admin/page.tsx` | 회원 관리 |
| `src/app/account/page.tsx` | 비밀번호 변경 |
| `src/components/PerformerForm.tsx` | 등록·수정 폼, 첨부파일 영역 |
| `src/components/PerformerList.tsx` | 목록, 만 나이 기준일 선택, 수정·삭제 |
| `src/components/MemberGate.tsx` | 로그인·첫 관리자 설정 화면, 권한별 화면 가리기 |
| `src/components/MemberAdmin.tsx` | 회원 관리 화면 |
| `src/lib/performer.ts` | 출연자 타입, 유형·첨부 분류, 입력 검증 |
| `src/lib/date.ts` | 만 나이 계산, 날짜 표기 |
| `src/lib/supabase.ts` | Supabase 연결(공개 가능한 publishable key) |
| `src/lib/member.ts` | 로그인, 회원 상태, 권한 |
| `src/lib/store.ts` | 출연자·첨부파일 읽기와 쓰기 |
| `supabase/migrations/` | 데이터베이스 테이블과 권한(RLS) 정책 |
| `supabase/functions/admin-members/` | 회원 발급·수정 Edge Function(관리자만) |

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase.
