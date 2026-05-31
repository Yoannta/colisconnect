/**
 * INITIALISATION SUPABASE COLISCONNECT
 */
(function() {
    const SUPABASE_URL = "https://cftijcrpawnjmmpkigei.supabase.co";
    const SUPABASE_ANON_KEY = "TO_BE_FILLED_BY_USER"; // <--- REMPLACE PAR TA CLÉ ANON (Dashboard > Settings > API)

    if (typeof supabase === 'undefined') {
        console.error("Supabase SDK non chargé. Vérifiez l'import dans le <head>.");
        return;
    }

    // Client Global
    window.ccSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log("🚀 Supabase Initialisé pour ColisConnect");
})();
