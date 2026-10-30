import { createClient } from "@supabase/supabase-js";

// 공개해도 되는 값이다(publishable key). 데이터는 데이터베이스의 RLS 정책이 회원·권한별로 지킨다.
// 프로젝트: cen-performers (supabase/migrations 참고)
const SUPABASE_URL = "https://wqwpnaudcxiuchofpiiq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6LF33LbepGo4Bc0FlhWf5Q_ykA42C7M";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
