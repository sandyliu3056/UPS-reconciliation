-- =====================================================================
-- 一次做完:資料上雲 + Supabase 登入
-- ---------------------------------------------------------------------
-- 在 Supabase 後台 → SQL Editor 整份貼上,按 Run。跑一次就好,
-- 重複執行也是安全的(每一段都是 create if not exists / create or replace)。
--
-- 這一份是把下面三份接起來的懶人包,內容完全一樣:
--   supabase/local_settings.sql   設定與帳單歷史上雲(本機帳號模式用)
--   supabase/schema.sql           profiles / user_settings(Supabase 登入用)
--   supabase/auth_history.sql     Supabase 登入模式的帳單歷史同步
-- 最後多一段:把管理員角色給你自己。
--
-- 改過上面任何一份的話,這一份要重新產生 —— 它是快照,不會自己跟著變。
-- =====================================================================


-- ========== 1/4  設定與帳單歷史上雲  (supabase/local_settings.sql) ==========

-- UPS Reprice — 本機帳號模式的設定同步
-- 在 Supabase 後台 SQL Editor 整份貼上執行一次。可重複執行。
--
-- 背景:網站目前用本機帳號登入(index.html 的 LOCAL_MODE),沒有 Supabase
-- 登入身分可用。設定要跨電腦跟著帳號走,所以另外開一張表:
--
--   local_settings   一把「同步鑰匙」一列,裝那把鑰匙對應的設定
--
-- 鑰匙是瀏覽器在登入當下用 PBKDF2 算的:
--   PBKDF2(密碼, 鹽 = "ups-reprice::" + 帳號, 600000 輪, SHA-256) → 64 位十六進位
-- 不知道密碼就算不出鑰匙;repo 裡公開的登入雜湊是另一種算法,推不出這把。
-- 以前是 sha256 跑一輪:一台普通機器一秒可以算幾億次,知道帳號的人拿一本
-- 常見密碼字典就能把鑰匙一個一個試出來,而且這裡沒有次數上限。PBKDF2 跑
-- 六十萬輪,一次推導約十分之一秒,同一本字典要試完的時間差好幾個數量級;
-- 鹽用帳號本身,攻擊者就不能算一本通用對照表拿去對所有人。
-- 舊鑰匙底下的資料由前端在登入時自動搬到新鑰匙(index.html 的 syncMigrate)。
-- 換密碼等於換一把新鑰匙 —— 舊設定不會跟過來,重新儲存一次即可。
--
-- 安全設計:這張表「沒有」任何 RLS policy,anon 完全不能直接讀寫,
-- 唯一的入口是下面兩個 security definer 函式 —— get 一定要給出完整的
-- 鑰匙才拿得到那一列,沒有任何列清單的路。等於憑密碼取物的置物櫃。

create table if not exists public.local_settings (
  sync_key    text primary key,
  config      jsonb,
  config_name text,
  updated_at  timestamptz not null default now()
);

alter table public.local_settings enable row level security;
-- 不建任何 policy:直接走 REST 的讀寫一律被 RLS 擋下。
revoke all on table public.local_settings from anon, authenticated;

-- 讀:給鑰匙,拿那一列。鑰匙必須是 64 位十六進位(sha256),擋掉亂餵的值。
create or replace function public.local_settings_get(k text)
returns table(config jsonb, config_name text)
language sql
security definer
set search_path = public
stable
as $$
  select s.config, s.config_name
  from public.local_settings s
  where s.sync_key = k
    and k ~ '^[0-9a-f]{64}$';
$$;

