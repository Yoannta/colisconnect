import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_BASE = Deno.env.get("GENIUS_API_URL") || "https://api.geniuspay.ci";

// Indicatif -> pays / devise de la zone. L'indicatif est la seule donnee sure :
// il fixe country_code, donc le client n'a plus de pays a choisir chez GeniusPay.
const COUNTRY_BY_PREFIX: Record<string, { country: string; currency: string }> = {
    "225": { country: "CI", currency: "XOF" },
    "221": { country: "SN", currency: "XOF" },
    "229": { country: "BJ", currency: "XOF" },
    "226": { country: "BF", currency: "XOF" },
    "223": { country: "ML", currency: "XOF" },
    "228": { country: "TG", currency: "XOF" },
    "227": { country: "NE", currency: "XOF" },
    "245": { country: "GW", currency: "XOF" },
    "224": { country: "GN", currency: "GNF" },
    "233": { country: "GH", currency: "GHS" },
    "234": { country: "NG", currency: "NGN" },
    "237": { country: "CM", currency: "XAF" },
    "242": { country: "CG", currency: "XAF" },
    "241": { country: "GA", currency: "XAF" },
    "243": { country: "CD", currency: "CDF" },
    "254": { country: "KE", currency: "KES" },
    "255": { country: "TZ", currency: "TZS" },
    "256": { country: "UG", currency: "UGX" },
    "250": { country: "RW", currency: "RWF" },
    "260": { country: "ZM", currency: "ZMW" },
    "265": { country: "MW", currency: "MWK" },
    "258": { country: "MZ", currency: "MZN" },
    "232": { country: "SL", currency: "SLL" },
    // Europe / hors Afrique : paiement carte, montant converti dans la devise locale.
    "33": { country: "FR", currency: "EUR" },
    "32": { country: "BE", currency: "EUR" },
    "352": { country: "LU", currency: "EUR" },
    "39": { country: "IT", currency: "EUR" },
    "34": { country: "ES", currency: "EUR" },
    "351": { country: "PT", currency: "EUR" },
    "41": { country: "CH", currency: "CHF" },
    "44": { country: "GB", currency: "GBP" },
};

// Slugs de rails acceptes cote client (voir geniuspay_get_rails).
const ALLOWED_RAILS = [
    "wave", "orange_money", "mtn_money", "moov_money", "free_money", "mobicash",
    "airtel_money", "togocel", "mpesa", "zamtel_kwacha",
];

// Rails reellement proposes par pays : releve sur la page de paiement
// GeniusPay le 2026-11-16 (verite terrain, pas la doc).
const RAILS_BY_COUNTRY: Record<string, string[]> = {
    CI: ["orange_money", "mtn_money", "moov_money", "wave"],
    SN: ["orange_money", "free_money", "wave"],
    BJ: ["mtn_money", "moov_money"],
    BF: ["orange_money", "wave", "moov_money", "mobicash"],
    ML: ["orange_money", "mobicash"],
    TG: ["moov_money", "togocel"],
    NE: ["airtel_money"],
    GW: ["orange_money"],
    GN: ["orange_money"],
    CM: ["orange_money", "mtn_money"],
    CG: ["airtel_money", "mtn_money"],
    GA: ["airtel_money"],
    CD: ["airtel_money", "orange_money", "mpesa"],
    KE: ["mpesa"],
    UG: ["airtel_money", "mtn_money"],
    RW: ["airtel_money", "mtn_money"],
    ZM: ["mtn_money", "zamtel_kwacha"],
    SL: ["orange_money"]
};

const XOF_ZONE = ["CI", "SN", "BJ", "BF", "ML", "TG", "NE", "GW"];

// Paiement v1 : base officielle (doc https://geniuspay.ci/docs/api).
// L'ancienne base pay.genius.ci sert la meme API v1 mais GeniusPay l'a declaree depreciee.
const V1_API_BASE = Deno.env.get("GENIUS_V1_API_URL") || "https://geniuspay.ci/api/v1/merchant";
const V1_MIN_AMOUNT = 200; // minimum XOF / XAF / GNF

