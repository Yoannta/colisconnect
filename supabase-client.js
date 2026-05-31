// ====== COLISCONNECT SUPABASE CLIENT ======
// Remplace le système de requêtes vers le serveur local Node.js

const SUPABASE_URL = "https://cftijcrpawnjmmpkigei.supabase.co";
const SUPABASE_ANON_KEY = "TO_BE_FILLED_BY_USER"; // La clé 'anon' de Supabase

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Wrapper intelligent pour garder la compatibilité avec l'ancien code
 */
const ColisConnectAPI = {
    // AUTH
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return { token: data.session.access_token, user: data.user };
    },

    async register(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        return data;
    },

    // OFFRES
    async getOffers(filters = {}) {
        let query = supabase.from('offers').select('*').eq('status', 'active');
        if (filters.destination) query = query.ilike('destination', `%${filters.destination}%`);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    // RESERVATIONS
    async initiatePayment(reservationId, amount) {
        // Appelle l'Edge Function Supabase
        const { data, error } = await supabase.functions.invoke('initiate-payment', {
            body: { reservationId, amount }
        });
        if (error) throw error;
        return data;
    },

    // CHAT (REALTIME)
    subscribeToMessages(threadId, callback) {
        return supabase
            .channel(`chat:${threadId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` }, payload => {
                callback(payload.new);
            })
            .subscribe();
    }
};
