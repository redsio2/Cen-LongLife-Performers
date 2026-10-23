# 인생의 연장전 · 출연자 관리

CEN [인생의 연장전] 프로그램 출연자 정보를 등록하고 관리하는 웹 애플리케이션입니다.

## 지금 되는 것

- **출연자 등록** (`/new`): 방송회차, 방송일, 아이템, 출연자 이름, 출연자 유형(악화사례자·성공사례자·체험단·지인·기타), 생년월일, 첨부파일(사진·신분증·기타 서류)
- **만 나이 자동 계산**: 생년월일로 계산하며, 폼에서는 방송일 기준과 오늘 기준을 함께 보여 줍니다.
- **출연자 목록** (`/`): 최신 등록순. 만 나이 기준일을 오늘 / 각 방송일 / 날짜 지정 중에서 고를 수 있습니다.

아직 백엔드가 없어 출연자와 첨부파일은 **브라우저의 IndexedDB에만** 저장됩니다. 다른 기기나 다른 사람에게는 보이지 않습니다.

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인합니다.

## 구조

| 경로 | 내용 |
| --- | --- |
| `src/app/page.tsx` | 홈(출연자 목록) |
| `src/app/new/page.tsx` | 출연자 등록 |
| `src/components/PerformerForm.tsx` | 등록 폼, 첨부파일 영역 |
| `src/components/PerformerList.tsx` | 목록, 만 나이 기준일 선택 |
| `src/lib/performer.ts` | 출연자 타입, 유형·첨부 분류, 입력 검증 |
| `src/lib/date.ts` | 만 나이 계산, 날짜 표기 |
| `src/lib/store.ts` | 브라우저 저장소(IndexedDB). 백엔드를 붙일 때 이 파일만 바꾸면 됩니다. |

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.