// Commission plateforme : montant FIXE, exprime en FCFA (XOF). Chaque client paie
// l'equivalent dans sa devise via le taux du jour (table exchange_rates).
const COMMISSION_AMOUNT = 200; // PHASE DE TEST : 200 F (minimum GeniusPay). Valeur reelle : 2000.
const COMMISSION_BASE_CURRENCY = "XOF";
// payment_method acceptes par la v1 (doc officielle).
const V1_METHODS = [
    "wave", "orange_money", "mtn_money", "moov_money", "airtel_money", "pawapay", "card",
];
// Codes operateur PawaPay (mmo_provider) : doc officielle, section Fournisseurs MMO.
const MMO_PROVIDER: Record<string, Record<string, string>> = {
    CI: { orange_money: "ORANGE_CIV", mtn_money: "MTN_MOMO_CIV", moov_money: "MOOV_CIV", wave: "WAVE_CIV" },
    SN: { orange_money: "ORANGE_SEN", free_money: "FREE_SEN" },
    BJ: { mtn_money: "MTN_MOMO_BEN", moov_money: "MOOV_BEN" },
    CM: { orange_money: "ORANGE_CMR", mtn_money: "MTN_MOMO_CMR" },
    CG: { airtel_money: "AIRTEL_COG", mtn_money: "MTN_MOMO_COG" },
    CD: { airtel_money: "AIRTEL_COD", orange_money: "ORANGE_COD", mpesa: "VODACOM_MPESA_COD" },
    GA: { airtel_money: "AIRTEL_GAB" },
    KE: { mpesa: "MPESA_KEN" },
    RW: { airtel_money: "AIRTEL_RWA", mtn_money: "MTN_MOMO_RWA" },
    UG: { airtel_money: "AIRTEL_UGA", mtn_money: "MTN_MOMO_UGA" },
    ZM: { mtn_money: "MTN_MOMO_ZMB", zamtel_kwacha: "ZAMTEL_ZMB" },
    SL: { orange_money: "ORANGE_SLE" },
};

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
}

function cleanPhone(raw: string): string {
    return String(raw || "").replace(/[^\d+]/g, "");
}

