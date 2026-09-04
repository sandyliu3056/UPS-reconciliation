/* Supabase's project URL and anon key are public browser configuration.
   Never put the service_role key in this file. */
window.UPS_AUTH_CONFIG = {
  /* "open"     不設密碼,開站就進來
     "supabase" 用 Supabase 帳號登入(目前)
     "local"    用本機帳號名單登入

     追蹤查詢的代理只認登入的 Supabase 使用者 —— 本機帳號沒有那個身分,
     那條路一定回 401。帳號改到 Supabase 後台管理之後,加同事也不必再改程式。
     要退回去只有這一行:改成 "local"。 */
  authMode: "supabase",
  url: "https://snalvdjsnysutmkqjyaa.supabase.co",
  anonKey: "sb_publishable_qnJcmZzCIb__E_PVxUcZJA_hdHadXlw"
};
