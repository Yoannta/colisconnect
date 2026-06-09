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

function getPaymentConfig(departureCountry: string): PaymentConfig {
    const c = String(departureCountry || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    // Afrique de l'Ouest
    if (c.includes("cote d'ivoire") || c.includes("cote d ivoire") || c.includes("ivory coast") || c.includes("abidjan")) {
        return { payment_method: "orange_money", currency: "XOF", customer_country: "CI", mmo_provider: "ORANGE_CIV" };
    }
    if (c.includes("senegal") || c.includes("dakar")) {
        return { payment_method: "wave", currency: "XOF", customer_country: "SN" };
    }
    if (c.includes("benin") || c.includes("cotonou")) {
        return { payment_method: "mtn_money", currency: "XOF", customer_country: "BJ" };
    }
    if (c.includes("mali") || c.includes("bamako")) {
        return { payment_method: "orange_money", currency: "XOF", customer_country: "ML" };
    }
    if (c.includes("togo") || c.includes("lome")) {
        return { payment_method: "moov_money", currency: "XOF", customer_country: "TG" };
    }
    if (c.includes("burkina") || c.includes("ouagadougou")) {
        return { payment_method: "orange_money", currency: "XOF", customer_country: "BF" };
    }
    if (c.includes("niger") || c.includes("niamey")) {
        return { payment_method: "airtel_money", currency: "XOF", customer_country: "NE" };
    }
    if (c.includes("guinee") || c.includes("conakry")) {
        return { payment_method: "orange_money", currency: "GNF", customer_country: "GN" };
    }
    if (c.includes("cameroun") || c.includes("douala") || c.includes("yaounde")) {
        return { payment_method: "mtn_money", currency: "XAF", customer_country: "CM" };
    }
    if (c.includes("gabon") || c.includes("libreville")) {
        return { payment_method: "airtel_money", currency: "XAF", customer_country: "GA" };
    }
    if (c.includes("congo")) {
        return { payment_method: "airtel_money", currency: "XAF", customer_country: "CG" };
    }

    const ISO2_MAP: Record<string, string> = {
        "france": "FR", "belgique": "BE", "suisse": "CH", "espagne": "ES",
        "italie": "IT", "portugal": "PT", "allemagne": "DE", "irlande": "IE",
        "chine": "CN", "canada": "CA", "etats-unis": "US", "bresil": "BR",
        "emirats arabes unis": "AE", "egypte": "EG", "chili": "CL"
    };
    const iso2 = Object.entries(ISO2_MAP).find(([name]) => c.includes(name))?.[1] || "FR";

    return { payment_method: "card", currency: "EUR", customer_country: iso2 };
}

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS_HEADERS });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Authentification
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing Authorization header");

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (authError || !user) throw new Error("Unauthorized");

        // 2. Body parsing
        let body;
        try {
            body = await req.json();
        } catch (e) {
            throw new Error("Invalid JSON body");
        }

        const { reservationId, phoneNumber, amountEUR } = body;
        if (!reservationId) throw new Error("reservationId is required");

        console.log(`[Payment] Initialisation pour Reservation ID: ${reservationId}`);

        // 3. Récupérer le pays d'origine de l'offre
        const { data: reservation, error: dbError } = await supabase
            .from("reservations")
            .select("id, offer_id, offers(origin)")
            .eq("id", reservationId)
            .maybeSingle();

        if (dbError) {
            console.error("[Payment] Database error:", dbError);
        }

        // Logic safe fallback
        const departureCountry = (reservation as any)?.offers?.origin || "France";
        console.log(`[Payment] Pays de départ détecté: ${departureCountry}`);

        const config = getPaymentConfig(departureCountry);

        // 4. Config GeniusPay
        const geniusPubKey = Deno.env.get("GENIUS_PUBLIC_KEY");
        const geniusPrivKey = Deno.env.get("GENIUS_PRIVATE_KEY");
        if (!geniusPubKey || !geniusPrivKey) throw new Error("GeniusPay credentials not configured");

        const finalAmount = amountEUR ? Math.round(amountEUR * 100) : 400;

        const geniusPayload = {
            amount: finalAmount,
            currency: config.currency,
            payment_method: config.payment_method,
            description: `Paiement Reservation ${reservationId}`,
            customer: {
                name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Client",
                email: user.email,
                country: config.customer_country,
                ...(phoneNumber ? { phone: phoneNumber } : {}),
            },
            success_url: `https://yoannta.github.io/colisconnect/chat.html?payment=success&id=${reservationId}`,
            error_url: `https://yoannta.github.io/colisconnect/chat.html?payment=error&id=${reservationId}`,
            metadata: {
                reservationId,
                country: departureCountry
            }
        };

        if (config.mmo_provider) {
            (geniusPayload as any).mmo_provider = config.mmo_provider;
        }

        console.log(`[Payment] Sending to GeniusPay:`, JSON.stringify(geniusPayload));

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
            console.error("[Payment] GeniusPay Error API:", result);
            throw new Error(result.message || "Erreur de l'agrégateur GeniusPay");
        }

        const checkoutUrl = result.data?.checkout_url || result.data?.payment_url || result.checkout_url;
        if (!checkoutUrl) throw new Error("Payment URL not found in aggregator response");

        return new Response(JSON.stringify({
            success: true,
            paymentUrl: checkoutUrl,
            mode: config.payment_method,
            country: departureCountry,
            currency: config.currency
        }), {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });

    } catch (error) {
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
