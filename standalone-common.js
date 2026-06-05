(() => {
    const PROTECTED_PAGES = new Set([
        "results.html",
        "result.html",
        "post_trip.html",
        "proposer.html",
        "chat.html",
        "messages.html",
        "dashboard.html",
        "admin.html",
        "partner.html"
    ]);

    const PROFILE_REQUIRED_PAGES = new Set([
        "post_trip.html",
        "proposer.html"
    ]);

    // [MULTI-CURRENCY] Global Config Exhaustive (150+ Pays)
    const EXCHANGE_RATES = {
        // Pivot EUR = 1
        EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.95, CAD: 1.45, AUD: 1.63, JPY: 162.5, CNY: 7.82,
        XOF: 655.957, XAF: 655.957, NGN: 1530, GHS: 14.2, GNF: 9300, CDF: 2800, RWF: 1380,
        MAD: 10.8, DZD: 145, TND: 3.4, EGP: 51, KES: 140, ZAR: 20, ETB: 62, MUR: 49,
        TRY: 35, SEK: 11.3, NOK: 11.5, DKK: 7.45, PLN: 4.3, CZK: 25.2, HUF: 395, RON: 4.97, BGN: 1.95,
        INR: 90, BRL: 5.4, MXN: 18.2, ARS: 930, COP: 4200, CLP: 1020, PEN: 4, UYU: 42,
        AED: 3.96, SAR: 4.05, QAR: 3.93, KWD: 0.33, BHD: 0.41, OMR: 0.42, JOD: 0.77,
        ILS: 4.05, SGD: 1.45, HKD: 8.45, TWD: 34, KRW: 1450, THB: 39, IDR: 17000, MYR: 5.1, PHP: 60, VND: 27000,
        NZD: 1.78, RUB: 100, PKR: 300, BDT: 118, LKR: 325, KZT: 480, UZS: 13500, GEL: 2.9, AMD: 425,
        MGA: 4800, MWK: 1850, MZN: 70, NAD: 20, SCR: 15, SLL: 24000, SOS: 620, SDG: 650, TZS: 2800, UGX: 4100, ZMW: 28
    };

    const COUNTRY_CURRENCIES = {
        // Afrique de l'Ouest (XOF)
        "Bénin": "XOF", "Burkina Faso": "XOF", "Côte d'Ivoire": "XOF", "Guinée-Bissau": "XOF", "Mali": "XOF", "Niger": "XOF", "Sénégal": "XOF", "Togo": "XOF",
        // Afrique Centrale (XAF)
        "Cameroun": "XAF", "République centrafricaine": "XAF", "République du Congo": "XAF", "Gabon": "XAF", "Guinée équatoriale": "XAF", "Tchad": "XAF",
        // Afrique du Nord
        "Algérie": "DZD", "Égypte": "EGP", "Libye": "LYD", "Maroc": "MAD", "Tunisie": "TND", "Sahara occidental": "MAD",
        // Reste de l'Afrique
        "Afrique du Sud": "ZAR", "Angola": "AOA", "Botswana": "BWP", "Burundi": "BIF", "Cap-Vert": "CVE", "Comores": "KMF", "Djibouti": "DJF", "Érythrée": "ERN", "Éthiopie": "ETB", "Gambie": "GMD", "Ghana": "GHS", "Guinée": "GNF", "Kenya": "KES", "Lesotho": "LSL", "Liberia": "LRD", "Madagascar": "MGA", "Malawi": "MWK", "Maurice": "MUR", "Mauritanie": "MRU", "Mozambique": "MZN", "Namibie": "NAD", "Nigeria": "NGN", "Ouganda": "UGX", "Rwanda": "RWF", "Sao Tomé-et-Principe": "STN", "Seychelles": "SCR", "Sierra Leone": "SLL", "Somalie": "SOS", "Soudan": "SDG", "Soudan du Sud": "SSP", "Eswatini": "SZL", "Tanzanie": "TZS", "Zambie": "ZMW", "Zimbabwe": "ZWL", "République démocratique du Congo": "CDF",
        // Europe (Euro)
        "Allemagne": "EUR", "Andorre": "EUR", "Autriche": "EUR", "Belgique": "EUR", "Chypre": "EUR", "Croatie": "EUR", "Espagne": "EUR", "Estonie": "EUR", "Finlande": "EUR", "France": "EUR", "Grèce": "EUR", "Irlande": "EUR", "Italie": "EUR", "Lettonie": "EUR", "Lituanie": "EUR", "Luxembourg": "EUR", "Malte": "EUR", "Monaco": "EUR", "Monténégro": "EUR", "Pays-Bas": "EUR", "Portugal": "EUR", "Saint-Marin": "EUR", "Slovaquie": "EUR", "Slovénie": "EUR", "Vatican": "EUR",
        // Reste de l'Europe
        "Albanie": "ALL", "Arménie": "AMD", "Azerbaïdjan": "AZN", "Biélorussie": "BYN", "Bosnie-Herzégovine": "BAM", "Bulgarie": "BGN", "Danemark": "DKK", "Géorgie": "GEL", "Hongrie": "HUF", "Islande": "ISK", "Kazakhstan": "KZT", "Liechtenstein": "CHF", "Macédoine du Nord": "MKD", "Moldavie": "MDL", "Norvège": "NOK", "Pologne": "PLN", "Roumanie": "RON", "Royaume-Uni": "GBP", "Russie": "RUB", "Serbie": "RSD", "Suède": "SEK", "Suisse": "CHF", "République tchèque": "CZK", "Turquie": "TRY", "Ukraine": "UAH",
        // Moyen-Orient
        "Arabie Saoudite": "SAR", "Bahreïn": "BHD", "Émirats Arabes Unis": "AED", "Irak": "IQD", "Iran": "IRR", "Israël": "ILS", "Jordanie": "JOD", "Koweït": "KWD", "Liban": "LBP", "Oman": "OMR", "Palestine": "ILS", "Qatar": "QAR", "Syrie": "SYP", "Yémen": "YER",
        // Asie
        "Afghanistan": "AFN", "Bangladesh": "BDT", "Bhoutan": "BTN", "Birmanie": "MMK", "Brunei": "BND", "Cambodge": "KHR", "Chine": "CNY", "Corée du Nord": "KPW", "Corée du Sud": "KRW", "Hong Kong": "HKD", "Inde": "INR", "Indonésie": "IDR", "Japon": "JPY", "Kirghizistan": "KGS", "Laos": "LAK", "Macao": "MOP", "Malaisie": "MYR", "Maldives": "MVR", "Mongolie": "MNT", "Népal": "NPR", "Ouzbékistan": "UZS", "Pakistan": "PKR", "Philippines": "PHP", "Singapour": "SGD", "Sri Lanka": "LKR", "Tadjikistan": "TJS", "Taïwan": "TWD", "Thaïlande": "THB", "Timor oriental": "USD", "Turkménistan": "TMT", "Vietnam": "VND",
        // Amériques (Nord & Central)
        "Bahamas": "BSD", "Barbade": "BBD", "Belize": "BZD", "Canada": "CAD", "Costa Rica": "CRC", "Cuba": "CUP", "Dominique": "XCD", "États-Unis": "USD", "Grenade": "XCD", "Guatemala": "GTQ", "Haïti": "HTG", "Honduras": "HNL", "Jamaïque": "JMD", "Mexique": "MXN", "Nicaragua": "NIO", "Panama": "USD", "République dominicaine": "DOP", "Saint-Kitts-et-Nevis": "XCD", "Sainte-Lucie": "XCD", "Saint-Vincent-et-les Grenadines": "XCD", "Salvador": "USD", "Trinité-et-Tobago": "TTD",
        // Amérique du Sud
        "Argentine": "ARS", "Bolivie": "BOB", "Brésil": "BRL", "Chili": "CLP", "Colombie": "COP", "Équateur": "USD", "Guyana": "GYD", "Paraguay": "PYG", "Pérou": "PEN", "Suriname": "SRD", "Uruguay": "UYU", "Venezuela": "VES",
        // Océanie
        "Australie": "AUD", "Fidji": "FJD", "Kiribati": "AUD", "Nauru": "AUD", "Nouvelle-Zélande": "NZD", "Palaos": "USD", "Papouasie-Nouvelle-Guinée": "PGK", "Salomon": "SBD", "Samoa": "WST", "Tonga": "TOP", "Tuvalu": "AUD", "Vanuatu": "VUV"
    };

    const COUNTRY_CALLING_CODES = {
        // Afrique de l'Ouest
        "Bénin": "+229", "Burkina Faso": "+226", "Côte d'Ivoire": "+225", "Guinée-Bissau": "+245", "Mali": "+223", "Niger": "+227", "Sénégal": "+221", "Togo": "+228",
        // Afrique Centrale
        "Cameroun": "+237", "République centrafricaine": "+236", "République du Congo": "+242", "Gabon": "+241", "Guinée équatoriale": "+240", "Tchad": "+235",
        // Afrique du Nord
        "Algérie": "+213", "Égypte": "+20", "Libye": "+218", "Maroc": "+212", "Tunisie": "+216", "Sahara occidental": "+212",
        // Reste de l'Afrique
        "Afrique du Sud": "+27", "Angola": "+244", "Botswana": "+267", "Burundi": "+257", "Cap-Vert": "+238", "Comores": "+269", "Djibouti": "+253", "Érythrée": "+291", "Éthiopie": "+251", "Gambie": "+220", "Ghana": "+233", "Guinée": "+224", "Kenya": "+254", "Lesotho": "+266", "Liberia": "+231", "Madagascar": "+261", "Malawi": "+265", "Maurice": "+230", "Mauritanie": "+222", "Mozambique": "+258", "Namibie": "+264", "Nigeria": "+234", "Ouganda": "+256", "Rwanda": "+250", "Sao Tomé-et-Principe": "+239", "Seychelles": "+248", "Sierra Leone": "+232", "Somalie": "+252", "Soudan": "+249", "Soudan du Sud": "+211", "Eswatini": "+268", "Tanzanie": "+255", "Zambie": "+260", "Zimbabwe": "+263", "République démocratique du Congo": "+243",
        // Europe
        "Allemagne": "+49", "Andorre": "+376", "Autriche": "+43", "Belgique": "+32", "Chypre": "+357", "Croatie": "+385", "Espagne": "+34", "Estonie": "+372", "Finlande": "+358", "France": "+33", "Grèce": "+30", "Irlande": "+353", "Italie": "+39", "Lettonie": "+371", "Lituanie": "+370", "Luxembourg": "+352", "Malte": "+356", "Monaco": "+377", "Monténégro": "+382", "Pays-Bas": "+31", "Portugal": "+351", "Saint-Marin": "+378", "Slovaquie": "+421", "Slovénie": "+386", "Vatican": "+379",
        "Albanie": "+355", "Arménie": "+374", "Azerbaïdjan": "+994", "Biélorussie": "+375", "Bosnie-Herzégovine": "+387", "Bulgarie": "+359", "Danemark": "+45", "Géorgie": "+995", "Hongrie": "+36", "Islande": "+354", "Kazakhstan": "+7", "Liechtenstein": "+423", "Macédoine du Nord": "+389", "Moldavie": "+373", "Norvège": "+47", "Pologne": "+48", "Roumanie": "+40", "Royaume-Uni": "+44", "Russie": "+7", "Serbie": "+381", "Suède": "+46", "Suisse": "+41", "République tchèque": "+420", "Turquie": "+90", "Ukraine": "+380",
        // Moyen-Orient
        "Arabie Saoudite": "+966", "Bahreïn": "+973", "Émirats Arabes Unis": "+971", "Irak": "+964", "Iran": "+98", "Israël": "+972", "Jordanie": "+962", "Koweït": "+965", "Liban": "+961", "Oman": "+968", "Palestine": "+970", "Qatar": "+974", "Syrie": "+963", "Yémen": "+967",
        // Asie
        "Afghanistan": "+93", "Bangladesh": "+880", "Bhoutan": "+975", "Birmanie": "+95", "Brunei": "+673", "Cambodge": "+855", "Chine": "+86", "Corée du Nord": "+850", "Corée du Sud": "+82", "Hong Kong": "+852", "Inde": "+91", "Indonésie": "+62", "Japon": "+81", "Kirghizistan": "+996", "Laos": "+856", "Macao": "+853", "Malaisie": "+60", "Maldives": "+960", "Mongolie": "+976", "Népal": "+977", "Ouzbékistan": "+998", "Pakistan": "+92", "Philippines": "+63", "Singapour": "+65", "Sri Lanka": "+94", "Tadjikistan": "+992", "Taïwan": "+886", "Thaïlande": "+66", "Timor oriental": "+670", "Turkménistan": "+993", "Vietnam": "+84",
        // Amériques
        "Bahamas": "+1-242", "Barbade": "+1-246", "Belize": "+501", "Canada": "+1", "Costa Rica": "+506", "Cuba": "+53", "Dominique": "+1-767", "États-Unis": "+1", "Grenade": "+1-473", "Guatemala": "+502", "Haïti": "+509", "Honduras": "+504", "Jamaïque": "+1-876", "Mexique": "+52", "Nicaragua": "+505", "Panama": "+507", "République dominicaine": "+1-809", "Saint-Kitts-et-Nevis": "+1-869", "Sainte-Lucie": "+1-758", "Saint-Vincent-et-les Grenadines": "+1-784", "Salvador": "+503", "Trinité-et-Tobago": "+1-868",
        "Argentine": "+54", "Bolivie": "+591", "Brésil": "+55", "Chili": "+56", "Colombie": "+57", "Équateur": "+593", "Guyana": "+592", "Paraguay": "+595", "Pérou": "+51", "Suriname": "+597", "Uruguay": "+598", "Venezuela": "+58",
        // Océanie
        "Australie": "+61", "Fidji": "+679", "Kiribati": "+686", "Nauru": "+674", "Nouvelle-Zélande": "+64", "Palaos": "+680", "Papouasie-Nouvelle-Guinée": "+675", "Salomon": "+677", "Samoa": "+685", "Tonga": "+676", "Tuvalu": "+688", "Vanuatu": "+678"
    };

    const COUNTRY_OPTIONS = Object.keys(COUNTRY_CURRENCIES).sort((a, b) => a.localeCompare(b, "fr"));


    const state = {
        token: localStorage.getItem("cc_auth_token") || "",
        user: null,
        pendingNavigation: "",
        pendingProfileNavigation: ""
    };

    const ui = {
        initialized: false,
        modal: null,
        modalCard: null,
        gatePanel: null,
        formPanel: null,
        feedback: null,
        loginForm: null,
        registerForm: null,
        loginTab: null,
        registerTab: null,
        profileModal: null,
        profileMessage: null
    };

    function escapeHtml(value) {
        return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function normalizeText(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    function getSmartRoundedAmount(amount, currency) {
        currency = String(currency || "").toUpperCase();
        // Groupe 1 : Centaine supérieure (ex: Afrique de l'Ouest/Centrale)
        if (["XOF", "XAF", "GNF", "NGN", "RWF", "CDF", "MGA"].includes(currency)) {
            return Math.ceil(amount / 100) * 100;
        }
        // Groupe 2 : Unité supérieure (ex: Chine, Ghana, Maroc)
        if (["CNY", "GHS", "MAD", "ZAR", "DZD", "KES", "INR", "MUR"].includes(currency)) {
            return Math.ceil(amount);
        }
        // Groupe 3 : Précision 0.10 (ex: EUR, USD)
        if (["EUR", "USD", "GBP", "CHF", "CAD", "AUD"].includes(currency)) {
            return Math.ceil(amount * 10) / 10;
        }
        // Défaut : Entier supérieur
        return Math.ceil(amount);
    }

    function formatAmount(amount, currency) {
        const rounded = getSmartRoundedAmount(amount, currency);
        const isLowValue = ["XOF", "XAF", "GNF", "NGN", "RWF", "CDF", "MGA"].includes(currency);

        const symbols = { EUR: '€', USD: '$', GBP: '£', CNY: '¥', JPY: '¥', XOF: ' FCFA', XAF: ' FCFA', NGN: '₦' };
        const sym = symbols[currency] || ` ${currency}`;

        const formatted = new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: isLowValue ? 0 : 2
        }).format(rounded);

        if (['EUR', 'USD', 'GBP', 'CNY', 'JPY'].includes(currency)) {
            const internationalSymbols = { EUR: '€', USD: '$', GBP: '£', CNY: '¥', JPY: '¥' };
            return `${internationalSymbols[currency]}${formatted}`;
        }
        return `${formatted}${sym}`;
    }

    function convertCurrency(amount, fromCur, toCur) {
        if (fromCur === toCur) return amount;
        const fromRate = EXCHANGE_RATES[fromCur] || 1;
        const toRate = EXCHANGE_RATES[toCur] || 1;
        return amount * (toRate / fromRate);
    }

    function buildApiCandidates(path) {
        const normalizedPath = String(path || "").startsWith("/") ? String(path) : `/${path}`;
        const candidates = [];
        const fallbackBase = localStorage.getItem("cc_api_base") || "http://127.0.0.1:8080";

        if (window.location.protocol !== "file:") {
            const currentPort = window.location.port;
            // Si on est sur un port qui n'est clairement pas celui du backend (8080/8090),
            // on evite d'utiliser le chemin relatif qui risque de tomber sur le serveur de preview statique.
            if (!currentPort || ["8080", "8090"].includes(currentPort)) {
                candidates.push(normalizedPath);
            }
        }

        const fallbackOrigins = [window.location.origin]; // Uniquement le domaine actuel en fallback final
        for (const origin of fallbackOrigins) {
            if (!origin) continue;
            const url = `${origin.replace(/\/$/, "")}${normalizedPath}`;
            if (!candidates.includes(url)) candidates.push(url);
        }

        return candidates;
    }

    async function api(path, options = {}) {
        // [SUPABASE BRIDGE UNIVERSEL V4 - FULL CLOUD]
        if (window.ccSupabase) {
            const p = path.toLowerCase();

            // 1. AUTH
            if (p.includes("/auth/login")) {
                const { data, error } = await window.ccSupabase.auth.signInWithPassword({ email: options.body.email, password: options.body.password });
                if (error) throw error;
                return { token: data.session.access_token, user: { ...data.user, ...data.user.user_metadata } };
            }
            if (p.includes("/auth/register")) {
                const { data, error } = await window.ccSupabase.auth.signUp({ email: options.body.email, password: options.body.password, options: { data: { full_name: options.body.fullName } } });
                if (error) throw error;
                return { message: "Inscription réussie", user: data.user };
            }
            if (p.includes("/auth/me")) {
                const { data: { user }, error: authErr } = await window.ccSupabase.auth.getUser();
                if (authErr || !user) throw authErr || new Error("No user");
                const { data: profile } = await window.ccSupabase.from('profiles').select('*').eq('id', user.id).single();
                return { user: { ...user, ...user.user_metadata, ...(profile || {}), id: user.id } };
            }

            // 2. PROFILE UPDATE (PATCH)
            if (p.includes("/users/me/profile") && options.method === "PATCH") {
                const mapping = {
                    fullName: 'full_name',
                    phoneNumber: 'phone_number',
                    country: 'country',
                    identityDocumentData: 'identity_document',
                    profilePhotoData: 'profile_photo'
                };
                const mappedBody = {};
                for (const k in options.body) { mappedBody[mapping[k] || k] = options.body[k]; }
                const { data, error } = await window.ccSupabase.from('profiles').update(mappedBody).eq('id', state.user?.id).select();
                if (error) throw error;
                return { success: true, user: { ...state.user, ...data[0] } };
            }

            // 2b. PAYMENT QRS
            if (p.includes("/api/me/payment-qrs") && options.method === "POST") {
                const { alipayQr, wechatQr, country } = options.body;
                const { data, error } = await window.ccSupabase.from('profiles').update({
                    alipay_qr: alipayQr,
                    wechat_qr: wechatQr,
                    country: country
                }).eq('id', state.user?.id).select();
                if (error) throw error;
                return { success: true, user: { ...state.user, ...data[0] } };
            }

            // 3. OFFERS (CRUD)
            if (p.includes("/api/offers")) {
                const idMatch = path.match(/\/api\/offers\/([^\/\?]+)/);
                if (options.method === "DELETE" && idMatch) {
                    const { error } = await window.ccSupabase.from('offers').delete().eq('id', idMatch[1]);
                    if (error) throw error;
                    return { success: true };
                }
                if (options.method === "POST") {
                    const mapping = { availableKg: 'available_kg', pricePerKg: 'price_per_kg', departureDate: 'departure_date' };
                    const mappedBody = {};
                    for (const k in options.body) mappedBody[mapping[k] || k] = options.body[k];
                    const { data, error } = await window.ccSupabase.from('offers').insert([{ ...mappedBody, user_id: state.user?.id }]).select();
                    if (error) throw error;
                    return data[0];
                }
                // GET WITH JOIN
                let query = window.ccSupabase.from('offers').select('*, profiles(full_name, is_verified)');
                if (p.includes("scope=mine")) {
                    query = query.eq('user_id', state.user?.id);
                } else {
                    query = query.eq('status', 'active');
                    const params = new URLSearchParams(path.split('?')[1] || "");
                    if (params.get("destination")) query = query.ilike('destination', `%${params.get("destination")}%`);
                    if (params.get("minKg")) query = query.gte('available_kg', parseInt(params.get("minKg")));
                }
                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) throw error;
                
                // Map fields for UI compatibility
                const items = (data || []).map(o => ({
                    ...o,
                    availableKg: o.available_kg,
                    pricePerKg: o.price_per_kg,
                    departureDate: o.departure_date,
                    ownerName: o.profiles?.full_name || "Voyageur",
                    ownerIsVerified: o.profiles?.is_verified
                }));
                return { items };
            }

            // 4. CONVERSATIONS & MESSAGES
            if (p.includes("/api/conversations")) {
                const threadMatch = path.match(/\/api\/conversations\/([^\/\?]+)\/messages/);
                if (threadMatch) { // GET MESSAGES
                    const { data, error } = await window.ccSupabase.from('chat_messages').select('*').eq('thread_id', threadMatch[1]).order('created_at', { ascending: true });
                    if (error) throw error;
                    return data || [];
                }
                const threadId = path.match(/\/api\/conversations\/([^\/\?]+)/);
                if (options.method === "DELETE" && threadId) {
                     const { error } = await window.ccSupabase.from('chat_threads').delete().eq('id', threadId[1]);
                     if (error) throw error;
                     return { success: true };
                }

                // LIST CONVS
                const { data, error } = await window.ccSupabase.from('chat_threads').select('*').or(`user_id.eq.${state.user?.id},offer_owner_id.eq.${state.user?.id}`);
                if (error) throw error;
                return (data || []).map(t => ({
                    ...t,
                    isOfferOwner: t.offer_owner_id === state.user?.id,
                    travelerName: t.offer_owner_id === state.user?.id ? "Client" : "Voyageur" 
                }));
            }
            if (p.includes("/admin/overview")) {
                const [u, o, c] = await Promise.all([
                    window.ccSupabase.from('profiles').select('id', { count: 'exact', head: true }),
                    window.ccSupabase.from('offers').select('id', { count: 'exact', head: true }),
                    window.ccSupabase.from('chat_threads').select('id', { count: 'exact', head: true })
                ]);
                return { 
                    users: u.count || 0, activeUsers: u.count || 0, suspendedUsers: 0,
                    offers: o.count || 0, activeOffers: o.count || 0,
                    conversations: c.count || 0,
                    totalCommission: 0, volumeP2P: 0, openFlags: 0 
                };
            }

            // 6. AI ASSISTANT (SECURE EDGE FUNCTION)
            if (p.includes("/ai/chat")) {
                const { data, error } = await window.ccSupabase.functions.invoke('ai-assistant', {
                    body: options.body
                });
                if (error) throw error;
                return data;
            }
            if (p.includes("/admin/users/pending-approvals")) {
                const { data, error } = await window.ccSupabase.from('profiles').select('*').eq('kyc_status', 'pending');
                if (error) throw error;
                return { items: data || [] };
            }
            if (p.includes("/admin/users")) {
                const idMatch = path.match(/\/admin\/users\/([^\/\?]+)\/review-section/);
                if (idMatch && options.method === "PATCH") {
                    const { section, decision, reason } = options.body;
                    const update = {};
                    if (section === "identityDocument") update.identity_document_approved = (decision === "approve");
                    if (section === "profilePhoto") update.profile_photo_approved = (decision === "approve");
                    if (decision === "reject") update.identity_rejection_reason = reason;
                    const { data, error } = await window.ccSupabase.from('profiles').update(update).eq('id', idMatch[1]).select();
                    if (error) throw error;
                    return { success: true };
                }
                const { data, error } = await window.ccSupabase.from('profiles').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                return { items: data || [] };
            }
            if (p.includes("/admin/analytics/daily")) return { points: [] };
            if (p.includes("/admin/reservations") || p.includes("/admin/flags") || p.includes("/admin/security/blocks") || p.includes("/admin/audit-log")) return [];
            if (p.includes("/admin/financials/stats")) return { monthly: [], recent: [] };
            if (p.includes("/settings/platform-qr")) return { qrCode: "" };
            if (p.includes("/admin/ai-moderation/logs")) return [];

            // 6. GENERAL ADMIN & NOTIFS
            if (p.includes("/admin/inbox") || p.includes("/notification-counts")) {
                return { chatUnread: 0, adminUnread: 0, items: [] }; 
            }

            // 7. PAYMENTS
            if (p.includes("/payments") || p.includes("/initiate-payment")) {
                const { data, error } = await window.ccSupabase.functions.invoke('initiate-payment', { body: options.body });
                if (error) throw error;
                return data;
            }
        }

        const method = options.method || "GET";
        const headers = {};
        const config = { method, headers };

        if (options.auth !== false && state.token) {
            headers.Authorization = `Bearer ${state.token}`;
        }

        if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
            config.body = JSON.stringify(options.body);
        }

        const candidates = buildApiCandidates(path);
        let lastError = null;

        for (const url of candidates) {
            let response;
            try {
                response = await fetch(url, config);
            } catch (error) {
                lastError = error;
                continue;
            }

            const raw = await response.text();
            let data = null;
            try {
                data = raw ? JSON.parse(raw) : null;
            } catch {
                data = { error: raw || `HTTP ${response.status}` };
            }

            if (!response.ok) {
                const error = new Error(data?.error || data?.message || `HTTP ${response.status}`);
                error.status = response.status;
                error.payload = data;
                error.code = String(data?.code || data?.error || "");
                throw error;
            }

            if (url.startsWith("http")) {
                try {
                    localStorage.setItem("cc_api_base", new URL(url).origin);
                } catch {
                    // ignore
                }
            }

            return data;
        }

        const error = new Error("Impossible de joindre le serveur API.");
        error.cause = lastError;
        throw error;
    }

    function setSession(token, user) {
        state.token = token || "";
        state.user = user || null;
        if (state.token) {
            localStorage.setItem("cc_auth_token", state.token);
        } else {
            localStorage.removeItem("cc_auth_token");
        }
    }

    function getProfileCompletion(user = state.user) {
        const completion = user?.profileCompletion;
        if (completion && typeof completion.percent === "number") {
            return {
                percent: Number(completion.percent) || 20,
                isComplete: Boolean(completion.isComplete),
                hasPhone: Boolean(completion.hasPhone),
                hasIdentityDocument: Boolean(completion.hasIdentityDocument),
                hasProfilePhoto: Boolean(completion.hasProfilePhoto),
                hasPaymentQrCode: Boolean(completion.hasPaymentQrCode),
                missingFields: Array.isArray(completion.missingFields) ? completion.missingFields : []
            };
        }

        const hasPhone = String(user?.phoneNumber || "").trim().length >= 8;
        const hasIdentityDocument = Boolean(user?.hasIdentityDocument);
        const hasProfilePhoto = Boolean(user?.hasProfilePhoto);
        const hasCountry = Boolean(user?.country || user?.location);
        const hasPaymentQrCode = Boolean(user?.hasPaymentQrCode);
        const missingFields = [];
        if (!hasPhone) missingFields.push("phoneNumber");
        if (!hasIdentityDocument) missingFields.push("identityDocument");
        if (!hasProfilePhoto) missingFields.push("profilePhoto");
        if (!hasCountry) missingFields.push("country");

        const completedSteps = (hasPhone ? 1 : 0) + (hasIdentityDocument ? 1 : 0) + (hasProfilePhoto ? 1 : 0) + (hasCountry ? 1 : 0);

        return {
            percent: Math.round((completedSteps / 4) * 100),
            isComplete: missingFields.length === 0,
            hasPhone,
            hasIdentityDocument,
            hasProfilePhoto,
            hasPaymentQrCode,
            missingFields
        };
    }

    function isProfileComplete(user = state.user) {
        return Boolean(getProfileCompletion(user).isComplete);
    }

    function isUserVerified(user = state.user) {
        return Boolean(user && (Number(user.isVerified) === 1 || user.isVerified === true));
    }

    async function restoreSession() {
        if (!state.token) {
            state.user = null;
            return null;
        }

        try {
            const payload = await api("/api/auth/me");
            setSession(state.token, payload?.user || null);
            return state.user;
        } catch {
            setSession("", null);
            return null;
        }
    }

    async function logout() {
        try {
            if (state.token) {
                await api("/api/auth/logout", { method: "POST" });
            }
        } catch {
            // continue local logout
        }
        setSession("", null);
    }

    function currentFile() {
        return (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    }

    function currentTarget() {
        const file = currentFile();
        return `${file}${window.location.search || ""}${window.location.hash || ""}`;
    }

    function nextPath(defaultPath = "dashboard.html") {
        const params = new URLSearchParams(window.location.search);
        const next = String(params.get("next") || "").trim();
        if (!next || next.includes("://")) return defaultPath;
        return next;
    }

    function toVerificationPath(target = "dashboard.html") {
        const safe = String(target || "dashboard.html").trim() || "dashboard.html";
        return `verification.html?next=${encodeURIComponent(safe)}`;
    }

    function mapIndexHashTarget(hashValue) {
        const value = String(hashValue || "").replace(/^#/, "").trim().toLowerCase();
        if (value === "search") return "results.html";
        if (value === "propose") return "post_trip.html";
        if (value === "messages") return "chat.html";
        return "";
    }

    function pageTargetFromHref(href) {
        let url;
        try {
            url = new URL(href, window.location.href);
        } catch {
            return "";
        }

        if (url.origin !== window.location.origin) return "";

        const file = (url.pathname.split("/").pop() || "index.html").toLowerCase();
        if (file === "index.html") {
            const mapped = mapIndexHashTarget(url.hash);
            if (mapped) return mapped;
        }

        return `${file}${url.search || ""}${url.hash || ""}`;
    }

    function targetFile(target) {
        const base = String(target || "").split("?")[0].split("#")[0];
        return (base || "index.html").toLowerCase();
    }

    function requiresAuthTarget(target) {
        const file = targetFile(target);
        return PROTECTED_PAGES.has(file);
    }

    function requiresCompletedProfileTarget(target) {
        const file = targetFile(target);
        return PROFILE_REQUIRED_PAGES.has(file);
    }

    function setModalFeedback(message = "", isError = true) {
        if (!ui.feedback) return;
        ui.feedback.textContent = message;
        ui.feedback.style.color = isError ? "#ffc8b7" : "#aef6d2";
    }

    function setModalExpanded(expanded) {
        ui.modalCard?.classList.toggle("modal-expanded", Boolean(expanded));
    }

    function switchModalTab(mode) {
        const loginMode = mode === "login";
        ui.loginTab?.classList.toggle("is-active", loginMode);
        ui.registerTab?.classList.toggle("is-active", !loginMode);
        ui.loginForm?.classList.toggle("hidden", !loginMode);
        ui.registerForm?.classList.toggle("hidden", loginMode);
    }

    function closeAuthModal(clearPending = false) {
        ui.modal?.classList.add("hidden");
        setModalExpanded(false);
        setModalFeedback("");
        if (clearPending) state.pendingNavigation = "";
    }

    function closeProfileModal(clearPending = false) {
        ui.profileModal?.classList.add("hidden");
        if (clearPending) state.pendingProfileNavigation = "";
    }

    function openAuthModal() {
        ui.modal?.classList.remove("hidden");
    }

    function formatMissingProfileFields(missingFields = []) {
        const labels = [];
        if (missingFields.includes("phoneNumber")) labels.push("numero de telephone");
        if (missingFields.includes("identityDocument")) labels.push("piece justificative");
        if (missingFields.includes("profilePhoto")) labels.push("photo de profil");
        if (missingFields.includes("country")) labels.push("pays de residence");
        return labels;
    }

    function updateProfileModalMessage(target = "") {
        if (!ui.profileMessage) return;
        const completion = getProfileCompletion();
        const labels = formatMissingProfileFields(completion.missingFields);
        const missingText = labels.length ? labels.join(", ") : "aucun champ";
        const actionLabel = requiresCompletedProfileTarget(target) ? "cette action" : "continuer";
        if (isUserVerified()) {
            ui.profileMessage.textContent = "Votre compte est deja verifie.";
            return;
        }
        if (completion.percent >= 75) {
            ui.profileMessage.textContent = "Votre dossier est en attente d'analyse (5-10 min). Vérifiez vos messages pour la validation. Vous pouvez aussi mettre à jour vos pièces.";
            return;
        }
        ui.profileMessage.textContent = `Profil a ${completion.percent}%. Pour ${actionLabel}, ajoutez: ${missingText}.`;
    }

    function openProfileCompletionGate(target = "") {
        ensureAuthModal();
        state.pendingProfileNavigation = target || state.pendingProfileNavigation || currentTarget();
        updateProfileModalMessage(state.pendingProfileNavigation);
        const completion = getProfileCompletion();
        const actionBtn = document.getElementById("cc-profile-complete");
        if (actionBtn) {
            actionBtn.textContent = completion.percent >= 75 ? "Mettre a jour mes infos" : "Completer maintenant";
        }
        ui.profileModal?.classList.remove("hidden");
    }

    function openAuthGate(target = "") {
        ensureAuthModal();
        state.pendingNavigation = target || state.pendingNavigation || currentTarget();

        ui.gatePanel?.classList.remove("hidden");
        ui.formPanel?.classList.add("hidden");
        setModalExpanded(false);
        setModalFeedback("");
        openAuthModal();
    }

    function openAuthForms(mode = "login") {
        ensureAuthModal();

        ui.gatePanel?.classList.add("hidden");
        ui.formPanel?.classList.remove("hidden");
        switchModalTab(mode);
        setModalExpanded(true);
        setModalFeedback("");
        openAuthModal();
    }

    function onModalAuthSuccess(payload) {
        setSession(payload.token, payload.user);
        updateHeaderUi();
        closeAuthModal(false);

        const target = state.pendingNavigation || nextPath("dashboard.html");
        state.pendingNavigation = "";

        if (requiresCompletedProfileTarget(target) && !isUserVerified(payload.user)) {
            openProfileCompletionGate(target);
            return;
        }

        window.location.href = target;
    }

    async function submitModalLogin(event) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const payload = await api("/api/auth/login", {
            method: "POST",
            auth: false,
            body: {
                email: String(data.get("email") || "").trim(),
                password: String(data.get("password") || "")
            }
        });
        onModalAuthSuccess(payload);
    }

    async function submitModalRegister(event) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const payload = await api("/api/auth/register", {
            method: "POST",
            auth: false,
            body: {
                fullName: String(data.get("fullName") || "").trim(),
                email: String(data.get("email") || "").trim(),
                password: String(data.get("password") || ""),
                role: String(data.get("userRole") || "user"),
                country: String(data.get("country") || "").trim()
            }
        });
        onModalAuthSuccess(payload);
    }

    function ensureAuthModal() {
        if (ui.initialized) return;

        const holder = document.createElement("div");
        holder.innerHTML = `
<div id="cc-auth-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="cc-auth-title">
    <div class="modal-card" id="cc-auth-modal-card">
        <button id="cc-auth-close" class="close-modal" aria-label="Fermer">x</button>

        <section id="cc-auth-gate-panel" class="modal-panel">
            <h3 id="cc-auth-title">Connexion requise</h3>
            <p>Pour continuer, connectez-vous ou creez votre compte.</p>
            <div class="gate-actions">
                <button id="cc-gate-login" class="btn primary">Se connecter</button>
                <button id="cc-gate-register" class="btn secondary">Creer un compte</button>
                <button id="cc-gate-later" class="btn ghost">Plus tard</button>
            </div>
        </section>

        <section id="cc-auth-form-panel" class="modal-panel hidden">
            <div class="auth-tab-row">
                <button id="cc-login-tab" class="tab is-active" type="button">Connexion</button>
                <button id="cc-register-tab" class="tab" type="button">Inscription</button>
            </div>

            <form id="cc-login-form" class="auth-form">
                <label>Email<input type="email" name="email" required></label>
                <label>Mot de passe<input type="password" name="password" minlength="8" required></label>
                <button type="submit" class="btn primary">Se connecter</button>
            </form>

            <form id="cc-register-form" class="auth-form hidden">
                <!-- Step 1: Selection -->
                <div id="cc-register-selection-panel">
                    <p class="form-instruction">Souhaitez-vous vous inscrire en tant que :</p>
                    <div class="auth-selection-grid">
                        <div class="selection-card" data-role="user">
                            <h4>Utilisateur</h4>
                            <p>Vendez vos kilos ou recherchez des voyageurs.</p>
                        </div>
                        <div class="selection-card" data-role="partner">
                            <h4>Partenaire</h4>
                            <p>Entreprise de mise en relation de voyageurs.</p>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Fields (hidden initially) -->
                <div id="cc-register-fields-panel" class="hidden">
                    <input type="hidden" name="userRole" id="cc-register-role" value="user">
                    <label>Nom complet<input type="text" name="fullName" required></label>
                    <label>Email<input type="email" name="email" required></label>
                    <label>Mot de passe (8+)<input type="password" name="password" minlength="8" required></label>
                    <label>Pays de résidence<input type="text" name="country" list="cc-country-datalist" placeholder="Ex: France" required></label>
                    <datalist id="cc-country-datalist"></datalist>
                    <button type="submit" class="btn secondary">Creer mon compte</button>
                    <button type="button" id="cc-register-back-to-role" class="btn ghost" style="margin-top: 10px; width: 100%;">Retour au choix du profil</button>
                </div>
            </form>

            <p id="cc-auth-feedback" class="auth-feedback"></p>
            <button id="cc-auth-back" type="button" class="btn ghost">Retour</button>
        </section>
    </div>
</div>
<div id="cc-profile-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="cc-profile-title">
    <div class="modal-card">
        <button id="cc-profile-close" class="close-modal" aria-label="Fermer">x</button>
        <section class="modal-panel">
            <h3 id="cc-profile-title">Profil incomplet</h3>
            <p id="cc-profile-message">Vous devez completer votre profil pour continuer.</p>
            <div class="gate-actions">
                <button id="cc-profile-complete" class="btn primary">Completer maintenant</button>
                <button id="cc-profile-later" class="btn ghost">Plus tard</button>
            </div>
        </section>
    </div>
</div>`;

        while (holder.firstElementChild) {
            document.body.appendChild(holder.firstElementChild);
        }

        ui.modal = document.getElementById("cc-auth-modal");
        ui.modalCard = document.getElementById("cc-auth-modal-card");
        ui.gatePanel = document.getElementById("cc-auth-gate-panel");
        ui.formPanel = document.getElementById("cc-auth-form-panel");
        ui.feedback = document.getElementById("cc-auth-feedback");
        ui.loginForm = document.getElementById("cc-login-form");
        ui.registerForm = document.getElementById("cc-register-form");
        ui.loginTab = document.getElementById("cc-login-tab");
        ui.registerTab = document.getElementById("cc-register-tab");
        ui.profileModal = document.getElementById("cc-profile-modal");
        ui.profileMessage = document.getElementById("cc-profile-message");

        document.getElementById("cc-auth-close")?.addEventListener("click", () => closeAuthModal(true));
        document.getElementById("cc-gate-later")?.addEventListener("click", () => closeAuthModal(true));
        document.getElementById("cc-gate-login")?.addEventListener("click", () => openAuthForms("login"));
        document.getElementById("cc-gate-register")?.addEventListener("click", () => openAuthForms("register"));
        document.getElementById("cc-auth-back")?.addEventListener("click", () => openAuthGate(state.pendingNavigation || currentTarget()));

        // Role selection cards
        ui.modal.querySelectorAll(".selection-card").forEach(card => {
            card.addEventListener("click", () => {
                const role = card.dataset.role;
                const roleInput = document.getElementById("cc-register-role");
                if (roleInput) roleInput.value = role;

                document.getElementById("cc-register-selection-panel")?.classList.add("hidden");
                document.getElementById("cc-register-fields-panel")?.classList.remove("hidden");
            });
        });

        document.getElementById("cc-register-back-to-role")?.addEventListener("click", () => {
            document.getElementById("cc-register-selection-panel")?.classList.remove("hidden");
            document.getElementById("cc-register-fields-panel")?.classList.add("hidden");
        });

        document.getElementById("cc-profile-close")?.addEventListener("click", () => closeProfileModal(true));
        document.getElementById("cc-profile-later")?.addEventListener("click", () => closeProfileModal(true));
        document.getElementById("cc-profile-complete")?.addEventListener("click", () => {
            const target = state.pendingProfileNavigation || currentTarget();
            state.pendingProfileNavigation = "";
            if (isUserVerified()) {
                closeProfileModal(true);
                window.location.href = "dashboard.html";
                return;
            }
            window.location.href = toVerificationPath(target);
        });

        ui.loginTab?.addEventListener("click", () => switchModalTab("login"));
        ui.registerTab?.addEventListener("click", () => switchModalTab("register"));

        ui.loginForm?.addEventListener("submit", (event) => {
            submitModalLogin(event).catch((error) => setModalFeedback(error.message || "Connexion impossible."));
        });
        ui.registerForm?.addEventListener("submit", (event) => {
            submitModalRegister(event).catch((error) => setModalFeedback(error.message || "Inscription impossible."));
        });

        ui.modal?.addEventListener("click", (event) => {
            if (event.target === ui.modal) closeAuthModal(true);
        });
        ui.profileModal?.addEventListener("click", (event) => {
            if (event.target === ui.profileModal) closeProfileModal(true);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeAuthModal(true);
                closeProfileModal(true);
            }
        });

        // Proactive population of known country datalists
        ["cc-country-datalist", "country-datalist", "destination-list", "country-options-trip"].forEach(id => {
            const el = document.getElementById(id);
            if (el && COUNTRY_OPTIONS) {
                el.innerHTML = COUNTRY_OPTIONS.map(c => `<option value="${c}">`).join("");
            }
        });

        ui.initialized = true;
    }

    function updateHeaderUi() {
        const headerAuth = document.querySelector(".header-auth");
        if (!headerAuth) return;

        const authed = Boolean(state.user && state.token);
        const isAdmin = authed && String(state.user.role || "").toLowerCase() === "admin";
        const isPartner = authed && String(state.user.role || "").toLowerCase() === "partner";
        const userName = authed ? (state.user.fullName || state.user.email || "Connecte") : "";

        // Calm mode toggle should always be there if it exists in HTML
        const calmToggle = document.getElementById("calm-mode-toggle");

        if (!authed) {
            headerAuth.innerHTML = `
                ${calmToggle ? calmToggle.outerHTML : ""}
                <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a>
            `;
            const newAuthBtn = document.getElementById("auth-open-btn");
            if (newAuthBtn) {
                newAuthBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    state.pendingNavigation = currentTarget();
                    openAuthForms("login");
                });
            }
        } else {
            headerAuth.innerHTML = `
                ${calmToggle ? calmToggle.outerHTML : ""}
                <div class="user-menu" id="cc-user-menu">
                    <button class="user-trigger" id="cc-user-trigger">
                        <span>${escapeHtml(userName)}</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </button>
                    <div class="user-dropdown">
                        ${isAdmin ? '<a href="admin.html">Admin Panel</a>' : ""}
                        <a href="dashboard.html">Dashboard</a>
                        <a href="post_trip.html">Publier un trajet</a>
                        <button class="logout-item" id="cc-logout-btn">Quitter</button>
                    </div>
                </div>
            `;

            // Dropdown Toggle Logic
            const menu = document.getElementById("cc-user-menu");
            const trigger = document.getElementById("cc-user-trigger");
            if (trigger && menu) {
                trigger.addEventListener("click", (e) => {
                    e.stopPropagation();
                    menu.classList.toggle("is-active");
                });
            }

            // Logout Logic
            const logoutBtn = document.getElementById("cc-logout-btn");
            if (logoutBtn) {
                logoutBtn.addEventListener("click", async () => {
                    await logout();
                    updateHeaderUi();
                    window.location.href = "index.html";
                });
            }

            // Close dropdown on click outside
            document.addEventListener("click", () => {
                menu?.classList.remove("is-active");
            }, { once: false });
        }

        // Re-bind calm mode if it was replaced
        const newCalmToggle = document.getElementById("calm-mode-toggle");
        if (newCalmToggle) {
            newCalmToggle.addEventListener("click", () => {
                document.body.classList.toggle("is-calm");
                const isCalm = document.body.classList.contains("is-calm");
                localStorage.setItem("calm-mode", isCalm);
            });
        }

        // --- Sync active classes for navigation links ---
        const file = currentFile();
        document.querySelectorAll(".main-nav .nav-link").forEach(link => {
            const href = link.getAttribute("href");
            if (!href) return;
            const isActive = href === file || (file === "index.html" && href === "index.html");
            link.classList.toggle("is-active", isActive);
        });

        syncHeaderMobileUi();
    }

    function syncHeaderMobileUi() {
        const authed = Boolean(state.user && state.token);
        const isAdmin = authed && String(state.user.role || "").toLowerCase() === "admin";
        const isPartner = authed && String(state.user.role || "").toLowerCase() === "partner";
        const nav = document.querySelector(".mobile-bottom-nav");
        if (!nav) return;

        const file = currentFile();

        // Sync active class for existing generic mobile links
        nav.querySelectorAll(".mob-nav-item").forEach(item => {
            const href = item.getAttribute("href");
            if (!href) return;
            const isActive = href === file || (file === "index.html" && href === "index.html");
            item.classList.toggle("active", isActive);
        });

        // Admin Link
        let adminLink = document.getElementById("mobile-admin-link");
        if (isAdmin) {
            if (!adminLink) {
                const a = document.createElement("a");
                a.id = "mobile-admin-link";
                a.href = "admin.html";
                a.className = "mob-nav-item";
                a.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    <span>Admin</span>`;
                nav.appendChild(a);
                adminLink = a;
            }
            adminLink.classList.remove("hidden");
            const file = currentFile();
            const isAtAdmin = file === "admin.html" || file === "approvals.html";
            adminLink.classList.toggle("active", isAtAdmin);
        } else if (adminLink) {
            adminLink.remove();
        }

        // Partner Link
        let partnerMobileLink = document.getElementById("mobile-partner-link");
        if (isPartner) {
            if (!partnerMobileLink) {
                const a = document.createElement("a");
                a.id = "mobile-partner-link";
                a.href = "partner.html";
                a.className = "mob-nav-item";
                a.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                    <span>Partenaire</span>`;
                // Insert before dashboard/profile link (last child)
                const lastChild = nav.lastElementChild;
                if (lastChild) nav.insertBefore(a, lastChild);
                else nav.appendChild(a);
                partnerMobileLink = a;
            }
            partnerMobileLink.classList.remove("hidden");
            const file = currentFile();
            partnerMobileLink.classList.toggle("active", file === "partner.html");
        } else if (partnerMobileLink) {
            partnerMobileLink.remove();
        }
    }

    // ── Notification Badges ────────────────────────────────────────────
    let _notifPollingTimer = null;

    function _applyBadgeToLink(link, chatCount, adminCount) {
        if (!link) return;
        // Wrap the content in a nav-notif-wrapper if not already done
        let wrapper = link.querySelector(".nav-notif-wrapper");
        if (!wrapper) {
            // Move all existing children into wrapper
            wrapper = document.createElement("span");
            wrapper.className = "nav-notif-wrapper";
            while (link.firstChild) wrapper.appendChild(link.firstChild);
            link.appendChild(wrapper);
        }

        // Remove old badges
        link.querySelectorAll(".notif-badge, .notif-badge-admin").forEach(el => el.remove());

        if (adminCount > 0) {
            // Yellow triangle (admin beats chat in priority)
            const tri = document.createElement("span");
            tri.className = "notif-badge-admin";
            tri.setAttribute("aria-label", `${adminCount} message(s) administrateur`);
            wrapper.appendChild(tri);
        } else if (chatCount > 0) {
            // Red circle bubble
            const bubble = document.createElement("span");
            bubble.className = "notif-badge";
            bubble.textContent = chatCount > 99 ? "99+" : String(chatCount);
            bubble.setAttribute("aria-label", `${chatCount} message(s) non lu(s)`);
            wrapper.appendChild(bubble);
        }
    }

    async function syncNotificationBadges() {
        if (!state.user || !state.token) return;
        try {
            const counts = await api("/api/me/notification-counts");
            const chat = Number(counts?.chatUnread || 0);
            const admin = Number(counts?.adminUnread || 0);

            // Desktop nav
            const desktopLinks = document.querySelectorAll(".main-nav a[href*='chat.html']");
            desktopLinks.forEach(link => _applyBadgeToLink(link, chat, admin));

            // Mobile bottom nav
            const mobileLinks = document.querySelectorAll(".mobile-bottom-nav a[href*='chat.html']");
            mobileLinks.forEach(link => _applyBadgeToLink(link, chat, admin));

        } catch {
            // Silently ignore – don't disrupt the UI if the call fails
        }
    }

    function startNotifPolling() {
        if (_notifPollingTimer) return; // already running
        syncNotificationBadges();
        _notifPollingTimer = setInterval(syncNotificationBadges, 120000);
    }

    function stopNotifPolling() {
        if (_notifPollingTimer) {
            clearInterval(_notifPollingTimer);
            _notifPollingTimer = null;
        }
    }

    function bindHeaderEvents() {
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn && !logoutBtn.dataset.bound) {
            logoutBtn.dataset.bound = "true";
            logoutBtn.addEventListener("click", async () => {
                await logout();
                updateHeaderUi();
                window.location.href = "index.html";
            });
        }
    }

    function initProtectedNavigationInterceptor() {
        if (document.body.dataset.ccProtectedBound === "true") return;
        document.body.dataset.ccProtectedBound = "true";

        document.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            if (target.closest("#cc-auth-modal")) return;
            if (target.closest("#cc-profile-modal")) return;

            const link = target.closest("a[href]");
            if (!link) return;

            const href = String(link.getAttribute("href") || "").trim();
            if (!href) return;
            if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

            const pageTarget = pageTargetFromHref(href);
            if (!pageTarget) return;

            const page = targetFile(pageTarget);
            if (page === "auth.html" || page === "verification.html") return;
            if (!requiresAuthTarget(pageTarget)) return;

            if (!state.user || !state.token) {
                event.preventDefault();
                openAuthGate(pageTarget);
                return;
            }

            if (requiresCompletedProfileTarget(pageTarget) && !isUserVerified()) {
                event.preventDefault();
                openProfileCompletionGate(pageTarget);
            }
        }, true);
    }

    function requireAuth(target) {
        if (state.user && state.token) return true;
        openAuthGate(target || currentTarget());
        return false;
    }

    function requireProfileCompletion(target) {
        if (!requireAuth(target)) return false;
        if (isUserVerified()) return true;
        openProfileCompletionGate(target || currentTarget());
        return false;
    }

    async function init(activePage = "") {
        await restoreSession();
        ensureAuthModal();
        updateHeaderUi();
        bindHeaderEvents();
        initProtectedNavigationInterceptor();

        if (state.user && state.token) {
            startNotifPolling();
        }

        if (!state.user && requiresAuthTarget(currentTarget())) {
            openAuthGate(currentTarget());
        }

        if (state.user && requiresCompletedProfileTarget(currentTarget()) && !isUserVerified()) {
            openProfileCompletionGate(currentTarget());
        }

        if (activePage) {
            const links = Array.from(document.querySelectorAll(".main-nav .nav-link"));
            for (const link of links) {
                const href = String(link.getAttribute("href") || "").toLowerCase();
                const isMatch =
                    (activePage === "results" && href.includes("results.html")) ||
                    (activePage === "post_trip" && href.includes("post_trip.html")) ||
                    (activePage === "chat" && href.includes("chat.html")) ||
                    (activePage === "dashboard" && href.includes("dashboard.html")) ||
                    (activePage === "partner" && href.includes("partner.html")) ||
                    (activePage === "home" && (href === "index.html" || href === "/index.html")) ||
                    (activePage === "verification" && href.includes("verification.html"));
                link.classList.toggle("is-active", isMatch);
            }
        }

        return state.user;
    }

    window.CCCommon = {
        state,
        api,
        setSession,
        restoreSession,
        logout,
        requireAuth,
        requireProfileCompletion,
        requireCompletedProfile: requireProfileCompletion,
        getProfileCompletion,
        isProfileComplete,
        isUserVerified,
        init,
        nextPath,
        escapeHtml,
        normalizeText,
        openAuthGate,
        openAuthForms,
        openProfileCompletionGate,
        toVerificationPath,
        syncNotificationBadges,
        startNotifPolling,
        stopNotifPolling,
        formatAmount,
        convertCurrency,
        getSmartRoundedAmount,
        EXCHANGE_RATES,
        COUNTRY_CURRENCIES,
        COUNTRY_CALLING_CODES,
        COUNTRY_OPTIONS
    };

    // Auto-init on DOMContentLoaded if not already done manually
    document.addEventListener("DOMContentLoaded", () => {
        // Small delay to let other scripts potentially call init manually if needed
        setTimeout(() => {
            if (!ui.initialized) {
                window.CCCommon.init().catch(err => console.error("Auto-init failed:", err));
            }
        }, 100);
    });
})();
