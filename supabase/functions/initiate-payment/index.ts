import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Mapping pays (départ de l'offre) → config GeniusPay ──────────────────────
//
// Le pays "départ de l'offre" (ex: France, Côte d'Ivoire) détermine
// le mode de paiement, PAS le pays du profil de l'utilisateur.
//
// Logique :
//   - Pays Afrique de l'Ouest & Mobile Money → payment_method: operateur_spécifique
//   - Tous les autres pays → payment_method: "card" + currency: "EUR"/"USD"
// ──────────────────────────────────────────────────────────────────────────────

interface PaymentConfig {
    payment_method: string;
    currency: string;
    customer_country: string;  // ISO2
    mmo_provider?: string;     // Opérateur précis (optionnel)
}

/**
 * Détermine la configuration GeniusPay selon le pays de DÉPART de l'offre.
 * Source : documentation expert GeniusPay fournie par l'utilisateur.
 */
function getPaymentConfig(departureCountry: string): PaymentConfig {
    const c = String(departureCountry || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    // ── Afrique de l'Ouest / Mobile Money ────────────────────────────────────
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
    if (c.includes("congo") && !c.includes("democratique")) {
        return { payment_method: "airtel_money", currency: "XAF", customer_country: "CG" };
    }
    if (c.includes("democratique du congo") || c.includes("rdc") || c.includes("kinshasa")) {
        return { payment_method: "airtel_money", currency: "CDF", customer_country: "CD" };
    }
    if (c.includes("ghana") || c.includes("accra")) {
        return { payment_method: "mtn_money", currency: "GHS", customer_country: "GH" };
    }
    if (c.includes("kenya") || c.includes("nairobi")) {
        return { payment_method: "airtel_money", currency: "KES", customer_country: "KE" };
    }
    if (c.includes("maroc") || c.includes("casablanca") || c.includes("rabat")) {
        return { payment_method: "card", currency: "MAD", customer_country: "MA" };
    }
    if (c.includes("algerie") || c.includes("alger")) {
        return { payment_method: "card", currency: "DZD", customer_country: "DZ" };
    }
    if (c.includes("tunisie") || c.includes("tunis")) {
        return { payment_method: "card", currency: "TND", customer_country: "TN" };
    }

    // ── International / Carte Bancaire (Stripe) ───────────────────────────────
    // France, Belgique, Suisse, Espagne, Italie, Portugal, Allemagne, Irlande,
    // Chine, Canada, Etats-Unis, Emirats, Brésil, etc.
    const ISO2_MAP: Record<string, string> = {
        "france": "FR", "belgique": "BE", "suisse": "CH", "espagne": "ES",
        "italie": "IT", "portugal": "PT", "allemagne": "DE", "irlande": "IE",
        "royaume-uni": "GB", "pays-bas": "NL", "luxembourg": "LU",
        "chine": "CN", "canada": "CA", "etats-unis": "US", "bresil": "BR",
        "emirats arabes unis": "AE", "egypte": "EG",
    };
    const iso2 = Object.entries(ISO2_MAP).find(([name]) => c.includes(name))?.[1] || "FR";

    return { payment_method: "card", currency: "EUR", customer_country: iso2 };
}

// ─── Récupérer le pays de départ depuis l'offre liée à la réservation ─────────

async function getDepartureCountryFromReservation(
    supabase: ReturnType<typeof createClient>,
    reservationId: string
): Promise<string> {
    // La réservation est liée à une offre qui a un champ `origin` (pays de départ)
    const { data: reservation, error } = await supabase
        .from("reservations")
        .select("offer_id, offers(origin)")
        .eq("id", reservationId)
        .single();

    if (error || !reservation) {
        console.error("Reservation lookup error:", error);
        return "France"; // Fallback safe
    }

    // @ts-ignore: Supabase join typing
    const origin = reservation.offers?.origin || reservation.offer?.origin || "";
    return String(origin || "France");
}

// ─── Handler principal ────────────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS_HEADERS });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Vérifier l'authentification
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing Authorization header");

        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace("Bearer ", "")
        );
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
            });
        }

        // 2. Extraire les paramètres de la requête
        const { reservationId, phoneNumber, amountEUR } = await req.json();
        if (!reservationId) throw new Error("reservationId est requis");

        // 3. Récupérer le pays de DÉPART de l'offre (et non le pays du profil user)
        const departureCountry = await getDepartureCountryFromReservation(supabase, reservationId);
        console.log(`[Payment] Pays de départ de l'offre : "${departureCountry}"`);

        // 4. Déterminer la config GeniusPay selon ce pays
        const config = getPaymentConfig(departureCountry);
        console.log(`[Payment] Config GeniusPay :`, JSON.stringify(config));

        // 5. Construire le payload GeniusPay
        const geniusPubKey = Deno.env.get("GENIUS_PUBLIC_KEY");
        const geniusPrivKey = Deno.env.get("GENIUS_PRIVATE_KEY");
        const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://yoannta.github.io/colisconnect";

        // Montant : utiliser amountEUR si fourni, sinon montant de test 400
        const finalAmount = amountEUR ? Math.round(amountEUR * 100) : 400;

        const geniusPayload: Record<string, unknown> = {
            amount: finalAmount,
            currency: config.currency,
            payment_method: config.payment_method,
            description: `ColisConnect Réservation #${reservationId} - Départ: ${departureCountry}`,
            customer: {
                name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Client",
                email: user.email,
                country: config.customer_country,
                ...(phoneNumber ? { phone: phoneNumber } : {}),
            },
            success_url: `${frontendUrl}/chat.html?payment=success&id=${reservationId}`,
            error_url: `${frontendUrl}/chat.html?payment=error&id=${reservationId}`,
            metadata: {
                reservationId,
                userId: user.id,
                departureCountry,
                paymentMethod: config.payment_method,
            },
        };

        // Ajouter mmo_provider si on le connaît précisément
        if (config.mmo_provider) {
            geniusPayload.mmo_provider = config.mmo_provider;
        }

        console.log(`[Payment] Payload GeniusPay :`, JSON.stringify(geniusPayload));

        // 6. Appel API GeniusPay
        const response = await fetch("https://pay.genius.ci/api/v1/merchant/payments", {
            method: "POST",
            headers: {
                "X-API-Key": geniusPubKey!,
                "X-API-Secret": geniusPrivKey!,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(geniusPayload),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("[Payment] Erreur GeniusPay:", JSON.stringify(result));
            throw new Error(result.message || `Erreur GeniusPay (${response.status})`);
        }

        const checkoutUrl = result.data?.checkout_url || result.data?.payment_url || result.checkout_url;
        if (!checkoutUrl) throw new Error("Pas d'URL de paiement dans la réponse GeniusPay");

        return new Response(JSON.stringify({
            success: true,
            paymentUrl: checkoutUrl,
            provider: "GeniusPay",
            mode: config.payment_method === "card" ? "card" : "mobile_money",
            currency: config.currency,
            country: departureCountry,
            amount: finalAmount,
        }), {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("[Payment] Erreur interne:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }
});
