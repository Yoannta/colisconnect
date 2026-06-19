import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const payload = await req.json();
        console.log("[Webhook] Received payload:", JSON.stringify(payload));

        // GeniusPay envoie les infos dans data.metadata ou data
        const metadata = payload.data?.metadata || payload.metadata || {};
        const reservationId = metadata.reservationId;
        const status = payload.status || payload.data?.status;

        if (!reservationId) {
            console.error("[Webhook] Missing reservationId in metadata");
            return new Response(JSON.stringify({ error: "Missing reservationId" }), { status: 400 });
        }

        // On ne traite que les paiements réussis
        // Note: GeniusPay renvoie souvent 'success' ou 'COMPLETED'
        if (status === "success" || status === "COMPLETED" || payload.event === "payment.success") {
            const { error } = await supabase
                .from("reservations")
                .update({
                    status: "paid",
                    payment_tx_id: payload.data?.transaction_id || payload.transaction_id || "GENIUS_" + Date.now()
                })
                .eq("id", reservationId);

            if (error) throw error;
            console.log(`[Webhook] Reservation ${reservationId} marked as PAID`);

            return new Response(JSON.stringify({ success: true, message: "Reservation updated" }), {
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
                status: 200,
            });
        } else {
            console.log(`[Webhook] Payment not successful for ${reservationId}, ignoring (Status: ${status})`);
            return new Response(JSON.stringify({ message: "Payment not successful, ignoring" }), { status: 200 });
        }

    } catch (error: any) {
        console.error("[Webhook] Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }
});
