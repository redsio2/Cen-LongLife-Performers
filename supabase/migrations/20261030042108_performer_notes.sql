-- 출연자별 메모 여러 개(출연자 1 : 메모 N). 기존 performers.memo 칸과 데이터는 그대로 둔다.
create table public.performer_notes (
  -- 브라우저가 메모 초안마다 미리 정한 id. 같은 제출이 두 번 와도 한 번만 저장된다.
  id uuid primary key default gen_random_uuid(),
  performer_id uuid not null references public.performers (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null
);
-- 한 출연자의 메모를 최신순으로 읽는다.
create index performer_notes_performer_created_idx on public.performer_notes (performer_id, created_at desc);
create index performer_notes_created_by_idx on public.performer_notes (created_by);

alter table public.performer_notes enable row level security;
revoke all on public.performer_notes from anon;

create policy "notes: members read" on public.performer_notes
  for select to authenticated using ((select private.my_role()) is not null);
-- 편집 가능 이상만 쓴다. 작성자는 본인으로만 남길 수 있다.
create policy "notes: editors insert" on public.performer_notes
  for insert to authenticated
  with check ((select private.can_edit()) and created_by = (select auth.uid()));
-- 수정·삭제 정책은 두지 않는다(메모는 기록으로 남긴다). 출연자를 지우면 함께 지워진다.
