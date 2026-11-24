const SUPABASE_URL = "https://ksykkuviuvmxrcxpkeur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeWtrdXZpdXZteHJjeHBrZXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMjg4MjcsImV4cCI6MjEwNzgwNDgyN30.eRUW2XcfrGXAxmUCDJGuR54Rl4sb_gS98eEJDmEWleM";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const _supabase = db;