-- 寫:給鑰匙,整份覆蓋。同一把鑰匙再寫就是更新,跟本機快取同一條規則。
create or replace function public.local_settings_put(k text, cfg jsonb, cfg_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if k !~ '^[0-9a-f]{64}$' then
    raise exception 'bad key';
  end if;
  insert into public.local_settings (sync_key, config, config_name, updated_at)
  values (k, cfg, cfg_name, now())
  on conflict (sync_key) do update
    set config = excluded.config,
        config_name = excluded.config_name,
        updated_at = now();
end;
$$;

revoke all on function public.local_settings_get(text) from public;
revoke all on function public.local_settings_put(text, jsonb, text) from public;
grant execute on function public.local_settings_get(text) to anon, authenticated;
grant execute on function public.local_settings_put(text, jsonb, text) to anon, authenticated;

-- ------------------------------------------------------------ 帳單歷史同步
-- 跟 local_settings 同一套置物櫃設計:同一把鑰匙,一期帳單一列。
-- data 是瀏覽器 gzip 後轉 base64 的明細(通常只剩原本的十分之一),
-- meta 記期別資訊(日期、列數、歸檔時間、z=是否壓縮)。

create table if not exists public.local_history (
  sync_key   text not null,
  invoice    text not null,
  meta       jsonb,
  data       text,
  updated_at timestamptz not null default now(),
  primary key (sync_key, invoice)
);

alter table public.local_history enable row level security;
revoke all on table public.local_history from anon, authenticated;

-- 列出這把鑰匙存過哪幾期(只回期號與 meta,不回明細,清單才輕)。
create or replace function public.local_history_list(k text)
returns table(invoice text, meta jsonb)
language sql
security definer
set search_path = public
stable
as $$
  select h.invoice, h.meta
  from public.local_history h
  where h.sync_key = k
    and k ~ '^[0-9a-f]{64}$';
$$;

-- 抓某一期的明細。
create or replace function public.local_history_get(k text, inv text)
returns table(meta jsonb, data text)
language sql
security definer
set search_path = public
stable
as $$
  select h.meta, h.data
  from public.local_history h
  where h.sync_key = k
    and h.invoice = inv
    and k ~ '^[0-9a-f]{64}$';
$$;

-- 寫入一期。同期再寫就整期覆蓋,跟本機 IndexedDB 同一條規則。
create or replace function public.local_history_put(k text, inv text, m jsonb, d text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if k !~ '^[0-9a-f]{64}$' then
    raise exception 'bad key';
  end if;
  if inv is null or length(inv) = 0 or length(inv) > 64 then
    raise exception 'bad invoice';
  end if;
  insert into public.local_history (sync_key, invoice, meta, data, updated_at)
  values (k, inv, m, d, now())
  on conflict (sync_key, invoice) do update
    set meta = excluded.meta,
        data = excluded.data,
        updated_at = now();
end;
$$;

-- 刪除一期。本人在「已存的帳單」視窗勾選刪除時呼叫,同一把鑰匙才刪得掉。
create or replace function public.local_history_del(k text, inv text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if k !~ '^[0-9a-f]{64}$' then
    raise exception 'bad key';
  end if;
  delete from public.local_history h
   where h.sync_key = k and h.invoice = inv;
end;
$$;

revoke all on function public.local_history_list(text) from public;
revoke all on function public.local_history_get(text, text) from public;
revoke all on function public.local_history_put(text, text, jsonb, text) from public;
revoke all on function public.local_history_del(text, text) from public;
grant execute on function public.local_history_list(text) to anon, authenticated;
grant execute on function public.local_history_get(text, text) to anon, authenticated;
grant execute on function public.local_history_put(text, text, jsonb, text) to anon, authenticated;
grant execute on function public.local_history_del(text, text) to anon, authenticated;

-- ========== 2/4  帳號資料表  (supabase/schema.sql) ==========

-- UPS Reprice — 每個帳號自己的費率 + 主帳號管理使用者
-- 在 Supabase 後台 SQL Editor 整份貼上執行一次。可重複執行。
--
-- 兩張表:
--   profiles       每個帳號一列,給主帳號看清單用(email、角色、建立時間)
--   user_settings  每個帳號一列,裝那個帳號自己的費率設定
--
-- 角色的真正來源是 auth.users.raw_app_meta_data->>'role' —— 那一欄只有
-- service_role 改得動,所以權限規則都讀它。profiles.role 只是給畫面顯示的
-- 副本,由觸發器同步,改它不會讓任何人變成管理者。

-- 註:Admin 分頁的帳號清單直接問 auth.users(Edge Function 用 service_role
-- 呼叫 listUsers),不讀 profiles —— 觸發器建立之前就存在的帳號不會在
-- profiles 裡,那會變成「登得進去卻不在清單上」。profiles 留著是給日後
-- 需要用 SQL 查名單時方便,不是清單的來源。

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,          -- 認證用的那個 email(帳號補成的),不是聯絡信箱
  username    text,          -- 登入用的帳號
  name        text,          -- 顯示名稱
  contact_email text,        -- 選填的聯絡信箱
  role        text not null default 'user',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- 舊版建過這張表的話,把新欄位補上。
alter table public.profiles add column if not exists username      text;
alter table public.profiles add column if not exists name          text;
alter table public.profiles add column if not exists contact_email text;

-- 建立/更新帳號時自動同步一列過來。
create or replace function public.sync_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, name, contact_email,
                               role, created_at, updated_at)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'username',
                   split_part(new.email, '@', 1)),
          coalesce(new.raw_user_meta_data->>'display_name',
                   new.raw_user_meta_data->>'full_name',
                   split_part(new.email, '@', 1)),
          new.raw_user_meta_data->>'contact_email',
          coalesce(new.raw_app_meta_data->>'role', 'user'),
          coalesce(new.created_at, now()), now())
  on conflict (id) do update
    set email = excluded.email,
        username = excluded.username,
        name = excluded.name,
        contact_email = excluded.contact_email,
        role  = excluded.role,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_synced on auth.users;
create trigger on_auth_user_synced
  after insert or update on auth.users
  for each row execute function public.sync_profile();

-- 已經存在的帳號補進來(第一次執行時有用)。
insert into public.profiles (id, email, username, name, contact_email,
                             role, created_at, updated_at)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'username', split_part(u.email,'@',1)),
       coalesce(u.raw_user_meta_data->>'display_name',
                u.raw_user_meta_data->>'full_name',
                split_part(u.email,'@',1)),
       u.raw_user_meta_data->>'contact_email',
       coalesce(u.raw_app_meta_data->>'role','user'),
       coalesce(u.created_at, now()), now()
