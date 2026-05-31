import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Registre des pays supportés directement par GeniusPay
 */
const GENIUS_PAY_COUNTRIES = [
    "cote d'ivoire", "senegal", "benin", "cameroun",
    "republique democratique du congo", "congo", "gabon",
    "kenya", "ouganda", "rwanda", "zambie", "sierra leone"
];

function normalizeText(text: string) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS_HEADERS });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Verifier l'authentification
        const authHeader = req.headers.get("Authorization")!;
        if (!authHeader) throw new Error("Missing Authorization header");

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
            });
        }

        const { reservationId, departureCountry, amountEUR, phoneNumber } = await req.json();

        const normalizedCountry = normalizeText(departureCountry);
        const isGeniusPayNative = GENIUS_PAY_COUNTRIES.some(c => normalizedCountry.includes(c));

        // Si le pays n'est pas dans la liste native, on passe quand même par GeniusPay 
        // car il gère Stripe/International en fallback.

        const geniusPubKey = Deno.env.get("GENIUS_PUBLIC_KEY");
        const geniusPrivKey = Deno.env.get("GENIUS_PRIVATE_KEY");

        // Montant de test (400 XOF) tel que demandé par l'utilisateur pour l'instant
        const finalAmount = 400;

        // 3. Appel API GeniusPay
        const response = await fetch("https://pay.genius.ci/api/v1/merchant/payments", {
            method: "POST",
            headers: {
                "X-API-Key": geniusPubKey!,
                "X-API-Secret": geniusPrivKey!,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                amount: finalAmount,
                currency: "XOF",
                description: `ColisConnect Réservation #${reservationId}`,
                customer: {
                    name: user.user_metadata?.full_name || "Client",
                    email: user.email,
                    phone: phoneNumber
                },
                success_url: `${Deno.env.get("FRONTEND_URL")}/payment-success?id=${reservationId}`,
                error_url: `${Deno.env.get("FRONTEND_URL")}/payment-error?id=${reservationId}`,
                metadata: {
                    reservationId: reservationId,
                    userId: user.id,
                    country: departureCountry,
                    type: isGeniusPayNative ? "native" : "stripe_fallback"
                }
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Erreur de communication avec l'agrégateur");
        }

        return new Response(JSON.stringify({
            success: true,
            paymentUrl: result.data.checkout_url || result.data.payment_url,
            provider: "Genius Pay",
            currency: "XOF",
            amount: finalAmount
        }), {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }
});
