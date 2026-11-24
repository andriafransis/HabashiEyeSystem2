
const SUPABASE_URL = "https://ksykkuviuvmxrcxpkeur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const _supabase = db;