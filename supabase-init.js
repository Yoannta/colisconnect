/**
 * INITIALISATION SUPABASE COLISCONNECT
 */
(function() {
    const SUPABASE_URL = "https://cftijcrpawnjmmpkigei.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmdGlqY3JwYXduam1tcGtpZ2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTkwNzMsImV4cCI6MjA5NTc3NTA3M30.9gsGiyL9mxUKbKwwoUK9ToNOApYgZcfT15mszBVJfLM"; // Configuré par Antigravity

    if (typeof supabase === 'undefined') {
        console.error("Supabase SDK non chargé. Vérifiez l'import dans le <head>.");
        return;
    }

    // Client Global
    window.ccSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log("🚀 Supabase Initialisé pour ColisConnect");
})();
