// Begol Eye Center - Supabase Global Connection
const SUPABASE_URL = "https://ksykkuviuvmxrcxpkeur.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_8t_jecPepR1WfrPzbXCCKg_rIeQd2fg";

let db = null;
try {
    if (typeof supabase !== 'undefined' && SUPABASE_URL && !SUPABASE_KEY.includes("المفتاح")) {
        db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("⚡ [Begol] Supabase Connected Successfully!");
    } else {
        console.error("❌ [Begol] Please set your SUPABASE_KEY in js/supabase-config.js");
    }
} catch (e) {
    console.error("❌ [Begol] Connection Exception:", e);
}