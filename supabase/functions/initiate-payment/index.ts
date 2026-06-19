import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentConfig {
    payment_method: string;
    currency: string;
    customer_country: string;
    mmo_provider?: string;
}

interface PaymentConfig {
    payment_method: string;
    currency: string;
    customer_country: string;
    mmo_provider?: string;
}

const COUNTRY_DATA: Record<string, any> = {
    "+225": { cc: "CI", cur: "XOF", method: "pawapay" },
    "+221": { cc: "SN", cur: "XOF", method: "pawapay" },
    "+229": { cc: "BJ", cur: "XOF", method: "pawapay" },
    "+237": { cc: "CM", cur: "XAF", method: "pawapay" },
    "+243": { cc: "CD", cur: "USD", method: "pawapay" },
    "+242": { cc: "CG", cur: "XAF", method: "pawapay" },
    "+241": { cc: "GA", cur: "XAF", method: "pawapay" },
    "+254": { cc: "KE", cur: "KES", method: "pawapay" },
    "+256": { cc: "UG", cur: "UGX", method: "pawapay" },
    "+250": { cc: "RW", cur: "RWF", method: "pawapay" },
    "+260": { cc: "ZM", cur: "ZMW", method: "pawapay" },
    "+232": { cc: "SL", cur: "SLE", method: "pawapay" },
};

function getPaymentConfig(departureCountry: string, phone?: string): PaymentConfig {
    // Priority 1: Detection by Phone Prefix
    if (phone) {
        const prefix = Object.keys(COUNTRY_DATA).find(p => phone.startsWith(p));
        if (prefix) {
            const data = COUNTRY_DATA[prefix];
            return { payment_method: data.method, currency: data.cur, customer_country: data.cc };
        }
    }

    // Priority 2: Detection by Country Name (Origin of Offer)
    const c = String(departureCountry || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    if (c.includes("cote d'ivoire") || c.includes("cote d ivoire") || c.includes("abidjan")) return { payment_method: "pawapay", currency: "XOF", customer_country: "CI" };
    if (c.includes("senegal")) return { payment_method: "pawapay", currency: "XOF", customer_country: "SN" };
    if (c.includes("benin")) return { payment_method: "pawapay", currency: "XOF", customer_country: "BJ" };
    if (c.includes("cameroun")) return { payment_method: "pawapay", currency: "XAF", customer_country: "CM" };
    if (c.includes("congo")) return { payment_method: "pawapay", currency: "XAF", customer_country: "CG" };
    if (c.includes("gabon")) return { payment_method: "pawapay", currency: "XAF", customer_country: "GA" };

    // Default Fallback: Card
    return { payment_method: "card", currency: "EUR", customer_country: "FR" };
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

    const geniusPubKey = Deno.env.get("GENIUS_PUBLIC_KEY");
    const geniusPrivKey = Deno.env.get("GENIUS_PRIVATE_KEY");

    // ROUTE 1 : DÉCOUVERTE DYNAMIQUE DES OPÉRATEURS (Suggestion Expert #1)
    const url = new URL(req.url);
    if (req.method === "GET" && url.searchParams.has("country")) {
        const country = url.searchParams.get("country")?.toUpperCase();
        try {
            const response = await fetch(`https://pay.genius.ci/api/v1/merchant/pawapay/providers?country=${country}`, {
                headers: { "X-API-Key": geniusPubKey!, "X-API-Secret": geniusPrivKey! }
            });
            const data = await response.json();
            return new Response(JSON.stringify(data), {
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
        }
    }

    // ROUTE 2 : INITIATION DE PAIEMENT
    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing Authorization header");

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (authError || !user) throw new Error("Unauthorized");

        const body = await req.json().catch(() => ({}));
        const { reservationId, phoneNumber, type, amountEUR, country: bodyCountry } = body;
        if (!reservationId) throw new Error("reservationId is required");

        const { data: reservation } = await supabase
            .from("reservations")
            .select("id, offers(origin)")
            .eq("id", reservationId)
            .maybeSingle();

        const departureCountry = (reservation as any)?.offers?.origin || "France";

        // On récupère la config basée sur le numéro OU le pays d'origine
        const config = getPaymentConfig(departureCountry, phoneNumber);

        // RÉGLAGE DU MODE DE PAIEMENT SIMPLIFIÉ (ZÉRO ERREUR)
        // Pour avoir la page de choix universelle, on OMET payment_method si c'est MOMO.
        let finalMode = type === "momo" ? null : (type || config.payment_method);

        if (!geniusPubKey || !geniusPrivKey) throw new Error("GeniusPay credentials not configured");

        // On utilise EUR par défaut pour le Hub Universel (momo) pour une compatibilité totale
        const finalCurrency = (finalMode === null) ? "EUR" : config.currency;

        const geniusPayload: any = {
            amount: (finalCurrency === "EUR") ? (amountEUR ? Math.round(amountEUR * 100) : 400) : (amountEUR ? Math.round(amountEUR * 100) : 400),
            currency: finalCurrency,
            description: `Commission CC Res#${reservationId}`,
            customer: {
                name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Client",
                email: user.email,
                // On laisse l'utilisateur choisir son pays sur GeniusPay pour éviter les erreurs d'indicatif
                ...(finalMode && phoneNumber ? { phone: phoneNumber } : {}),
            },
            success_url: `https://yoannta.github.io/colisconnect/chat.html?payment=success&id=${reservationId}`,
            error_url: `https://yoannta.github.io/colisconnect/chat.html?payment=error&id=${reservationId}`,
            metadata: { reservationId }
        };

        if (finalMode) {
            geniusPayload.payment_method = finalMode;
        }

        const geniusResponse = await fetch("https://pay.genius.ci/api/v1/merchant/payments", {
            method: "POST",
            headers: {
                "X-API-Key": geniusPubKey,
                "X-API-Secret": geniusPrivKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(geniusPayload),
        });

        const result = await geniusResponse.json();

        if (!geniusResponse.ok) {
            console.error("[Payment] GeniusPay Error Payload:", JSON.stringify(geniusPayload));
            console.error("[Payment] GeniusPay Error Response:", JSON.stringify(result));
            throw new Error(result.message || "Erreur GeniusPay");
        }

        if (!geniusResponse.ok) {
            console.error("[Payment] GeniusPay Error API:", result);
            throw new Error(result.message || "Erreur de l'agrégateur GeniusPay");
        }

        const checkoutUrl = result.data?.checkout_url || result.data?.payment_url || result.checkout_url;
        if (!checkoutUrl) throw new Error("Payment URL not found in aggregator response");

        return new Response(JSON.stringify({
            success: true,
            paymentUrl: checkoutUrl,
            mode: finalMode,
            country: departureCountry,
            currency: config.currency
        }), {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("[Payment] Global error:", error.message);
        return new Response(JSON.stringify({
            error: error.message,
            success: false
        }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }
});
