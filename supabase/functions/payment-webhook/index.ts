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

        const metadata = payload.data?.metadata || payload.metadata || {};
        const reservationId = metadata.reservationId;
        const status = payload.status || payload.data?.status;

        console.log(`[Webhook] Processing Reservation ID: ${reservationId}, Status: ${status}`);

        if (!reservationId) {
            console.error("[Webhook] Missing reservationId in metadata");
            return new Response(JSON.stringify({ error: "Missing reservationId" }), { status: 400 });
        }

        // On ne traite que les paiements réussis
        if (status === "success" || status === "COMPLETED" || payload.event === "payment.success") {
            const txId = payload.data?.transaction_id || payload.transaction_id || "GENIUS_" + Date.now();

            // 1. Mise à jour de la réservation
            const { error: updateError } = await supabase
                .from("reservations")
                .update({
                    status: "paid",
                    payment_tx_id: txId
                })
                .eq("id", reservationId);

            if (updateError) throw updateError;
            console.log(`[Webhook] Reservation ${reservationId} marked as PAID`);

            // 2. Notification dans le Chat
            try {
                const { data: thread } = await supabase
                    .from("chat_threads")
                    .select("id")
                    .eq("reservation_id", reservationId)
                    .maybeSingle();

                if (thread) {
                    await supabase.from("chat_messages").insert({
                        thread_id: thread.id,
                        text: `✅ PAIEMENT VALIDÉ !\nRéférence : ${txId}\n\nLe paiement de la commission ColisConnect a été reçu avec succès. Les informations de contact sont désormais débloquées.`,
                        sender_type: "system",
                        message_type: "text"
                    });
                }
            } catch (notifyError) {
                console.error("[Webhook] Failed to send chat notification:", notifyError);
            }

            return new Response(JSON.stringify({ success: true, message: "Reservation and Chat updated" }), {
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
