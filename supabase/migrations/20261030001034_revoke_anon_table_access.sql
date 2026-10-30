-- 로그인하지 않은 방문자는 RLS 이전에 테이블 권한부터 없다.
revoke all on public.members, public.performers, public.performer_attachments from anon;
-- 회원 정보는 관리자 Edge Function(secret key)만 쓴다.
revoke insert, update, delete on public.members from authenticated;

-- 첫 관리자 설정 화면을 띄울지 판단하는 함수. 회원이 한 명도 없을 때만 true.
create function public.needs_first_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.members)
$$;
revoke all on function public.needs_first_admin() from public;
grant execute on function public.needs_first_admin() to anon, authenticated;