function countryFromPhone(phone: string) {
    const digits = phone.replace(/\D/g, "");
    for (const prefix of Object.keys(COUNTRY_BY_PREFIX).sort((a, b) => b.length - a.length)) {
        if (digits.startsWith(prefix)) return COUNTRY_BY_PREFIX[prefix];
    }
    return null;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
    if (req.method !== "POST") return json({ error: "Methode non autorisee." }, 405);

    const publicKey = Deno.env.get("GENIUS_PUBLIC_KEY");
    const secretKey = Deno.env.get("GENIUS_PRIVATE_KEY");
    if (!publicKey || !secretKey) return json({ error: "GeniusPay non configure." }, 500);

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    try {
        const authHeader = req.headers.get("Authorization") || "";
        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace("Bearer ", ""),
        );
        if (authError || !user) return json({ error: "Non authentifie." }, 401);

        const body = await req.json().catch(() => ({} as any));
        const reservationId = body?.reservationId;
        const rail = String(body?.rail || "").toLowerCase();
        const phone = cleanPhone(body?.phone);
        const wantsCard = rail === "card";

        if (!reservationId) return json({ error: "reservationId manquant." }, 400);

        const { data: reservation, error: resErr } = await supabase
            .from("reservations")
            .select("id, user_id, offer_id, status, kg, total_amount, offers(price_per_kg, base_currency, origin, destination)")
            .eq("id", reservationId)
            .maybeSingle();
        if (resErr) throw resErr;
        if (!reservation) return json({ error: "Reservation introuvable.", success: false });

        const resume = Array.isArray((reservation as any).offers)
            ? (reservation as any).offers[0]
            : (reservation as any).offers;

        if (String((reservation as any).user_id) !== String(user.id)) {
            return json({ error: "Seul le client de cette reservation peut payer.", success: false });
        }

        const paidStatuses = ["paid", "voyageur_paye", "colisconnect_paye", "livre", "delivered"];
        if (paidStatuses.includes(String((reservation as any).status || ""))) {
            return json({ error: "Cette reservation est deja payee.", alreadyPaid: true, success: false });
        }

        // Commission plateforme : montant FIXE de 2 000 FCFA, independant des kilos.
        // Le client paie l'equivalent dans sa devise, converti avec le taux du jour
        // (table exchange_rates : la meme source que le convertisseur des offres).
        const geo = countryFromPhone(phone);
        const countryCode = geo?.country || "CI";
        const targetCurrency = wantsCard
            // Carte : on facture directement en XOF. GeniusPay l'accepte et evite la
            // double conversion (nos 3,05 EUR ne valaient que 1 862 F chez eux).
            ? COMMISSION_BASE_CURRENCY
            : (XOF_ZONE.includes(countryCode) ? "XOF" : (geo?.currency || "EUR"));

        const { data: rates } = await supabase
            .from("exchange_rates")
            .select("currency_code, rate_to_eur")
            .in("currency_code", [COMMISSION_BASE_CURRENCY, targetCurrency]);
        const rateOf = (code: string) => {
            if (code === "EUR") return 1;
            const row = (rates || []).find((r: any) => String(r.currency_code).toUpperCase() === code);
            const v = Number(row?.rate_to_eur || 0);
            return v > 0 ? v : 0;
        };
        const fromRate = rateOf(COMMISSION_BASE_CURRENCY);
        const toRate = rateOf(targetCurrency);
        if (!fromRate || !toRate) {
            return json({ error: "Taux de change indisponible. Reessayez plus tard.", success: false });
        }
        // 2000 XOF -> EUR -> devise cible
        const amount = (COMMISSION_AMOUNT / fromRate) * toRate;

        let minorUnits: number;
        let currencyOut: string;
        if (targetCurrency === "EUR") {
            currencyOut = "EUR";
            minorUnits = Math.round(amount * 100); // centimes
        } else {
            currencyOut = targetCurrency; // XOF/XAF/GNF... : pas de decimales
            minorUnits = Math.round(amount);
        }

        // rail vide = pas d'operateur choisi : PawaPay deduit l'operateur du numero.
        if (!wantsCard && rail && !ALLOWED_RAILS.includes(rail)) {
            return json({ error: "Moyen de paiement non pris en charge.", success: false });
        }
        if (!wantsCard && !/^\+\d{8,15}$/.test(phone)) {
            return json({ error: "Numero de telephone invalide.", success: false });
        }
        if (!wantsCard && rail) {
            const railsForCountry = RAILS_BY_COUNTRY[countryCode] || [];
            if (!railsForCountry.includes(rail)) {
                return json({
                    error: `${rail} n'est pas disponible en ${countryCode}.`,
                    success: false,
                    available_rails: railsForCountry,
                });
            }
        }

        const payload: Record<string, unknown> = {
            reference: String(reservationId),
            amount: minorUnits,
            currency: currencyOut,
            country_code: countryCode,
            idempotency_key: `cc-${reservationId}-${minorUnits}-${currencyOut}`,
            customer_email: user.email || undefined,
            customer_phone: phone || undefined,
            success_url: `https://yoannta.github.io/colisconnect/chat.html?payment=success&id=${reservationId}`,
            cancel_url: `https://yoannta.github.io/colisconnect/chat.html?payment=error&id=${reservationId}`,
            metadata: { reservationId: String(reservationId), commission: amount, currency: currencyOut },
        };
        // Carte : pas de payment_method -> page hebergee (3DS).
        if (!wantsCard && rail) payload.payment_method = rail;

        const geniusRes = await fetch(`${API_BASE}/v2/payments/initiate`, {
            method: "POST",
            headers: {
                "X-API-Key": publicKey,
                "X-API-Secret": secretKey,
                "Authorization": `Bearer ${secretKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        let result = await geniusRes.json().catch(() => ({}));

        if (!geniusRes.ok) {
            const msg = String(result?.error?.message || result?.error || result?.message || "");
            const keyProblem = geniusRes.status === 401 || geniusRes.status === 403 || /api key/i.test(msg);
            if (keyProblem) {
                // Les cles en place ne sont pas des cles v2 : on encaisse en v1, sur la base
                // officielle geniuspay.ci. Mode direct pour que le client ne ressaisisse
                // ni pays, ni operateur, ni numero : on envoie son rail et son telephone.
                console.warn("[Payment] v2 refuse (cle), encaissement v1:", geniusRes.status, msg);

                const v1Amount = currencyOut === "EUR" ? Math.round(minorUnits) / 100 : minorUnits;
                if (!wantsCard && currencyOut !== "EUR" && v1Amount < V1_MIN_AMOUNT) {
                    return json({
                        error: `Le minimum GeniusPay est de ${V1_MIN_AMOUNT} ${currencyOut}. ` +
                            `Ajoutez des kilos pour atteindre ce montant.`,
                        success: false,
                    });
                }

                const v1BasePayload: Record<string, unknown> = {
                    amount: v1Amount,
                    currency: currencyOut,
                    description: `ColisConnect - Reservation #${reservationId}`,
                    customer: {
                        name: (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Client",
                        email: user.email,
                        country: countryCode,
                        ...(phone ? { phone } : {}),
                    },
                    success_url: `https://yoannta.github.io/colisconnect/chat.html?payment=success&id=${reservationId}`,
                    error_url: `https://yoannta.github.io/colisconnect/chat.html?payment=error&id=${reservationId}`,
                    metadata: { reservationId: String(reservationId) },
                };

                // Trois essais, du plus precis au plus sur : code PawaPay du pays,
                // nom du rail, puis page hebergee (le client y choisit lui-meme).
                const mmoCode = wantsCard || !rail ? "" : ((MMO_PROVIDER[countryCode] || {})[rail] || "");
                const variants: Array<Record<string, unknown> | null> = [];
                if (wantsCard) {
                    variants.push({ payment_method: "card" });
                    variants.push(null);
                } else {
                    if (rail) {
                        // Le rail natif d'abord : il evite un detour par un agregateur
                        // (pawaPay est desactive sur le compte, inutile de le solliciter avant).
                        if (V1_METHODS.includes(rail)) variants.push({ payment_method: rail });
                        if (mmoCode) variants.push({ payment_method: "pawapay", mmo_provider: mmoCode });
                    } else {
                        // Aucun operateur choisi : PawaPay detecte pays + operateur depuis
                        // le numero (mode direct, le client n'a rien d'autre a saisir).
                        variants.push({ payment_method: "pawapay" });
                    }
                    variants.push(null);
                }

                let v1Data: any = {};
                let v1Url = "";
                let v1Mode = "checkout";
                let v1Error = "Paiement refuse par GeniusPay.";
                for (const variant of variants) {
                    const v1Res = await fetch(`${V1_API_BASE}/payments`, {
                        method: "POST",
                        headers: {
                            "X-API-Key": publicKey,
                            "X-API-Secret": secretKey,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ ...v1BasePayload, ...(variant || {}) }),
                    });
                    const data: any = await v1Res.json().catch(() => ({}));
                    const url = data?.data?.payment_url || data?.data?.checkout_url || data?.checkout_url ||
                        data?.data?.metadata?.payment_url || data?.metadata?.payment_url || "";
                    const ref = String(data?.data?.reference || "");
                    // Un push mobile money peut ne renvoyer aucune URL (la demande part
                    // directement sur le telephone) : la reference suffit alors.
                    if (v1Res.ok && (url || ref)) {
                        v1Data = data;
                        v1Url = url;
                        v1Mode = variant?.payment_method ? "direct" : "checkout";
                        break;
                    }
                    const errText = typeof data?.error === "string"
                        ? data.error
                        : (data?.error?.message || data?.message || "");
                    if (errText) v1Error = String(errText);
                    console.warn(
                        "[Payment] v1 refuse", variant ? JSON.stringify(variant) : "checkout",
                        v1Res.status, v1Error,
                    );
                }

                if (!v1Url) return json({ error: v1Error, success: false });

                // Reference MTX-... : c'est elle qui sert a confirmer le paiement ensuite.
                const v1Ref = String(v1Data?.data?.reference || "");
                await supabase
                    .from("reservations")
                    .update({
                        total_amount: amount,
                        payment_provider: wantsCard ? "geniuspay_card_v1" : `geniuspay_${rail}_v1`,
                        payment_tx_id: v1Ref || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", reservationId);
                return json({
                    success: true,
                    mode: v1Mode,
                    paymentUrl: v1Url || null,
                    reference: v1Ref,
                    status: "pending_checkout",
                    amount: minorUnits,
                    currency: currencyOut,
                    amountOfferCurrency: amount,
                    offerCurrency: currencyOut,
                });
            }
            console.error("[Payment] GeniusPay refus:", geniusRes.status, JSON.stringify(result).slice(0, 500));
            const message = result?.error?.message || result?.error || result?.message || "Paiement refuse par GeniusPay.";
            return json({ error: String(message), success: false });
        }

        // Montant total enregistre : c'est lui que le recu affichera.
        await supabase
            .from("reservations")
            .update({
                total_amount: amount,
                payment_provider: wantsCard ? "geniuspay_card" : `geniuspay_${rail}`,
                payment_tx_id: result?.transaction_id || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", reservationId);

        return json({
            success: true,
            mode: wantsCard ? "checkout" : "direct",
            paymentUrl: result?.checkout_url || null,
            deepLink: result?.deep_link || null,
            status: result?.status || "pending",
            otpRequired: Boolean(result?.otp_required),
            otpInstructions: result?.otp_instructions || null,
            provider: result?.provider || null,
            transactionId: result?.transaction_id || null,
            amount: minorUnits,
            currency: currencyOut,
            amountOfferCurrency: amount,
            offerCurrency: currencyOut,
        });
    } catch (error: any) {
        console.error("[Payment] Erreur:", error?.message || error);
        return json({ error: error?.message || "Paiement impossible." }, 500);
    }
});
