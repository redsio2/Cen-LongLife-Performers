-- 출연자 연락처(선택 입력). 전화번호 형식을 강제하지 않고 적은 그대로 둔다.
alter table public.performers add column contact text not null default '';
