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

    // ⚠️ RESTAURATION DE SESSION (correctif) :
    // Le site garde son propre jeton (localStorage 'cc_auth_token'), mais le client
    // Supabase peut perdre sa session (page rechargee, JWT expire au bout d'une heure).
    // Consequence : les LECTURES passent (policies publiques) mais toute ECRITURE est
    // refusee par la base (auth.uid() vide) -> suppression et modification impossibles,
    // sans message d'erreur explicite. On re-injecte donc la session au demarrage.
    (async () => {
        try {
            const { data: { session } } = await window.ccSupabase.auth.getSession();
            if (session) return;
            const access = localStorage.getItem("cc_auth_token");
            const refresh = localStorage.getItem("cc_refresh_token");
            if (access && refresh) {
                const { error } = await window.ccSupabase.auth.setSession({
                    access_token: access, refresh_token: refresh
                });
                if (error) console.warn("Session non restauree:", error.message);
                else console.log("✅ Session utilisateur restauree (ecritures autorisees)");
            }
        } catch (e) {
            console.warn("Restauration de session impossible:", e && e.message);
        }
    })();

    console.log("🚀 Supabase Initialisé pour ColisConnect");
})();
