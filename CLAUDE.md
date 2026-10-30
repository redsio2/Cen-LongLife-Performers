# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# 센 미디어 - 출연자 관리

센 미디어 제작진이 프로그램 출연자 정보를 등록·검색·공유하는 웹 앱. 배포: https://cencast.vercel.app
기능·권한·결정 기록은 [docs/PRD.md](docs/PRD.md), 파일 구조는 [README.md](README.md)에 있다.

## 명령어

```bash
npm run dev          # 개발 서버 http://localhost:3000 (배포 사이트와 같은 Supabase를 쓴다)
npx tsc --noEmit     # 타입 검사
npx eslint src       # lint (supabase/ 는 Deno 코드라 tsconfig·eslint에서 뺐다)
npm run build        # 배포용 빌드. 사전 렌더링 오류는 여기서만 드러난다
```

테스트 코드와 테스트 명령은 없다. 위 세 검사 + 개발 서버 확인으로 검증한다.

## 구조 요약

- **화면 가리기**: `layout.tsx`가 모든 페이지를 `MemberGate`로 감싼다. 로그인 전에는 로그인(또는 회원 0명일 때 첫 관리자 설정) 화면을 띄우고 페이지는 `hidden`으로 숨긴다. 회원이 바뀌면 `key`로 페이지를 새로 그려 데이터를 다시 불러온다. 권한별 페이지(`/new`, `/admin`)는 `RequireRole`로 한 번 더 가린다.
- **로그인 상태**: `src/lib/member.ts`가 Supabase Auth 세션 + `members` 행(번호·이름·역할·활성)을 모듈 단위 저장소로 들고 있고, 컴포넌트는 `useMember()`(`useSyncExternalStore`)로 읽는다. `undefined` = 확인 중, `null` = 로그인 안 함. 권한 판단은 `canEdit()`.
- **데이터 읽기·쓰기**: 출연자·첨부파일 접근은 모두 `src/lib/store.ts`를 거친다. DB의 snake_case 행 ↔ 앱의 `Performer`(camelCase, `src/lib/performer.ts`)를 여기서 바꾼다. 첨부파일은 `attachments` 버킷에 무작위 경로로 올리고, 열 때는 `signedUrl()`(1시간, 캐시)로 연다. 출연자 항목을 추가하면 `performer.ts`의 타입, `store.ts`의 `fromRow`/`toRow`, 폼, 목록, 마이그레이션을 함께 바꾼다.
- **회원 관리**: 회원 생성·권한·비밀번호·차단은 secret key가 필요해 Edge Function `admin-members`만 한다(`callAdmin()`으로 호출). 함수는 `verify_jwt = false`로 배포되어 있고, 호출자가 활성 관리자인지 직접 확인한다. 배포는 Supabase MCP의 `deploy_edge_function`으로 했다.
- **검색·내보내기**: 검색·필터는 받아 온 목록을 브라우저에서 거른다(`src/lib/search.ts`). 엑셀(`write-excel-file/universal`)과 zip(`fflate`)은 `src/lib/download.ts`에서 버튼을 누를 때만 불러온다.

## 작업 방식

- 사용자는 한국어로 소통하고, 화면 문구도 한국어로 쓴다. 지금 화면의 말투(존댓말, 짧은 안내문)를 따른다.
- 작업은 `main`이 아닌 브랜치에서 하고, 사용자가 요청하면 `main`에 반영한다. `main`이 바뀌면 Vercel이 자동 배포한다.
- 커밋 전에 위 명령어의 세 검사(타입·lint·빌드)를 통과시킨다.
- 화면에 보이는 변경은 개발 서버(`npm run dev`, http://localhost:3000)에서 직접 확인한다.

## 데이터와 백엔드

- Supabase 프로젝트 `cen-performers`(id `wqwpnaudcxiuchofpiiq`, 서울, 무료 요금제)를 쓴다. 개발 서버와 배포 사이트가 같은 데이터베이스를 쓰므로, 시험용 데이터는 확인 후 반드시 지운다.
- 테이블이나 정책을 바꾸면 같은 SQL을 `supabase/migrations/`에 파일로 남긴다. 회원 관리 Edge Function 코드는 `supabase/functions/admin-members/`에 있다.
- 권한(보기 전용 / 편집 가능 / 관리자)은 화면에서 가리는 것과 별개로 RLS 정책으로 서버에서 막는다. 새 테이블에도 RLS를 켜고 정책을 둔다.
- secret key는 코드·브라우저·저장소에 넣지 않는다. 브라우저에는 publishable key만 둔다(`src/lib/supabase.ts`).

## 바꾸면 안 되는 것

- `src/lib/member.ts`와 Edge Function의 `MEMBER_EMAIL_DOMAIN`(`cenlonglifeperformers.vercel.app`): 등록번호를 로그인 ID로 바꾸는 꼬리표다. 사이트 주소와 무관하며, 바꾸면 기존 계정으로 로그인할 수 없다.
- 관리자 CEN-0001의 비밀번호는 사용자만 정한다. 계정을 만들거나 비밀번호를 대신 입력하지 않는다.

## Next.js 16 주의

- `cacheComponents`가 켜져 있다. 서버 렌더링 중에 페이지를 빼면(`return null`) "instant navigation" 검증 오류가 나므로, 로그인·권한 화면은 children을 렌더링하되 `hidden`으로 숨긴다(`MemberGate`, `RequireRole`).
- 사전 렌더링 중에는 난수·현재 시각을 쓰지 않는다(예: `useState(() => crypto.getRandomValues(...))`는 빌드 오류).