from auth.users u
on conflict (id) do update
  set email = excluded.email, username = excluded.username,
      name = excluded.name, contact_email = excluded.contact_email,
      role = excluded.role, updated_at = now();

-- ----------------------------------------------------------- user_settings
create table if not exists public.user_settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  config      jsonb,
  config_name text,
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------- 權限
-- 讀 JWT 裡的角色。app_metadata 只有 service_role 寫得動,所以這是可信的。
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb
      -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

alter table public.profiles      enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists profiles_read_self  on public.profiles;
drop policy if exists profiles_read_admin on public.profiles;
create policy profiles_read_self  on public.profiles
  for select using (id = auth.uid());
create policy profiles_read_admin on public.profiles
  for select using (public.is_admin());
-- 寫入一律走 Edge Function(service_role),前端沒有 insert/update 權限。

drop policy if exists settings_rw_self  on public.user_settings;
drop policy if exists settings_rw_admin on public.user_settings;
-- 自己的費率:自己讀、自己寫。
create policy settings_rw_self on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- 主帳號:每個帳號的費率都讀得到、也改得動。
create policy settings_rw_admin on public.user_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------- 把自己設成主帳號
-- 第一個管理者要用 service_role 指定,前端做不到也不該做得到。
-- 在 SQL Editor 執行(把 email 換成你的):
--
--   update auth.users
--      set raw_app_meta_data =
--          coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb
--    where email = 'sandyliu3056@gmail.com';
--
-- 改完要重新登入一次,JWT 才會帶上新的角色。

-- ========== 3/4  登入模式的帳單歷史  (supabase/auth_history.sql) ==========

-- =====================================================================
-- 登入帳號模式的帳單歷史雲端同步
-- ---------------------------------------------------------------------
-- 本機帳號模式的同步鑰匙是「帳號+密碼」推出來的一串 64 位十六進位碼,由
-- 瀏覽器算好、當參數送上來(local_history_* 那四個函式)。Supabase 登入
-- 模式沒有密碼可以推,所以那條路整段被關掉 —— 費率還會同步,帳單歷史
-- 卻只留在各自的電腦上。多台電腦輪流用的時候,那是個大洞。
--
-- 這裡補上另一組函式。差別只有一個,但那個差別很重要:
--   鑰匙不是呼叫端給的,是資料庫自己從登入身分取的(auth.uid())。
--   所以「拿到別人的鑰匙就能讀別人的帳單」這件事不存在 —— 沒有鑰匙這個
--   東西可以拿。沒登入就直接擋掉。
--
-- 用的是同一張 local_history 表,鑰匙前面加 'uid:' 和本機模式那批分開,
-- 兩種模式的資料不會互相看到,也不會撞在一起。
--
-- 在 Supabase 後台 → SQL Editor 貼上執行一次即可。重複執行是安全的。
-- =====================================================================

create or replace function public.hist_list()
returns table(invoice text, meta jsonb)
language plpgsql security definer set search_path = public stable
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  return query
    select h.invoice, h.meta from public.local_history h
    where h.sync_key = 'uid:'||auth.uid()::text;
end;
$$;

create or replace function public.hist_get(inv text)
returns table(meta jsonb, data text)
language plpgsql security definer set search_path = public stable
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  return query
    select h.meta, h.data from public.local_history h
    where h.sync_key = 'uid:'||auth.uid()::text and h.invoice = inv;
end;
$$;

create or replace function public.hist_put(inv text, m jsonb, d text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if inv is null or length(inv) = 0 or length(inv) > 64 then
    raise exception 'bad invoice key';
  end if;
  insert into public.local_history (sync_key, invoice, meta, data, updated_at)
  values ('uid:'||auth.uid()::text, inv, m, d, now())
  on conflict (sync_key, invoice) do update
    set meta = excluded.meta, data = excluded.data, updated_at = now();
end;
$$;

create or replace function public.hist_del(inv text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.local_history h
  where h.sync_key = 'uid:'||auth.uid()::text and h.invoice = inv;
end;
$$;

-- 只有登入過的人叫得動。anon 連呼叫都不行 —— 這四個函式對未登入的呼叫
-- 沒有任何意義,不必留著讓人試。
revoke all on function public.hist_list()                 from public;
revoke all on function public.hist_get(text)              from public;
revoke all on function public.hist_put(text, jsonb, text) from public;
revoke all on function public.hist_del(text)              from public;
grant execute on function public.hist_list()                 to authenticated;
grant execute on function public.hist_get(text)              to authenticated;
grant execute on function public.hist_put(text, jsonb, text) to authenticated;
grant execute on function public.hist_del(text)              to authenticated;

-- ========== 4/4  把管理員角色給自己 ==========
--
-- 角色只讀 auth.users.raw_app_meta_data，那一欄只有伺服器改得動，
-- 所以使用者自己改不了自己的權限。
--
-- 帳號不是 sandyliu30 的話，改下面那一行的 email。
-- 這一段要在「Authentication → Users」把帳號建好之後才有作用；
-- 先跑也不會壞，只是影響 0 列，帳號建好後再跑一次這一段即可。

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"admin"}'::jsonb
where email = 'sandyliu30@ups-reprice.invalid';
