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
    "232": { country: "SL", currency: "SLE" },
};

// Slugs de rails acceptes cote client (voir geniuspay_get_rails).
const ALLOWED_RAILS = ["wave", "orange_money", "mtn_money", "moov_money", "free_money", "mpesa"];

const XOF_ZONE = ["CI", "SN", "BJ", "BF", "ML", "TG", "NE", "GW"];

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
        const wantsCard = rail === "card" || !rail;

        if (!reservationId) return json({ error: "reservationId manquant." }, 400);

        const { data: reservation, error: resErr } = await supabase
            .from("reservations")
            .select("id, user_id, offer_id, status, kg, total_amount, offers(price_per_kg, base_currency, origin, destination)")
            .eq("id", reservationId)
            .maybeSingle();
        if (resErr) throw resErr;
        if (!reservation) return json({ error: "Reservation introuvable." }, 404);

        const resume = Array.isArray((reservation as any).offers)
            ? (reservation as any).offers[0]
            : (reservation as any).offers;

        if (String((reservation as any).user_id) !== String(user.id)) {
            return json({ error: "Seul le client de cette reservation peut payer." }, 403);
        }

        const paidStatuses = ["paid", "voyageur_paye", "colisconnect_paye", "livre", "delivered"];
        if (paidStatuses.includes(String((reservation as any).status || ""))) {
            return json({ error: "Cette reservation est deja payee.", alreadyPaid: true }, 409);
        }

        const kg = Number((reservation as any).kg || 0);
        const pricePerKg = Number(resume?.price_per_kg || 0);
        const offerCurrency = String(resume?.base_currency || "XOF").toUpperCase();
        if (!(kg > 0)) return json({ error: "Choisissez d'abord le nombre de kilos." }, 400);
        if (!(pricePerKg > 0)) return json({ error: "Prix au kilo indisponible sur cette offre." }, 400);

        const totalInOfferCurrency = Math.round(kg * pricePerKg * 100) / 100;
        const commissionInOfferCurrency = Math.round(totalInOfferCurrency * 0.10 * 100) / 100;

        const geo = countryFromPhone(phone);
        const countryCode = geo?.country || "CI";
        const targetCurrency = wantsCard
            ? "EUR"
            : (XOF_ZONE.includes(countryCode) ? "XOF" : (geo?.currency || "EUR"));

        const { data: rates } = await supabase
            .from("exchange_rates")
            .select("currency_code, rate_to_eur")
            .in("currency_code", [offerCurrency, targetCurrency]);
        const rateOf = (code: string) => {
            if (code === "EUR") return 1;
            const row = (rates || []).find((r: any) => String(r.currency_code).toUpperCase() === code);
            const v = Number(row?.rate_to_eur || 0);
            return v > 0 ? v : 0;
        };
        let amount = 0;
        if (offerCurrency === targetCurrency) {
            amount = commissionInOfferCurrency;
        } else {
            const from = rateOf(offerCurrency);
            const to = rateOf(targetCurrency);
            if (!from || !to) return json({ error: "Taux de change indisponible. Reessayez plus tard." }, 503);
            amount = (commissionInOfferCurrency / from) * to;
        }

        let minorUnits: number;
        let currencyOut: string;
        if (targetCurrency === "EUR") {
            currencyOut = "EUR";
            minorUnits = Math.max(100, Math.round(amount * 100));
        } else {
            currencyOut = targetCurrency; // XOF/XAF/GNF : pas de decimales
            minorUnits = Math.max(100, Math.round(amount));
        }

        if (!wantsCard && !ALLOWED_RAILS.includes(rail)) {
            return json({ error: "Moyen de paiement non pris en charge." }, 400);
        }
        if (!wantsCard && !/^\+\d{8,15}$/.test(phone)) {
            return json({ error: "Numero de telephone invalide." }, 400);
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
            metadata: { reservationId: String(reservationId), commission: commissionInOfferCurrency },
        };
        // Carte : pas de payment_method -> page hebergee (3DS).
        if (!wantsCard) payload.payment_method = rail;

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
                // Les cles en place ne sont pas encore des cles v2 : on retombe sur
                // l'API v1 (page de paiement hebergee) pour ne rien casser.
                console.warn("[Payment] v2 refuse (cle), repli sur v1:", geniusRes.status, msg);
                const v1Payload: Record<string, unknown> = {
                    amount: minorUnits,
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
                if (!wantsCard) v1Payload.payment_method = rail;
                const v1Res = await fetch("https://pay.genius.ci/api/v1/merchant/payments", {
                    method: "POST",
                    headers: {
                        "X-API-Key": publicKey,
                        "X-API-Secret": secretKey,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(v1Payload),
                });
                const v1Data = await v1Res.json().catch(() => ({}));
                const v1Url = v1Data?.data?.checkout_url || v1Data?.checkout_url || v1Data?.data?.payment_url;
                if (!v1Res.ok || !v1Url) {
                    const v1Msg = v1Data?.message || v1Data?.error || "Paiement refuse par GeniusPay.";
                    return json({ error: String(v1Msg) }, 400);
                }
                await supabase
                    .from("reservations")
                    .update({
                        total_amount: totalInOfferCurrency,
                        payment_provider: wantsCard ? "geniuspay_card_v1" : `geniuspay_${rail}_v1`,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", reservationId);
                return json({
                    success: true,
                    mode: "checkout",
                    paymentUrl: v1Url,
                    status: "pending_checkout",
                    amount: minorUnits,
                    currency: currencyOut,
                    amountOfferCurrency: commissionInOfferCurrency,
                    offerCurrency,
                });
            }
            console.error("[Payment] GeniusPay refus:", geniusRes.status, JSON.stringify(result).slice(0, 500));
            const message = result?.error?.message || result?.error || result?.message || "Paiement refuse par GeniusPay.";
            return json({ error: String(message) }, 400);
        }

        // Montant total enregistre : c'est lui que le recu affichera.
        await supabase
            .from("reservations")
            .update({
                total_amount: totalInOfferCurrency,
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
            amountOfferCurrency: commissionInOfferCurrency,
            offerCurrency,
        });
    } catch (error: any) {
        console.error("[Payment] Erreur:", error?.message || error);
        return json({ error: error?.message || "Paiement impossible." }, 500);
    }
});
