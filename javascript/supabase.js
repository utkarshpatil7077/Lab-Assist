const SUPABASE_URL = "https://pbcnboxtlrymczzpppyl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiY25ib3h0bHJ5bWN6enBwcHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDI0MDYsImV4cCI6MjA4MzE3ODQwNn0._zp4DOtpCvI4fqpRk-UUM3pQFVV42HfcLJ_N06f5qVc";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);