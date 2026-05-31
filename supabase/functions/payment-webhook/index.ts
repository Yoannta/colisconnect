import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS_HEADERS });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const body = await req.json();
        console.log("[Webhook] Payload reçu:", JSON.stringify(body));

        // GeniusPay envoie souvent le statut dans body.data.status ou body.status
        const status = body.data?.status || body.status;
        const reservationId = body.data?.metadata?.reservationId || body.metadata?.reservationId;

        if (status === "completed" || status === "success") {
            console.log(`[Webhook] Paiement réussi pour réservation ${reservationId}`);

            // Mettre à jour la réservation dans la DB
            const { error } = await supabase
                .from("reservations")
                .update({ status: "voyageur_paye", updated_at: new Date().toISOString() })
                .eq("id", reservationId);

            if (error) throw error;

            // Optionnel: Notifier via une autre fonction ou trigger DB
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("[Webhook] Erreur:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }
});
