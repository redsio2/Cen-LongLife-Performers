-- 회원: 등록번호(CEN-0001~CEN-9999)마다 Supabase Auth 계정 하나. 관리자만 Edge Function으로 만들고 고친다.
create type public.member_role as enum ('viewer', 'editor', 'admin');

create table public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  number text not null unique check (number ~ '^CEN-[0-9]{4}$' and number <> 'CEN-0000'),
  name text not null default '',
  role public.member_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS 정책에서 쓰는 도우미. 노출되지 않는 private 스키마에 둔다.
create schema if not exists private;
grant usage on schema private to authenticated;

create function private.my_role()
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.members m where m.id = (select auth.uid()) and m.active
$$;

create function private.can_edit()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.my_role() in ('editor', 'admin'), false)
$$;

revoke all on function private.my_role() from public;
revoke all on function private.can_edit() from public;
grant execute on function private.my_role() to authenticated;
grant execute on function private.can_edit() to authenticated;

alter table public.members enable row level security;

create policy "members: read own row or all as admin"
  on public.members for select to authenticated
  using (id = (select auth.uid()) or (select private.my_role()) = 'admin');
-- 쓰기 정책은 없다. 회원 추가·수정은 관리자 Edge Function(secret key)만 한다.

-- 출연자
create table public.performers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  program text not null,
  episode integer not null check (episode >= 1),
  air_date date not null,
  item text not null,
  name text not null,
  type text not null check (type in ('악화사례자', '성공사례자', '체험단', '의사', '지인', '기타')),
  type_etc text not null default '',
  friend_memo text not null default '',
  birth date not null,
  fee text not null,
  disease text not null default '',
  memo text not null default ''
);
create index performers_created_at_idx on public.performers (created_at desc);
create index performers_created_by_idx on public.performers (created_by);

create table public.performer_attachments (
  id uuid primary key default gen_random_uuid(),
  performer_id uuid not null references public.performers (id) on delete cascade,
  category text not null check (category in ('photo', 'id', 'doc')),
  name text not null,
  size bigint not null,
  type text not null default '',
  -- storage 'attachments' 버킷 안의 경로
  path text not null unique,
  created_at timestamptz not null default now()
);
create index performer_attachments_performer_idx on public.performer_attachments (performer_id);

alter table public.performers enable row level security;
alter table public.performer_attachments enable row level security;

create policy "performers: members read" on public.performers
  for select to authenticated using ((select private.my_role()) is not null);
create policy "performers: editors insert" on public.performers
  for insert to authenticated with check ((select private.can_edit()));
create policy "performers: editors update" on public.performers
  for update to authenticated using ((select private.can_edit())) with check ((select private.can_edit()));
create policy "performers: editors delete" on public.performers
  for delete to authenticated using ((select private.can_edit()));

create policy "attachments: members read" on public.performer_attachments
  for select to authenticated using ((select private.my_role()) is not null);
create policy "attachments: editors insert" on public.performer_attachments
  for insert to authenticated with check ((select private.can_edit()));
create policy "attachments: editors delete" on public.performer_attachments
  for delete to authenticated using ((select private.can_edit()));

-- 첨부파일 저장소: 비공개 버킷, 파일 하나당 10MB
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760);

create policy "attachments bucket: members read" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and (select private.my_role()) is not null);
create policy "attachments bucket: editors upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (select private.can_edit()));
create policy "attachments bucket: editors delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and (select private.can_edit()));
