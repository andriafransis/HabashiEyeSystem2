const SUPABASE_URL = "https://ksykkuviuvmxrcxpkeur.supabase.co";
const SUPABASE_ANON_KEY = "المفتاح_اللي_نسخته_من_view_legacy_api_keys";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const _supabase = db;