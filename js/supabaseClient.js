// استبدل هذين السطرين برابط مشروعك والمفتاح العام من إعدادات Supabase:
// Project Settings -> API -> Project URL & Project API Keys (anon / public

const SUPABASE_URL = "https://xyzcompany.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// تعريف db (المستخدم في api.js) و _supabase معاً
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const _supabase = db;