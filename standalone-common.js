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
        "Albanie": "ALL", "Arménie": "AMD", "Azerbaà¯djan": "AZN", "Biélorussie": "BYN", "Bosnie-Herzégovine": "BAM", "Bulgarie": "BGN", "Danemark": "DKK", "Géorgie": "GEL", "Hongrie": "HUF", "Islande": "ISK", "Kazakhstan": "KZT", "Liechtenstein": "CHF", "Macédoine du Nord": "MKD", "Moldavie": "MDL", "Norvà¨ge": "NOK", "Pologne": "PLN", "Roumanie": "RON", "Royaume-Uni": "GBP", "Russie": "RUB", "Serbie": "RSD", "Suà¨de": "SEK", "Suisse": "CHF", "République tchà¨que": "CZK", "Turquie": "TRY", "Ukraine": "UAH",
        // Moyen-Orient
        "Arabie Saoudite": "SAR", "Bahreà¯n": "BHD", "à‰mirats Arabes Unis": "AED", "Irak": "IQD", "Iran": "IRR", "Israà«l": "ILS", "Jordanie": "JOD", "Koweà¯t": "KWD", "Liban": "LBP", "Oman": "OMR", "Palestine": "ILS", "Qatar": "QAR", "Syrie": "SYP", "Yémen": "YER",
        // Asie
        "Afghanistan": "AFN", "Bangladesh": "BDT", "Bhoutan": "BTN", "Birmanie": "MMK", "Brunei": "BND", "Cambodge": "KHR", "Chine": "CNY", "Chili": "CLP", "Corée du Nord": "KPW", "Corée du Sud": "KRW", "Hong Kong": "HKD", "Inde": "INR", "Indonésie": "IDR", "Japon": "JPY", "Kirghizistan": "KGS", "Laos": "LAK", "Macao": "MOP", "Malaisie": "MYR", "Maldives": "MVR", "Mongolie": "MNT", "Népal": "NPR", "Ouzbékistan": "UZS", "Pakistan": "PKR", "Philippines": "PHP", "Singapour": "SGD", "Sri Lanka": "LKR", "Tadjikistan": "TJS", "Taïwan": "TWD", "Thaïlande": "THB", "Timor oriental": "USD", "Turkménistan": "TMT", "Vietnam": "VND",
        // Amériques (Nord & Central)
        "Bahamas": "BSD", "Barbade": "BBD", "Belize": "BZD", "Canada": "CAD", "Costa Rica": "CRC", "Cuba": "CUP", "Dominique": "XCD", "États-Unis": "USD", "Grenade": "XCD", "Guatemala": "GTQ", "Haïti": "HTG", "Honduras": "HNL", "Jamaà¯que": "JMD", "Mexique": "MXN", "Nicaragua": "NIO", "Panama": "USD", "République dominicaine": "DOP", "Saint-Kitts-et-Nevis": "XCD", "Sainte-Lucie": "XCD", "Saint-Vincent-et-les Grenadines": "XCD", "Salvador": "USD", "Trinité-et-Tobago": "TTD",
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
        "Albanie": "+355", "Arménie": "+374", "Azerbaà¯djan": "+994", "Biélorussie": "+375", "Bosnie-Herzégovine": "+387", "Bulgarie": "+359", "Danemark": "+45", "Géorgie": "+995", "Hongrie": "+36", "Islande": "+354", "Kazakhstan": "+7", "Liechtenstein": "+423", "Macédoine du Nord": "+389", "Moldavie": "+373", "Norvà¨ge": "+47", "Pologne": "+48", "Roumanie": "+40", "Royaume-Uni": "+44", "Russie": "+7", "Serbie": "+381", "Suà¨de": "+46", "Suisse": "+41", "République tchà¨que": "+420", "Turquie": "+90", "Ukraine": "+380",
        // Moyen-Orient
        "Arabie Saoudite": "+966", "Bahreà¯n": "+973", "à‰mirats Arabes Unis": "+971", "Irak": "+964", "Iran": "+98", "Israà«l": "+972", "Jordanie": "+962", "Koweà¯t": "+965", "Liban": "+961", "Oman": "+968", "Palestine": "+970", "Qatar": "+974", "Syrie": "+963", "Yémen": "+967",
        // Asie
        "Afghanistan": "+93", "Bangladesh": "+880", "Bhoutan": "+975", "Birmanie": "+95", "Brunei": "+673", "Cambodge": "+855", "Chine": "+86", "Corée du Nord": "+850", "Corée du Sud": "+82", "Hong Kong": "+852", "Inde": "+91", "Indonésie": "+62", "Japon": "+81", "Kirghizistan": "+996", "Laos": "+856", "Macao": "+853", "Malaisie": "+60", "Maldives": "+960", "Mongolie": "+976", "Népal": "+977", "Ouzbékistan": "+998", "Pakistan": "+92", "Philippines": "+63", "Singapour": "+65", "Sri Lanka": "+94", "Tadjikistan": "+992", "Taïwan": "+886", "Thaïlande": "+66", "Timor oriental": "+670", "Turkménistan": "+993", "Vietnam": "+84",
        // Amériques
        "Bahamas": "+1-242", "Barbade": "+1-246", "Belize": "+501", "Canada": "+1", "Costa Rica": "+506", "Cuba": "+53", "Dominique": "+1-767", "États-Unis": "+1", "Grenade": "+1-473", "Guatemala": "+502", "Haïti": "+509", "Honduras": "+504", "Jamaà¯que": "+1-876", "Mexique": "+52", "Nicaragua": "+505", "Panama": "+507", "République dominicaine": "+1-809", "Saint-Kitts-et-Nevis": "+1-869", "Sainte-Lucie": "+1-758", "Saint-Vincent-et-les Grenadines": "+1-784", "Salvador": "+503", "Trinité-et-Tobago": "+1-868",
        "Argentine": "+54", "Bolivie": "+591", "Brésil": "+55", "Chili": "+56", "Colombie": "+57", "Équateur": "+593", "Guyana": "+592", "Paraguay": "+595", "Pérou": "+51", "Suriname": "+597", "Uruguay": "+598", "Venezuela": "+58",
        // Océanie
        "Australie": "+61", "Fidji": "+679", "Kiribati": "+686", "Nauru": "+674", "Nouvelle-Zélande": "+64", "Palaos": "+680", "Papouasie-Nouvelle-Guinée": "+675", "Salomon": "+677", "Samoa": "+685", "Tonga": "+676", "Tuvalu": "+688", "Vanuatu": "+678"
    };

    const COUNTRY_OPTIONS = Object.keys(COUNTRY_CURRENCIES).sort((a, b) => a.localeCompare(b, "fr"));


    const state = {
        token: localStorage.getItem("cc_auth_token") || "",
        user: null,
        pendingNavigation: "",
        pendingProfileNavigation: "",
        lang: localStorage.getItem("cc_lang") || "fr"
    };

    const TRANSLATIONS = {
        fr: {
            "nav_home": "Accueil",
            "nav_explore": "Explorer",
            "nav_post": "Publier",
            "nav_messages": "Messages",
            "nav_partner": "Partenaire",
            "brand_sub": "Transport de colis entre particuliers",
            "auth_login": "Login",
            "auth_logout": "Quitter",
            "hero_kicker": "Plateforme de confiance",
            "hero_title": "Trouvez des expéditeurs sà»rs pour vos colis en moins de 10 secondes.",
            "hero_p": "Connectez-vous avec des voyageurs certifiés pour un transport de colis fluide, sécurisé et ultra-rapide entre particuliers.",
            "hero_btn_find": "Trouver un voyageur",
            "hero_btn_post": "Proposer mes kilos",
            "est_badge": "Tester mon trajet",
            "est_title": "Faire une estimation rapide",
            "est_origin": "Pays de départ",
            "est_dest": "Pays d'arrivée",
            "est_kg": "Poids (kg)",
            "est_submit": "Estimer ðŸš€",
            "panel_search_h2": "Rechercher un transporteur",
            "panel_search_p": "Trouvez les voyageurs actifs par destination, prix et kilos disponibles.",
            "panel_search_btn": "Aller à  la recherche",
            "panel_post_h2": "Proposer votre trajet",
            "panel_post_p": "Publiez votre trajet avec vos kilos libres. Votre offre devient visible en recherche.",
            "panel_post_btn": "Publier une offre",
            "panel_chat_h2": "Discuter et confirmer",
            "panel_chat_p": "La messagerie se débloque dà¨s qu'une réservation est créée.",
            "panel_chat_btn": "Ouvrir les messages",
            "profile_title": "Profil",
            "lang_toggle_target": "EN"
        },
        en: {
            "nav_home": "Home",
            "nav_explore": "Explore",
            "nav_post": "Post",
            "nav_messages": "Chat",
            "nav_partner": "Partner",
            "brand_sub": "Parcel transport between individuals",
            "auth_login": "Sign In",
            "auth_logout": "Log Out",
            "hero_kicker": "Trusted Platform",
            "hero_title": "Find reliable shippers for your parcels in under 10 seconds.",
            "hero_p": "Connect with certified travelers for smooth, secure, and ultra-fast parcel transport between individuals.",
            "hero_btn_find": "Find a traveler",
            "hero_btn_post": "Propose my kilos",
            "est_badge": "Test my route",
            "est_title": "Quick Estimate",
            "est_origin": "Departure country",
            "est_dest": "Arrival country",
            "est_kg": "Weight (kg)",
            "est_submit": "Estimate ðŸš€",
            "panel_search_h2": "Search for a carrier",
            "panel_search_p": "Find active travelers by destination, price, and available weight.",
            "panel_search_btn": "Go to search",
            "panel_post_h2": "Offer your trip",
            "panel_post_p": "Post your trip with your free kilos. Your offer becomes visible in search.",
            "panel_post_btn": "Post an offer",
            "panel_chat_h2": "Chat and confirm",
            "panel_chat_p": "Messaging unlocks as soon as a reservation is created.",
            "panel_chat_btn": "Open messages",
            "profile_title": "Profile",
            "lang_toggle_target": "FR"
        }
    };

    function applyTranslations() {
        const lang = state.lang;
        const t = TRANSLATIONS[lang];

        // Header & Nav
        const navMap = {
            "index.html": t.nav_home,
            "results.html": t.nav_explore,
            "post_trip.html": t.nav_post,
            "chat.html": t.nav_messages,
            "partner.html": t.nav_partner
        };

        document.querySelectorAll(".main-nav a, .mobile-bottom-nav a").forEach(link => {
            const href = link.getAttribute("href") || "";
            for (const key in navMap) {
                if (href.includes(key)) {
                    const span = link.querySelector("span");
                    if (span) span.textContent = navMap[key];
                    else if (link.textContent.length < 20) link.textContent = navMap[key];
                }
            }
        });

        const brandSub = document.querySelector(".brand-sub");
        if (brandSub) brandSub.textContent = t.brand_sub;

        const loginBtn = document.getElementById("auth-open-btn");
        if (loginBtn) loginBtn.textContent = t.auth_login;

        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) logoutBtn.textContent = t.auth_logout;

        const profSpan = document.querySelector(".mob-nav-item[href*='dashboard.html'] span");
        if (profSpan) profSpan.textContent = t.profile_title;

        // Homepage Specifics
        const kicker = document.querySelector(".hero-copy .kicker");
        if (kicker) kicker.textContent = t.hero_kicker;

        const h1 = document.querySelector(".hero-copy h1");
        if (h1) h1.textContent = t.hero_title;

        const heroP = document.querySelector(".hero-copy p");
        if (heroP) heroP.textContent = t.hero_p;

        const findBtn = document.querySelector(".hero-actions .btn.primary");
        if (findBtn) findBtn.textContent = t.hero_btn_find;

        const proposeBtn = document.querySelector(".hero-actions .btn.secondary");
        if (proposeBtn) proposeBtn.textContent = t.hero_btn_post;

        // Estimator
        const estBadge = document.querySelector(".ProactiveBadge");
        if (estBadge) estBadge.textContent = t.est_badge;

        const estTitle = document.querySelector(".estimator-title");
        if (estTitle) estTitle.textContent = t.est_title;

        const estOrigin = document.getElementById("est-origin");
        if (estOrigin) estOrigin.placeholder = t.est_origin;

        const estDest = document.getElementById("est-dest");
        if (estDest) estDest.placeholder = t.est_dest;

        const estKg = document.getElementById("est-kg");
        if (estKg) estKg.placeholder = t.est_kg;

        const estBtn = document.getElementById("est-submit-btn");
        if (estBtn) estBtn.textContent = t.est_submit;

        // Panels
        const panels = document.querySelectorAll(".panel-card");
        if (panels.length >= 3) {
            // Panel 1: Search
            panels[0].querySelector("h2").textContent = t.panel_search_h2;
            panels[0].querySelector("p").textContent = t.panel_search_p;
            panels[0].querySelector(".btn").textContent = t.panel_search_btn;

            // Panel 2: Post
            panels[1].querySelector("h2").textContent = t.panel_post_h2;
            panels[1].querySelector("p").textContent = t.panel_post_p;
            // Correction for TrustTag (contains SVG)
            const tt2 = panels[1].querySelector(".TrustTag");
            if (tt2) {
                const nodes = Array.from(tt2.childNodes);
                const textNode = nodes.find(n => n.nodeType === 3);
                if (textNode) textNode.textContent = " " + (lang === "en" ? "Secure Payment Guaranteed" : "Paiement sécurisé Garanti");
            }
            panels[1].querySelector(".btn").textContent = t.panel_post_btn;

            // Panel 3: Chat
            panels[2].querySelector("h2").textContent = t.panel_chat_h2;
            panels[2].querySelector("p").textContent = t.panel_chat_p;
            const tt3 = panels[2].querySelector(".TrustTag");
            if (tt3) {
                const nodes = Array.from(tt3.childNodes);
                const textNode = nodes.find(n => n.nodeType === 3);
                if (textNode) textNode.textContent = " " + (lang === "en" ? "Average response time: 5 min" : "Temps de réponse moyen: 5 min");
            }
            panels[2].querySelector(".btn").textContent = t.panel_chat_btn;
        }

        // Update Toggle Text
        const langToggle = document.getElementById("cc-lang-toggle");
        if (langToggle) langToggle.textContent = t.lang_toggle_target;

        document.documentElement.setAttribute("lang", lang);
    }

    function injectLanguageToggle() {
        const headerAuth = document.querySelector(".header-auth");
        if (!headerAuth) return;
        if (document.getElementById("cc-lang-toggle")) return;

        const btn = document.createElement("button");
        btn.id = "cc-lang-toggle";
        btn.className = "lang-toggle";
        btn.textContent = state.lang === "fr" ? "EN" : "FR";

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            state.lang = state.lang === "fr" ? "en" : "fr";
            localStorage.setItem("cc_lang", state.lang);
            applyTranslations();
        });

        headerAuth.prepend(btn);
    }


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

        const symbols = { EUR: '€', USD: '$', GBP: '£', CNY: '¥', JPY: '¥', XOF: ' FCFA', XAF: ' FCFA', NGN: 'â‚¦' };
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

    /**
     * Retourne la devise du pays de résidence de l'utilisateur connecté.
     * Utilise COUNTRY_CURRENCIES pour la correspondance pays → devise.
     * Fallback: EUR si l'utilisateur n'a pas de pays défini.
     */
    function getUserCurrency() {
        const user = state.user;
        const country = user?.country || user?.user_metadata?.country || "";
        return COUNTRY_CURRENCIES[country] || "EUR";
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

    function buildContactBlockedError(result) {
        const error = new Error("Partager des coordonnées personnelles avant paiement est interdit.");
        error.status = 400;
        error.code = "CONTACT_INFO_BLOCKED";
        error.payload = {
            code: "CONTACT_INFO_BLOCKED",
            risk: result?.risk || 0,
            flags: result?.flags || [],
            summary: result?.summary || ""
        };
        return error;
    }

    async function recentChatText(threadId, limit = 6) {
        try {
            const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            const { data, error } = await window.ccSupabase
                .from("chat_messages")
                .select("text,created_at")
                .eq("thread_id", threadId)
                .gte("created_at", since)
                .order("created_at", { ascending: false })
                .limit(limit);
            if (error) throw error;
            return (data || []).reverse().map((row) => row.text || "").join("\n");
        } catch (error) {
            console.warn("Anti-contact recent chat lookup failed:", error.message || error);
            return "";
        }
    }

    async function threadModerationContext(threadId) {
        try {
            const { data, error } = await window.ccSupabase
                .from("chat_threads")
                .select("id,reservation_id")
                .eq("id", threadId)
                .maybeSingle();
            if (error) throw error;
            return data || { id: threadId, reservation_id: null };
        } catch (error) {
            console.warn("Anti-contact thread context lookup failed:", error.message || error);
            return { id: threadId, reservation_id: null };
        }
    }

    async function logContactModeration({ threadId, text, result, action }) {
        try {
            const context = await threadModerationContext(threadId);
            const payload = {
                thread_id: threadId,
                reservation_id: context.reservation_id || null,
                user_id: state.user?.id || null,
                risk_level: result.riskLevel || "high",
                summary: result.summary || "Tentative de contournement anti-contact détectée.",
                flags: result.flags || [],
                is_dismissed: false,
                raw_content: text,
                normalized_content: result.normalized || "",
                action_taken: action || result.action || "blocked"
            };
            const { error } = await window.ccSupabase.from("ai_moderation_logs").insert(payload);
            if (error) throw error;
        } catch (error) {
            console.warn("Anti-contact moderation log failed:", error.message || error);
        }
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
                const { data, error } = await window.ccSupabase.auth.signUp({
                    email: options.body.email,
                    password: options.body.password,
                    options: {
                        data: {
                            full_name: options.body.fullName,
                            role: options.body.role || "user",
                            country: options.body.country || ""
                        }
                    }
                });
                if (error) throw error;

                // Creer le profil avec profile_type = 'client' par defaut
                const userId = data.user?.id;
                if (userId) {
                    const { error: profileError } = await window.ccSupabase.from('profiles').upsert({
                        id: userId,
                        full_name: options.body.fullName || "",
                        email: options.body.email || "",
                        country: options.body.country || "",
                        profile_type: options.body.profile_type || "client",
                        created_at: new Date().toISOString()
                    }, { onConflict: 'id' });
                    if (profileError) throw profileError;
                }

                return { message: "Inscription réussie", user: data.user };
            }
            if (p.includes("/auth/me")) {
                const { data: { user }, error: authErr } = await window.ccSupabase.auth.getUser();
                if (authErr || !user) throw authErr || new Error("No user");
                const { data: profile } = await window.ccSupabase.from('profiles').select('*').eq('id', user.id).single();
                const u = { ...user, ...user.user_metadata, ...(profile || {}), id: user.id };
                if (u.is_verified !== undefined) u.isVerified = u.is_verified;
                if (u.is_active !== undefined) u.isActive = u.is_active;
                return { user: u };
            }

            // 2. PROFILE UPDATE (PATCH)
            if (p.includes("/users/me/profile") && options.method === "PATCH") {
                const mapping = {
                    fullName: 'full_name',
                    phoneNumber: 'phone_number',
                    country: 'country',
                    identityDocumentData: 'identity_document',
                    profilePhotoData: 'profile_photo',
                    profileType: 'profile_type'
                };
                const mappedBody = {};
                for (const k in options.body) { mappedBody[mapping[k] || k] = options.body[k]; }

                // Validation & règles de transition de profil type
                if (mappedBody.profile_type !== undefined) {
                    const currentType = state.user?.profile_type || null;
                    const nextType = mappedBody.profile_type;

                    if (nextType === 'client') {
                        // Impossible de repasser à un grade inférieur (qui est déjà classé client, traveler, cargo)
                        if (currentType !== null) {
                            delete mappedBody.profile_type;
                        }
                    }
                    // Les transitions de client -> traveler / client -> cargo et traveler <-> cargo sont entièrement autorisées.
                }

                let data = [];
                if (Object.keys(mappedBody).length > 0) {
                    const { data: updated, error } = await window.ccSupabase.from('profiles').update(mappedBody).eq('id', state.user?.id).select();
                    if (error) throw error;
                    data = updated;
                }

                const updatedRow = (data && data[0]) ? data[0] : {};
                state.user = { ...state.user, ...updatedRow };
                return { success: true, user: state.user };
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
                    const { data: profile, error: pErr } = await window.ccSupabase.from('profiles').select('profile_type').eq('id', state.user?.id).single();
                    if (pErr) throw pErr;

                    const profileType = profile?.profile_type;
                    if (profileType === 'traveler' || profileType === 'cargo') {
                        const today = new Date().toISOString().split('T')[0];
                        const { data: activeOffers, error: activeErr } = await window.ccSupabase.from('offers')
                            .select('id')
                            .eq('user_id', state.user?.id)
                            .eq('status', 'active')
                            .gte('departure_date', today);
                        if (activeErr) throw activeErr;

                        const count = activeOffers ? activeOffers.length : 0;
                        if (profileType === 'traveler' && count >= 1) {
                            throw new Error("Limite de trajet dépassée : En tant que voyageur simple, vous ne pouvez publier qu'un seul trajet actif à la fois.");
                        }
                        if (profileType === 'cargo' && count >= 5) {
                            throw new Error("Limite de trajets dépassée : En tant que cargo, vous ne pouvez pas avoir plus de 5 trajets actifs simultanément.");
                        }
                    }

                    const mapping = {
                        availableKg: 'available_kg',
                        pricePerKg: 'price_per_kg',
                        departureDate: 'departure_date',
                        baseCurrency: 'base_currency',
                        paymentMethod: 'payment_method',
                        paymentQr: 'payment_qr',
                        referralCode: 'referral_code'
                    };
                    const mappedBody = {};
                    for (const k in options.body) mappedBody[mapping[k] || k] = options.body[k];
                    const { data, error } = await window.ccSupabase.from('offers').insert([{ ...mappedBody, user_id: state.user?.id }]).select();
                    if (error) throw error;
                    return data[0];
                }
                // GET WITH JOIN
                let query;
                // Si scope=mine, pas besoin de jointure (l'utilisateur voit ses propres offres)
                if (p.includes("scope=mine")) {
                    query = window.ccSupabase.from('offers').select('*');
                } else {
                    // Jointure profiles seulement si l'utilisateur est connecté (sinon RLS bloque)
                    query = window.ccSupabase.from('offers').select('*, profiles!offers_user_id_fkey(full_name, is_verified, profile_type)');
                }
                if (p.includes("scope=mine")) {
                    query = query.eq('user_id', state.user?.id);
                } else {
                    const today = new Date().toISOString().split('T')[0];
                    const params = new URLSearchParams(path.split('?')[1] || "");
                    query = query.eq('status', 'active');
                    query = query.gte('departure_date', today); // Exclure automatiquement les offres expirées
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
                    ownerIsVerified: o.profiles?.is_verified,
                    ownerProfileType: o.profiles?.profile_type
                }));
                return { items };
            }

            // 4. CONVERSATIONS & MESSAGES
            if (p.includes("/api/conversations")) {
                if (p.includes("/by-offer") && options.method === "POST") {
                    const { offerId } = options.body;
                    const { data: offer } = await window.ccSupabase.from('offers').select('user_id').eq('id', offerId).single();
                    if (!offer) throw new Error("Offre introuvable");

                    // Vérifier si un thread existe déjà 
                    let { data: thread } = await window.ccSupabase.from('chat_threads').select('*').eq('offer_id', offerId).eq('user_id', state.user?.id).maybeSingle();

                    if (!thread) {
                        // Création d'une réservation automatique
                        const { data: res, error: resErr } = await window.ccSupabase.from('reservations').insert({
                            user_id: state.user?.id,
                            offer_id: offerId,
                            status: 'pending'
                        }).select().single();
                        if (resErr) throw resErr;

                        // Création du thread lié
                        const { data: created, error } = await window.ccSupabase.from('chat_threads').insert([{
                            offer_id: offerId,
                            user_id: state.user?.id,
                            offer_owner_id: offer.user_id,
                            reservation_id: res.id
                        }]).select().single();
                        if (error) throw error;
                        thread = created;
                    } else if (!thread.reservation_id) {
                        // Réparation : créer une réservation si le thread existait sans (cas de migration)
                        const { data: res } = await window.ccSupabase.from('reservations').insert({
                            user_id: state.user?.id,
                            offer_id: offerId,
                            status: 'pending'
                        }).select().single();
                        if (res) {
                            const { data: updated } = await window.ccSupabase.from('chat_threads').update({ reservation_id: res.id }).eq('id', thread.id).select().single();
                            thread = updated;
                        }
                    }
                    return thread;
                }
                const threadMatch = path.match(/\/api\/conversations\/([^\/\?]+)\/messages/);
                if (threadMatch && options.method === "POST") {
                    // SEND MESSAGE
                    const threadId = threadMatch[1];
                    const text = String(options.body?.text || "");
                    if (window.CCAntiContact?.evaluate) {
                        const recentText = await recentChatText(threadId);
                        const moderation = window.CCAntiContact.evaluate(text, { recentText });
                        if (!moderation.allowed) {
                            await logContactModeration({ threadId, text, result: moderation, action: "blocked" });
                            throw buildContactBlockedError(moderation);
                        }
                        if (moderation.action === "warn") {
                            await logContactModeration({ threadId, text, result: moderation, action: "warned" });
                        }
                    }
                    const senderType = state.user?.id ? "user" : "system";
                    const { data, error } = await window.ccSupabase.from('chat_messages').insert({
                        thread_id: threadId,
                        sender_user_id: state.user?.id,
                        sender_type: senderType,
                        text
                    }).select().single();
                    if (error) throw error;
                    return data;
                }
                if (threadMatch) {
                    // GET MESSAGES
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

                // LIST CONVS with status and traveler profile info
                const { data, error } = await window.ccSupabase.from('chat_threads')
                    .select('*, reservations(id, status), offer_owner:profiles!chat_threads_offer_owner_id_fkey(*), user:profiles!chat_threads_user_id_fkey(*)')
                    .or(`user_id.eq.${state.user?.id},offer_owner_id.eq.${state.user?.id}`);

                if (error) throw error;

                return (data || []).map(t => {
                    const isOwner = t.offer_owner_id === state.user?.id;
                    const otherPerson = isOwner ? t.user : t.offer_owner;

                    const resObj = Array.isArray(t.reservations) ? t.reservations[0] : t.reservations;
                    return {
                        ...t,
                        reservation: resObj ? { id: resObj.id, status: resObj.status } : null,
                        status: resObj?.status || "pending",
                        reservation_id: t.reservation_id || resObj?.id,
                        isOfferOwner: isOwner,
                        travelerName: otherPerson?.full_name || (isOwner ? "Client" : "Voyageur"),
                        travelerAlipayQr: otherPerson?.alipay_qr,
                        travelerWechatQr: otherPerson?.wechat_qr
                    };
                });
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
            if (p.includes("/ai/chat") || p.includes("/admin/bot/chat")) {
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
                const idVerifyMatch = path.match(/\/admin\/users\/([^\/\?]+)\/verify/);
                if (idVerifyMatch && options.method === "PATCH") {
                    const { error } = await window.ccSupabase.from('profiles').update({ is_verified: options.body.isVerified }).eq('id', idVerifyMatch[1]);
                    if (error) throw error;
                    return { success: true };
                }
                const idStatusMatch = path.match(/\/admin\/users\/([^\/\?]+)\/status/);
                if (idStatusMatch && options.method === "PATCH") {
                    const { error } = await window.ccSupabase.from('profiles').update({ is_active: !!options.body.isActive }).eq('id', idStatusMatch[1]);
                    if (error) throw error;
                    return { success: true };
                }
                const idRoleMatch = path.match(/\/admin\/users\/([^\/\?]+)\/role/);
                if (idRoleMatch && options.method === "PATCH") {
                    const { error } = await window.ccSupabase.from('profiles').update({ role: options.body.role }).eq('id', idRoleMatch[1]);
                    if (error) throw error;
                    return { success: true };
                }
                const idProfileTypeMatch = path.match(/\/admin\/users\/([^\/\?]+)\/profile-type/);
                if (idProfileTypeMatch && options.method === "PATCH") {
                    const { error } = await window.ccSupabase.from('profiles').update({ profile_type: options.body.profileType }).eq('id', idProfileTypeMatch[1]);
                    if (error) throw error;
                    return { success: true };
                }
                const idSessionsMatch = path.match(/\/admin\/users\/([^\/\?]+)\/sessions/);
                if (idSessionsMatch && options.method === "DELETE") return { success: true };

                const idDeleteMatch = path.match(/\/admin\/users\/([^\/\?]+)$/);
                if (idDeleteMatch && options.method === "DELETE") {
                    const { error } = await window.ccSupabase.from('profiles').delete().eq('id', idDeleteMatch[1]);
                    if (error) throw error;
                    return { success: true };
                }

                // LIST LOGIC WITH SEARCH SUPPORT
                const params = new URLSearchParams(path.split('?')[1] || "");
                const q = params.get("q");

                let query = window.ccSupabase.from('profiles').select('*');

                if (q) {
                    // Recherche flexible sur Nom (contient) ou Email (contient)
                    // Note: 'id' est un UUID, on ne peut pas utiliser 'ilike' dessus directement sans cast
                    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
                }

                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) throw error;

                const items = (data || []).map(u => ({
                    ...u,
                    fullName: u.full_name,
                    isActive: u.is_active,
                    isVerified: u.is_verified,
                    phoneNumber: u.phone_number,
                    email: u.email || "Utilisateur Supabase",
                    profileType: u.profile_type,
                    profileCompletionPercent: 50,
                    profileCompletionMissing: ""
                }));
                return { items };
            }
            if (p.includes("/admin/analytics/daily")) return { points: [] };
            const aiLogDismissMatch = path.match(/\/api\/admin\/ai-moderation\/logs\/([^\/\?]+)/);
            if (aiLogDismissMatch && options.method === "PATCH") {
                const { error } = await window.ccSupabase
                    .from("ai_moderation_logs")
                    .update({ is_dismissed: !!options.body?.is_dismissed })
                    .eq("id", aiLogDismissMatch[1]);
                if (error) throw error;
                return { success: true };
            }
            if (p.includes("/admin/ai-moderation/logs")) {
                try {
                    const { data, error } = await window.ccSupabase
                        .from("ai_moderation_logs")
                        .select("*")
                        .order("created_at", { ascending: false })
                        .limit(160);
                    if (error) throw error;
                    return data || [];
                } catch (error) {
                    console.warn("Admin moderation logs unavailable:", error.message || error);
                    return [];
                }
            }
            if (p.includes("/admin/reservations") || p.includes("/admin/flags") || p.includes("/admin/security/blocks") || p.includes("/admin/audit-log")) return [];
            if (p.includes("/admin/financials/stats")) return { monthly: [], recent: [] };
            if (p.includes("/settings/platform-qr")) return { qrCode: "" };

            // 6. GENERAL ADMIN & NOTIFS
            if (p.includes("/admin/inbox") || p.includes("/notification-counts")) {
                return { chatUnread: 0, adminUnread: 0, items: [] };
            }

            // [BRIDGE SAFETY] Catch-all for other admin routes to avoid 404 on GitHub Pages
            if (p.includes("/admin/")) {
                console.warn("Route admin non gérée par le bridge:", path);
                if (p.includes("/stats") || p.includes("/overview")) return {};
                return [];
            }

            // 7. PAYMENTS
            if (p.includes("/payments") || p.includes("/initiate-payment") || p.includes("/payment-webhook")) {
                const urlObj = new URL(path, window.location.origin);
                let funcName = '';
                if (p.includes("/initiate-payment")) funcName = 'initiate-payment' + urlObj.search;
                else if (p.includes("/payment-webhook")) funcName = 'payment-webhook';
                else funcName = 'initiate-payment';

                const { data, error } = await window.ccSupabase.functions.invoke(funcName, {
                    method: options.method || "POST",
                    body: options.body,
                    headers: options.headers || {}
                });
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
                let msg = data?.error || data?.message || `HTTP ${response.status}`;
                if (typeof msg === 'string' && msg.includes('<!DOCTYPE html>')) {
                    msg = `Erreur Serveur (404/500). Le backend est peut-àªtre hors ligne.`;
                }
                const error = new Error(msg);
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
        if (!user) return { percent: 0, missingFields: ["email"] };

        // Debug pour voir ce que le script voit réellement
        console.log("ðŸ” Vérification profil pour:", user.email, "Pays actuel:", user.country);

        const fields = ["email", "fullName", "phoneNumber", "identityDocument", "profilePhoto", "country"];
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

        const hasPhone = String(user?.phoneNumber || user?.phone || "").trim().length >= 8;
        const hasIdentityDocument = Boolean(user?.hasIdentityDocument || user?.identity_document);
        const hasProfilePhoto = Boolean(user?.hasProfilePhoto || user?.profile_photo);
        // [FIX] On vérifie aussi le champ metadata au cas oà¹
        const userCountry = user?.country || user?.user_metadata?.country || user?.location;
        const hasCountry = Boolean(userCountry);
        const hasPaymentQrCode = Boolean(user?.hasPaymentQrCode || user?.alipay_qr || user?.wechat_qr);

        console.log("ðŸ“ Pays détecté:", userCountry, "-> hasCountry:", hasCountry);
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
        if (!user) return false;
        const v = user.isVerified !== undefined ? user.isVerified : user.is_verified;
        return Boolean(v === 1 || v === true || v === 'true');
    }

    async function restoreSession() {
        // [OAuth Fix] Si Supabase a un jeton dans l'URL, il va l'extraire ici
        if (window.ccSupabase) {
            const { data: { session } } = await window.ccSupabase.auth.getSession();
            if (session) {
                setSession(session.access_token, { ...session.user, ...session.user.user_metadata });
                // Nettoyer l'URL du hash access_token pour éviter les affichages bizarres
                if (window.location.hash.includes("access_token")) {
                    window.history.replaceState(null, null, window.location.pathname + window.location.search);
                }
            }
        }

        if (!state.token) {
            state.user = null;
            return null;
        }

        try {
            const payload = await api("/api/auth/me");
            let userData = payload?.user || null;

            // [FIX CRITIQUE] Mise à jour du profil silencieuse (pas de blocage, pas de requête supplémentaire)
            if (state.user && state.user.id && window.ccSupabase) {
                // Ne pas re-fetch le profil ici, déjà fait dans /api/auth/me
            }

            setSession(state.token, userData);
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
            ui.profileMessage.textContent = "Votre dossier est en attente d'analyse (5-10 min). Vérifiez vos messages pour la validation. Vous pouvez aussi mettre à  jour vos pià¨ces.";
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

    function isGoogleUser(user) {
        if (!user) return false;
        // Check various places where Supabase stores the provider info
        return user?.app_metadata?.provider === 'google' ||
               user?.user_metadata?.provider === 'google' ||
               (user?.identities && Array.isArray(user.identities) && user.identities[0]?.provider === 'google');
    }

    /**
     * Returns false if user already has country info (no popup needed),
     * or an object describing what fields to ask for: { needsName: true/false }
     */
    function needsCountryInfo(user) {
        if (!user) return false;
        const hasCountry = Boolean(user?.country || user?.user_metadata?.country);
        if (hasCountry) return false;
        const isGoogle = isGoogleUser(user);
        const hasName = Boolean(user?.fullName || user?.full_name || user?.user_metadata?.full_name);
        return { needsName: !isGoogle && !hasName };
    }

    function openCountryInfoPopup(needs) {
        const modal = document.getElementById("cc-country-modal");
        if (!modal) return;

        const nameFields = document.getElementById("cc-country-name-fields");
        if (nameFields) {
            nameFields.classList.toggle("hidden", !needs?.needsName);
            // Remove required attribute when hidden
            const fn = document.getElementById("cc-country-firstname");
            const ln = document.getElementById("cc-country-lastname");
            if (fn) fn.required = !!needs?.needsName;
            if (ln) ln.required = !!needs?.needsName;
        }

        const feedback = document.getElementById("cc-country-feedback");
        if (feedback) feedback.textContent = "";

        modal.classList.remove("hidden");
    }

    function closeCountryInfoPopup() {
        const modal = document.getElementById("cc-country-modal");
        if (modal) modal.classList.add("hidden");
    }

    async function submitCountryInfo() {
        const firstName = String(document.getElementById("cc-country-firstname")?.value || "").trim();
        const lastName = String(document.getElementById("cc-country-lastname")?.value || "").trim();
        const country = String(document.getElementById("cc-country-input")?.value || "").trim();

        if (!country) {
            throw new Error("Veuillez sélectionner votre pays de résidence.");
        }

        // Validate country is in the official list
        const normalize = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const valid = (COUNTRY_OPTIONS || []).map(c => normalize(c));
        if (!valid.includes(normalize(country))) {
            throw new Error("Veuillez choisir un pays valide dans la liste.");
        }

        const body = { country };

        // If name fields were shown (non-Google users), combine and save
        const nameFields = document.getElementById("cc-country-name-fields");
        if (nameFields && !nameFields.classList.contains("hidden")) {
            if (!firstName || !lastName) {
                throw new Error("Veuillez saisir votre prénom et votre nom.");
            }
            body.fullName = `${firstName} ${lastName}`;
        }

        // Save to Supabase profiles table directly
        if (window.ccSupabase) {
            const userId = state.user?.id;
            if (!userId) throw new Error("Utilisateur non connecté.");

            const updateData = { country };
            if (body.fullName) updateData.full_name = body.fullName;

            const { error } = await window.ccSupabase
                .from("profiles")
                .update(updateData)
                .eq("id", userId);
            if (error) throw error;

            // Also update the local user state
            if (state.user) {
                state.user.country = country;
                if (body.fullName) {
                    state.user.fullName = body.fullName;
                    state.user.full_name = body.fullName;
                }
            }
        } else {
            // Fallback: use the API
            await api("/api/users/me/profile", {
                method: "PATCH",
                body
            });
        }
    }

    function onModalAuthSuccess(payload) {
        setSession(payload.token, payload.user);
        updateHeaderUi();
        closeAuthModal(false);

        // Check if we need to ask for country info first
        const needsCountry = needsCountryInfo(payload.user);
        if (needsCountry) {
            openCountryInfoPopup(needsCountry);
            return;
        }

        const target = state.pendingNavigation || nextPath("dashboard.html");
        state.pendingNavigation = "";

        if (!isUserVerified(payload.user)) {
            if (requiresCompletedProfileTarget(target)) {
                openProfileCompletionGate(target);
                return;
            }
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
<div id="cc-auth-modal" class="modal hidden" role="dialog" aria-modal="true">
    <div class="modal-card" id="cc-auth-modal-card">
        <button id="cc-auth-close" class="close-modal" aria-label="Fermer">x</button>

        <!-- STEP 1: AUTH HUB (PHONE FIRST) -->
        <section id="cc-auth-hub-panel" class="modal-panel">
            <div class="auth-hub-header">
                <h2 id="cc-auth-title" class="auth-hub-title">Bienvenue à  nouveau</h2>
            </div>

            <!-- PRIMARY ENTRY (PHONE BY DEFAULT) -->
            <div id="cc-auth-primary-entry">
                <div class="phone-input-group">
                    <select id="cc-auth-country-code" class="cc-country-select auth-input">
                        ${COUNTRY_OPTIONS.map(c => `<option value="${COUNTRY_CALLING_CODES[c] || '+33'}">${c} (${COUNTRY_CALLING_CODES[c] || '+33'})</option>`).join("")}
                    </select>
                    
                    <div class="cc-phone-input-container">
                        <label style="position: absolute; top: -10px; left: 20px; background: #1a1b1e; padding: 0 8px; font-size: 0.8rem; color: #4c82ff; font-weight: 600;">Numéro de téléphone</label>
                        <span class="prefix" id="cc-phone-prefix-display">+33</span>
                        <input type="tel" id="cc-auth-phone-input" class="cc-phone-raw-input" placeholder="0 00 00 00 00">
                    </div>
                </div>
            </div>

            <!-- ALTERNATIVE ENTRY (HIDDEN INITIALLY) -->
            <div id="cc-auth-email-entry" class="hidden">
                <div class="auth-email-group" style="margin-top: 10px;">
                    <label style="font-size: 0.8rem; color: #4c82ff; font-weight: 600; margin-left: 5px;">Adresse e-mail</label>
                    <input type="email" id="cc-auth-email-input" class="auth-input" placeholder="exemple@mail.com">
                </div>
            </div>

            <button id="cc-auth-continue-main" class="btn primary" style="width:100%; padding: 16px; border-radius: 30px; background: black; color: white; margin-top: 2rem; font-size: 1.1rem; font-weight: 700;">Continuer</button>

            <div class="auth-footer-links" style="margin-top: 1.5rem;">
                <p id="cc-auth-switch-text" style="color: #333; font-weight: 500;">Vous nâ€™avez pas encore de compte ?</p>
                <a href="#" id="cc-auth-switch-btn" style="color: #4c82ff; font-weight: 600; font-size: 1rem;">Inscrivez-vous</a>
            </div>

            <div class="auth-divider">OU</div>

            <div class="social-buttons-grid">
                <button class="social-btn" data-provider="google" style="background: white; border: 1px solid #e0e0e0; padding: 14px; border-radius: 30px;">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style="width: 20px;">
                    Continuer avec Google
                </button>
                
                <button id="cc-auth-toggle-email" class="social-btn btn-email" style="padding: 14px; border-radius: 30px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    Continuer avec un e-mail
                </button>
            </div>
            
            <p id="cc-auth-hub-feedback" class="auth-feedback"></p>
        </section>

        <datalist id="cc-country-datalist">
            ${COUNTRY_OPTIONS.map(c => `<option value="${c}">`).join("")}
        </datalist>

        <!-- STEP 2: PASSWORD/PROFILE -->
        <section id="cc-auth-details-panel" class="modal-panel hidden">
            <button id="cc-auth-details-back" class="btn ghost sm" style="margin-bottom: 1rem;"><- Retour</button>
            <h3 id="cc-auth-details-title">Connectez-vous</h3>
            
            <form id="cc-auth-details-form" class="auth-form">
                <div id="cc-register-only-fields" class="hidden">
                    <div id="cc-role-selection" style="margin-bottom: 1rem;">
                        <p style="font-size: 0.85rem; margin-bottom: 8px;">Je m'inscris en tant que :</p>
                        <div class="auth-tab-row">
                            <button type="button" class="tab is-active" data-role="user">Utilisateur</button>
                            <button type="button" class="tab" data-role="partner">Partenaire</button>
                        </div>
                        <input type="hidden" name="userRole" id="cc-details-role" value="user">
                    </div>
                    <label>Nom complet<input type="text" name="fullName" class="auth-input" placeholder="Jean Dupont"></label>
                </div>

                <label>Mot de passe<input type="password" name="password" class="auth-input" minlength="8" required placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"></label>
                
                <div id="cc-register-only-fields-2" class="hidden">
                    <label>Pays de résidence<input type="text" name="country" list="cc-country-datalist" class="auth-input" placeholder="Ex: France"></label>
                </div>

                <button type="submit" id="cc-auth-submit-details" class="btn primary" style="width:100%; margin-top: 1rem; padding: 14px;">Confirmer</button>
            </form>
            
            <p id="cc-auth-details-feedback" class="auth-feedback"></p>
        </section>

        <!-- STEP OTP -->
        <section id="cc-auth-phone-panel" class="modal-panel hidden">
            <button id="cc-auth-phone-back" class="btn ghost sm" style="margin-bottom: 1rem;"><- Retour</button>
            <h3>Code de vérification</h3>
            <p>Saisissez le code envoyé par SMS.</p>
            <form id="cc-auth-phone-form" class="auth-form" style="margin-top: 1.5rem;">
                <input type="text" id="cc-auth-otp-input" class="auth-input" placeholder="123 456" required>
                <button type="submit" class="btn primary" style="width: 100%; padding: 14px;">Vérifier le code</button>
            </form>
            <p id="cc-auth-phone-feedback" class="auth-feedback"></p>
        </section>
    </div>
</div>

<div id="cc-profile-modal" class="modal hidden" role="dialog" aria-modal="true">
    <div class="modal-card">
        <button id="cc-profile-close" class="close-modal" aria-label="Fermer">x</button>
        <section class="modal-panel">
            <h3>Profil incomplet</h3>
            <p id="cc-profile-message">Vous devez completer votre profil pour continuer.</p>
            <div class="gate-actions">
                <button id="cc-profile-complete" class="btn primary">Completer maintenant</button>
                <button id="cc-profile-later" class="btn ghost">Plus tard</button>
            </div>
        </section>
    </div>
</div>

<!-- COUNTRY INFO MODAL - Appears after registration or login if country is missing -->
<div id="cc-country-modal" class="modal hidden" role="dialog" aria-modal="true">
    <div class="modal-card" style="max-width: 480px;">
        <section class="modal-panel">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #4c82ff, #10b981); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </div>
                <h3 style="margin: 0 0 0.5rem; font-size: 1.3rem;">Informations requises</h3>
                <p style="color: var(--muted); font-size: 0.9rem; margin: 0;">Pour finaliser votre inscription, veuillez compléter ces informations.</p>
            </div>
            <form id="cc-country-form" class="auth-form">
                <!-- Name fields (hidden for Google users) -->
                <div id="cc-country-name-fields">
                    <label>Prénom<input type="text" id="cc-country-firstname" class="auth-input" placeholder="Jean" required></label>
                    <label>Nom<input type="text" id="cc-country-lastname" class="auth-input" placeholder="Dupont" required></label>
                </div>
                <label>Pays de résidence
                    <input type="text" id="cc-country-input" class="auth-input" list="cc-country-list-modal" placeholder="Ex: France" required>
                </label>
                <datalist id="cc-country-list-modal">
                    ${COUNTRY_OPTIONS.map(c => `<option value="${c}">`).join("")}
                </datalist>
                <button type="submit" id="cc-country-submit-btn" class="btn primary" style="width:100%; margin-top: 1.5rem; padding: 14px; font-size: 1.05rem;">
                    Enregistrer
                </button>
            </form>
            <p id="cc-country-feedback" class="auth-feedback" style="margin-top: 0.8rem;"></p>
        </section>
    </div>
</div>`;

        while (holder.firstElementChild) document.body.appendChild(holder.firstElementChild);

        ui.modal = document.getElementById("cc-auth-modal");
        ui.hubPanel = document.getElementById("cc-auth-hub-panel");
        ui.detailsPanel = document.getElementById("cc-auth-details-panel");
        ui.phonePanel = document.getElementById("cc-auth-phone-panel");
        ui.emailInput = document.getElementById("cc-auth-email-input");
        ui.phoneInput = document.getElementById("cc-auth-phone-input");
        ui.detailsForm = document.getElementById("cc-auth-details-form");
        ui.feedbackHub = document.getElementById("cc-auth-hub-feedback");
        ui.feedbackDetails = document.getElementById("cc-auth-details-feedback");
        ui.profileModal = document.getElementById("cc-profile-modal");

        let currentMode = "login";
        let currentMethod = "phone"; // "phone" or "email"

        const updateHubMode = (mode) => {
            currentMode = mode;
            const title = document.getElementById("cc-auth-title");
            const switchText = document.getElementById("cc-auth-switch-text");
            const switchBtn = document.getElementById("cc-auth-switch-btn");
            const detailsTitle = document.getElementById("cc-auth-details-title");

            if (mode === "login") {
                title.textContent = "Bienvenue à  nouveau";
                switchText.textContent = "Vous nâ€™avez pas encore de compte ?";
                switchBtn.textContent = "Inscrivez-vous";
                detailsTitle.textContent = "Connectez-vous";
                document.querySelectorAll("#cc-register-only-fields, #cc-register-only-fields-2").forEach(el => el.classList.add("hidden"));
            } else {
                title.textContent = "Créer un compte";
                switchText.textContent = "Vous avez déjà  un compte ?";
                switchBtn.textContent = "Connexion";
                detailsTitle.textContent = "Finalisez votre inscription";
                document.querySelectorAll("#cc-register-only-fields, #cc-register-only-fields-2").forEach(el => el.classList.remove("hidden"));
            }
        };

        const switchMethod = (method) => {
            currentMethod = method;
            const phoneEntry = document.getElementById("cc-auth-primary-entry");
            const emailEntry = document.getElementById("cc-auth-email-entry");
            const toggleBtn = document.getElementById("cc-auth-toggle-email");

            if (method === "email") {
                phoneEntry.classList.add("hidden");
                emailEntry.classList.remove("hidden");
                toggleBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 18.92z"></path></svg>
                    Continuer avec un téléphone
                `;
            } else {
                phoneEntry.classList.remove("hidden");
                emailEntry.classList.add("hidden");
                toggleBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    Continuer avec un e-mail
                `;
            }
        };

        document.getElementById("cc-auth-close")?.addEventListener("click", () => closeAuthModal(true));
        document.getElementById("cc-auth-switch-btn")?.addEventListener("click", (e) => {
            e.preventDefault();
            updateHubMode(currentMode === "login" ? "register" : "login");
        });

        document.getElementById("cc-auth-toggle-email")?.addEventListener("click", (e) => {
            e.preventDefault();
            switchMethod(currentMethod === "phone" ? "email" : "phone");
        });

        document.getElementById("cc-auth-country-code")?.addEventListener("change", (e) => {
            document.getElementById("cc-phone-prefix-display").textContent = e.target.value;
        });

        document.getElementById("cc-auth-continue-main")?.addEventListener("click", async () => {
            if (currentMethod === "phone") {
                const prefix = document.getElementById("cc-auth-country-code").value;
                const number = ui.phoneInput.value.replace(/\s+/g, "");
                if (number.length < 6) {
                    ui.feedbackHub.textContent = "Numéro invalide.";
                    return;
                }
                try {
                    ui.feedbackHub.textContent = "Envoi du code...";
                    const { error } = await window.ccSupabase.auth.signInWithOtp({ phone: prefix + number });
                    if (error) throw error;
                    ui.hubPanel.classList.add("hidden");
                    ui.phonePanel.classList.remove("hidden");
                } catch (err) {
                    ui.feedbackHub.textContent = err.message;
                }
            } else {
                const email = ui.emailInput.value.trim();
                if (!email || !email.includes("@")) {
                    ui.feedbackHub.textContent = "Email invalide.";
                    return;
                }
                ui.hubPanel.classList.add("hidden");
                ui.detailsPanel.classList.remove("hidden");
            }
        });

        document.getElementById("cc-auth-details-back")?.addEventListener("click", () => {
            ui.detailsPanel.classList.add("hidden");
            ui.hubPanel.classList.remove("hidden");
        });

        document.getElementById("cc-auth-phone-back")?.addEventListener("click", () => {
            ui.phonePanel.classList.add("hidden");
            ui.hubPanel.classList.remove("hidden");
        });

        ui.detailsPanel.querySelectorAll(".tab").forEach(tab => {
            tab.addEventListener("click", () => {
                ui.detailsPanel.querySelectorAll(".tab").forEach(t => t.classList.remove("is-active"));
                tab.classList.add("is-active");
                document.getElementById("cc-details-role").value = tab.dataset.role;
            });
        });

        ui.hubPanel.querySelectorAll(".social-btn[data-provider]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const provider = btn.dataset.provider;
                try {
                    const pathPrefix = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
                    const redirectUrl = window.location.origin + pathPrefix + "results.html";
                    const { error } = await window.ccSupabase.auth.signInWithOAuth({
                        provider,
                        options: { redirectTo: redirectUrl }
                    });
                    if (error) throw error;
                } catch (err) {
                    ui.feedbackHub.textContent = err.message;
                }
            });
        });

        ui.detailsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = ui.emailInput.value.trim();
            const data = new FormData(ui.detailsForm);
            const password = data.get("password");
            try {
                ui.feedbackDetails.textContent = "Traitement...";
                let result;
                if (currentMode === "login") {
                    result = await api("/api/auth/login", {
                        method: "POST",
                        auth: false,
                        body: { email, password }
                    });
                } else {
                    result = await api("/api/auth/register", {
                        method: "POST",
                        auth: false,
                        body: {
                            email,
                            password,
                            fullName: data.get("fullName"),
                            country: data.get("country"),
                            role: data.get("userRole")
                        }
                    });
                }
                onModalAuthSuccess(result);
            } catch (err) {
                ui.feedbackDetails.textContent = err.message;
            }
        });

        document.getElementById("cc-auth-phone-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const prefix = document.getElementById("cc-auth-country-code").value;
            const phone = prefix + ui.phoneInput.value.replace(/\s+/g, "");
            const token = document.getElementById("cc-auth-otp-input").value;
            try {
                const { error, data } = await window.ccSupabase.auth.verifyOtp({ phone, token, type: "sms" });
                if (error) throw error;
                onModalAuthSuccess({ user: data.user, session: data.session });
            } catch (err) {
                document.getElementById("cc-auth-phone-feedback").textContent = err.message;
            }
        });

        ui.profileModal.querySelector("#cc-profile-complete").addEventListener("click", () => {
            window.location.href = "dashboard.html";
        });
        ui.profileModal.querySelector("#cc-profile-later").addEventListener("click", () => closeProfileModal(true));

        // Country info form submit
        const countryForm = document.getElementById("cc-country-form");
        if (countryForm) {
            countryForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const feedback = document.getElementById("cc-country-feedback");
                const submitBtn = document.getElementById("cc-country-submit-btn");
                try {
                    if (feedback) {
                        feedback.textContent = "Enregistrement...";
                        feedback.style.color = "#aef6d2";
                    }
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = "Enregistrement...";
                    }
                    await submitCountryInfo();
                    closeCountryInfoPopup();
                    // After saving, redirect normally
                    // If pendingNavigation is set (from registration/login flow), use it
                    // Otherwise stay on current page
                    const target = state.pendingNavigation || currentTarget();
                    state.pendingNavigation = "";
                    window.location.href = target;
                } catch (err) {
                    if (feedback) {
                        feedback.textContent = err.message || "Erreur lors de l'enregistrement.";
                        feedback.style.color = "#ffc8b7";
                    }
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = "Enregistrer";
                    }
                }
            });
        }

        ui.initialized = true;
    }

    function updateHeaderUi() {
        const headerAuth = document.querySelector(".header-auth");
        if (!headerAuth) return;

        const authed = Boolean(state.user && state.token);
        const isAdmin = authed && String(state.user.role || "").toLowerCase() === "admin";
        const userName = authed ? (state.user.fullName || state.user.email || "Connecté") : "";

        const calmToggle = document.getElementById("calm-mode-toggle");

        headerAuth.innerHTML = calmToggle ? calmToggle.outerHTML : "";

        injectLanguageToggle();

        if (!authed) {
            const btn = document.createElement("a");
            btn.id = "auth-open-btn";
            btn.href = "auth.html";
            btn.className = "btn primary";
            btn.textContent = state.lang === "en" ? "Sign In" : "Login";
            headerAuth.appendChild(btn);

            btn.addEventListener("click", (e) => {
                e.preventDefault();
                state.pendingNavigation = currentTarget();
                openAuthGate(state.pendingNavigation);
            });
        } else {
            const menuHtml = `
                <div class="user-menu" id="cc-user-menu">
                    <button class="user-trigger" id="cc-user-trigger">
                        <span>${escapeHtml(userName)}</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </button>
                    <div class="user-dropdown">
                        ${isAdmin ? '<a href="admin.html">Admin Panel</a>' : ""}
                        <a href="dashboard.html">Dashboard</a>
                        <a href="post_trip.html">Publier un trajet</a>
                        <button class="logout-item" id="cc-logout-btn">${state.lang === "en" ? "Sign Out" : "Quitter"}</button>
                    </div>
                </div>
            `;
            const temp = document.createElement("div");
            temp.innerHTML = menuHtml;
            headerAuth.appendChild(temp.firstElementChild);

            const menu = document.getElementById("cc-user-menu");
            const trigger = document.getElementById("cc-user-trigger");
            if (trigger && menu) {
                trigger.addEventListener("click", (e) => {
                    e.stopPropagation();
                    menu.classList.toggle("is-active");
                });
            }

            const logoutBtn = document.getElementById("cc-logout-btn");
            if (logoutBtn) {
                logoutBtn.addEventListener("click", async () => {
                    await window.ccSupabase.auth.signOut();
                    localStorage.removeItem("cc_auth_token");
                    window.location.href = 'index.html';
                });
            }

            document.addEventListener("click", () => {
                menu?.classList.remove("is-active");
            }, { once: false });
        }

        const newCalmToggle = document.getElementById("calm-mode-toggle");
        if (newCalmToggle) {
            newCalmToggle.addEventListener("click", () => {
                document.body.classList.toggle("is-calm");
                const isCalm = document.body.classList.contains("is-calm");
                localStorage.setItem("calm-mode", isCalm);
            });
        }

        const file = currentFile();
        document.querySelectorAll(".main-nav .nav-link").forEach(link => {
            const href = link.getAttribute("href");
            if (!href) return;
            const isActive = href === file || (file === "index.html" && href === "index.html");
            link.classList.toggle("is-active", isActive);
        });

        applyTranslations();
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

    // â”€â”€ Notification Badges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            // Silently ignore â€“ don't disrupt the UI if the call fails
        }
    }

    function startNotifPolling() {
        // Désactivé : le polling retournait toujours {chatUnread:0, adminUnread:0}
        // Réactiver quand le système de notifications sera implémenté
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

    // Purge silencieuse des offres dont la date de départ est passée
    async function purgeExpiredOffers() {
        try {
            const { error } = await window.ccSupabase.rpc('purge_expired_offers');
            if (error) console.warn('[CC] Purge offres expirées:', error.message);
        } catch (e) {
            // Silencieux — ne jamais bloquer l'init
        }
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

        // Purge silencieuse des offres expirées (arrière-plan, sans bloquer)
        purgeExpiredOffers().catch(() => { });

        if (!state.user && requiresAuthTarget(currentTarget())) {
            openAuthGate(currentTarget());
        }

        if (state.user && requiresCompletedProfileTarget(currentTarget()) && !isUserVerified()) {
            openProfileCompletionGate(currentTarget());
        }

        // Check if user needs to provide country info (for existing users logging in)
        if (state.user && state.token) {
            const needs = needsCountryInfo(state.user);
            if (needs) {
                const currentFileLower = currentFile();
                // Don't show on auth.html or verification.html to avoid conflicts
                if (currentFileLower !== "auth.html" && currentFileLower !== "verification.html") {
                    openCountryInfoPopup(needs);
                }
            }
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

    /**
     * Transforme un champ pays en autocomplete mobile-friendly (2026).
     * - Liste JS personnalisée (pas de datalist natif)
     * - Une seule flèche ▼
     * - Filtrage temps réel
     * - Sélection par clic uniquement
     * - Navigation clavier (↑↓ + Entrée)
     */
    function setupCountryInput(input) {
        if (!input || input.dataset.ccCountrySetup === "true") return;
        if (input.closest(".cc-autocomplete-ctn")) return;
        input.dataset.ccCountrySetup = "true";

        const $input = input;
        const origPlaceholder = $input.getAttribute("placeholder") || "Ex: France";
        const origValue = $input.value || "";
        const parent = $input.parentNode;
        const sibling = $input.nextSibling;

        // 1. Container principal
        const ctn = document.createElement("div");
        ctn.className = "cc-autocomplete-ctn";

        // 2. Wrapper input + flèche
        const wrapper = document.createElement("div");
        wrapper.className = "cc-input-wrapper";

        // Déplacer l'input dans le wrapper
        wrapper.appendChild($input);

        // Nettoyer et paramétrer l'input
        $input.removeAttribute("list");
        $input.className = ($input.className || "") + " cc-autocomplete-input";
        $input.setAttribute("autocomplete", "off");
        $input.placeholder = origPlaceholder;

        // 3. Flèche personnalisée unique
        const arrow = document.createElement("span");
        arrow.className = "cc-custom-arrow";
        arrow.textContent = "▼";
        wrapper.appendChild(arrow);

        ctn.appendChild(wrapper);

        // 4. Liste de suggestions
        const list = document.createElement("ul");
        list.className = "cc-suggestions-list";
        ctn.appendChild(list);

        // Insérer le container dans le DOM
        if (sibling) {
            parent.insertBefore(ctn, sibling);
        } else {
            parent.appendChild(ctn);
        }

        // Restaurer la valeur existante
        if (origValue) $input.value = origValue;

        // --- LOGIQUE MOTEUR DE RECHERCHE ---

        function normaliser(t) {
            return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        }

        function filtrerPays(texte) {
            const t = normaliser(texte);
            if (!t) return [];
            return (COUNTRY_OPTIONS || []).filter(pays =>
                normaliser(pays).includes(t)
            );
        }

        function afficherSuggestions(pays) {
            list.innerHTML = "";
            if (!pays.length) {
                list.style.display = "none";
                return;
            }
            pays.forEach(p => {
                const li = document.createElement("li");
                li.textContent = p;
                li.addEventListener("click", function (e) {
                    e.stopPropagation();
                    $input.value = p;
                    list.style.display = "none";
                    $input.dispatchEvent(new Event("change", { bubbles: true }));
                });
                li.addEventListener("mouseenter", function () {
                    list.querySelectorAll("li").forEach(l => l.classList.remove("active"));
                    this.classList.add("active");
                });
                list.appendChild(li);
            });
            list.style.display = "block";
        }

        // Sur frappe → filtrer et afficher
        $input.addEventListener("input", function () {
            const texte = this.value;
            const pays = filtrerPays(texte);
            afficherSuggestions(pays);
            if (texte && !pays.length) {
                this.classList.add("cc-country-invalid");
            } else {
                this.classList.remove("cc-country-invalid");
            }
        });

        // Au focus → montrer la liste si déjà du texte
        $input.addEventListener("focus", function () {
            this.classList.remove("cc-country-invalid");
            if (this.value.trim()) {
                const pays = filtrerPays(this.value);
                afficherSuggestions(pays);
            }
        });

        // À la perte de focus → valider et nettoyer
        $input.addEventListener("blur", function () {
            setTimeout(() => {
                const val = this.value.trim();
                const isValid = val ? (COUNTRY_OPTIONS || []).some(c => normaliser(c) === normaliser(val)) : true;
                if (!isValid) {
                    this.value = "";
                    this.classList.add("cc-country-invalid");
                } else if (val) {
                    const match = (COUNTRY_OPTIONS || []).find(c => normaliser(c) === normaliser(val));
                    if (match) this.value = match;
                    this.classList.remove("cc-country-invalid");
                }
                list.style.display = "none";
            }, 200);
        });

        // Navigation clavier ↑↓ + Entrée
        $input.addEventListener("keydown", function (e) {
            const items = list.querySelectorAll("li");
            if (!items.length) return;
            const active = list.querySelector("li.active");
            let idx = active ? Array.from(items).indexOf(active) : -1;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                idx = Math.min(idx + 1, items.length - 1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                idx = Math.max(idx - 1, 0);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (active) {
                    $input.value = active.textContent;
                    list.style.display = "none";
                    $input.dispatchEvent(new Event("change", { bubbles: true }));
                }
                return;
            } else return;

            items.forEach(l => l.classList.remove("active"));
            items[idx].classList.add("active");
            items[idx].scrollIntoView({ block: "nearest" });
        });

        // Fermer la liste en cliquant ailleurs
        document.addEventListener("click", function (e) {
            if (!e.target.closest(".cc-autocomplete-ctn")) {
                list.style.display = "none";
            }
        }, { passive: true });
    }

    /**
     * Configure automatiquement tous les champs pays du site.
     */
    function setupAllCountryInputs() {
        const selecteurs = [
            "input[list*='country' i]",
            "input[list*='destination' i]",
            "input#register-country",
            "input#cc-country-input",
            "input#dash-demande-origin",
            "input#dash-demande-destination",
            "input#edit-parcel-origin",
            "input#edit-parcel-destination",
            "input#offer-origin",
            "input#offer-destination",
            "input#demande-origin",
            "input#demande-destination",
            "input#cc-inline-country",
            "input#est-origin",
            "input#est-destination"
        ];
        selecteurs.forEach(sel => {
            document.querySelectorAll(sel).forEach(input => setupCountryInput(input));
        });
        // Fallback : les inputs dont le name est "country"
        document.querySelectorAll('input[name="country"]').forEach(input => setupCountryInput(input));
    }

    // Auto-exécution
    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(setupAllCountryInputs, 150);
    });

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
        getUserCurrency,
        EXCHANGE_RATES,
        COUNTRY_CURRENCIES,
        COUNTRY_CALLING_CODES,
        COUNTRY_OPTIONS,
        // Country info popup helpers
        isGoogleUser,
        needsCountryInfo,
        openCountryInfoPopup,
        closeCountryInfoPopup,
        submitCountryInfo,
        // Country input validation (selection only from datalist)
        setupCountryInput,
        setupAllCountryInputs
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
