@AGENTS.md

# 센 미디어 - 출연자 관리

센 미디어 제작진이 프로그램 출연자 정보를 등록·검색·공유하는 웹 앱. 배포: https://cencast.vercel.app
기능·권한·결정 기록은 [docs/PRD.md](docs/PRD.md), 파일 구조는 [README.md](README.md)에 있다.

## 작업 방식

- 사용자는 한국어로 소통하고, 화면 문구도 한국어로 쓴다. 지금 화면의 말투(존댓말, 짧은 안내문)를 따른다.
- 작업은 `main`이 아닌 브랜치에서 하고, 사용자가 요청하면 `main`에 반영한다. `main`이 바뀌면 Vercel이 자동 배포한다.
- 커밋 전에 `npx tsc --noEmit`, `npx eslint src`, `npm run build`를 통과시킨다.
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
