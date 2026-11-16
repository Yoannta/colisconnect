import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Verification a la demande, appelee par le client au retour du paiement.
// Le statut vient de l'API GeniusPay (cle secrete), jamais du navigateur.

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_BASE = Deno.env.get("GENIUS_API_URL") || "https://api.geniuspay.ci";
// Base officielle du paiement v1 (doc geniuspay.ci/docs/api).
const V1_API_BASE = Deno.env.get("GENIUS_V1_API_URL") || "https://geniuspay.ci/api/v1/merchant";
const PAID_STATUSES = ["paid", "voyageur_paye", "colisconnect_paye", "livre", "delivered"];

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
}

async function geniusGet(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            "X-API-Key": Deno.env.get("GENIUS_PUBLIC_KEY") || "",
            "X-API-Secret": Deno.env.get("GENIUS_PRIVATE_KEY") || "",
            "Authorization": `Bearer ${Deno.env.get("GENIUS_PRIVATE_KEY") || ""}`,
        },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

async function geniusV1Get(path: string) {
    const res = await fetch(`${V1_API_BASE}${path}`, {
        headers: {
            "X-API-Key": Deno.env.get("GENIUS_PUBLIC_KEY") || "",
            "X-API-Secret": Deno.env.get("GENIUS_PRIVATE_KEY") || "",
        },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
    if (req.method !== "POST") return json({ error: "Methode non autorisee." }, 405);

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
        if (!reservationId) return json({ error: "reservationId manquant." }, 400);

        const { data: reservation, error: rErr } = await supabase
            .from("reservations")
            .select("id, user_id, status, kg, offer_id, payment_tx_id, payment_provider, offers(user_id)")
            .eq("id", reservationId)
            .maybeSingle();
        if (rErr) throw rErr;
        if (!reservation) return json({ error: "Reservation introuvable." }, 404);

        const offerRel = Array.isArray((reservation as any).offers)
            ? (reservation as any).offers[0]
            : (reservation as any).offers;
        const uid = user.id;
        if (String((reservation as any).user_id) !== uid && String(offerRel?.user_id || "") !== uid) {
            return json({ error: "Vous ne participez pas a cette reservation." }, 403);
        }

        if (PAID_STATUSES.includes(String((reservation as any).status || ""))) {
            return json({ success: true, status: "paid", changed: false });
        }

        // Reference enregistree a la creation : MTX-... pour la v1, rien pour la v2.
        // Les deux APIs ont des bases separees : une reference v1 ne se lit qu'en v1.
        const txId = String((reservation as any).payment_tx_id || "");
        const isV1 = /^MTX-/i.test(txId);

        const remote = isV1
            ? await geniusV1Get(`/payments/${encodeURIComponent(txId)}`)
            : await geniusGet(`/v2/payments/${encodeURIComponent(String(reservationId))}`);
        if (!remote.ok) {
            return json({ success: false, status: "unknown", error: "Paiement introuvable chez GeniusPay." }, 404);
        }
        const remoteStatus = String(
            isV1 ? (remote.data as any)?.data?.status : (remote.data as any)?.status,
        ).toLowerCase();
        if (remoteStatus !== "completed") {
            return json({ success: true, status: remoteStatus || "pending", changed: false });
        }

        const txRef = isV1
            ? txId
            : ((remote.data as any)?.provider_reference || (remote.data as any)?.transaction_id || String(reservationId));
        const { error: upErr } = await supabase
            .from("reservations")
            .update({ status: "paid", payment_tx_id: txRef, updated_at: new Date().toISOString() })
            .eq("id", reservationId);
        if (upErr) throw upErr;

        const reservedKg = Number((reservation as any).kg || 0);
        const offerId = (reservation as any).offer_id;
        if (reservedKg > 0 && offerId) {
            const { data: offer } = await supabase
                .from("offers")
                .select("available_kg")
                .eq("id", offerId)
                .maybeSingle();
            await supabase
                .from("offers")
                .update({ available_kg: Math.max(0, Number(offer?.available_kg || 0) - reservedKg) })
                .eq("id", offerId);
        }

        try {
            const { data: thread } = await supabase
                .from("chat_threads")
                .select("id")
                .eq("reservation_id", reservationId)
                .maybeSingle();
            if (thread?.id) {
                const { data: dupe } = await supabase
                    .from("chat_messages")
                    .select("id")
                    .eq("thread_id", thread.id)
                    .ilike("text", `%${txRef}%`)
                    .limit(1);
                if (!dupe?.length) {
                    await supabase.from("chat_messages").insert({
                        thread_id: thread.id,
                        text: `✅ PAIEMENT VALIDÉ !\nRéférence : ${txRef}` +
                            (reservedKg > 0 ? `\nKilos réservés : ${reservedKg} kg` : "") +
                            `\n\nLe paiement de la commission ColisConnect a été reçu avec succès. Les informations de contact sont désormais débloquées.`,
                        sender_type: "system",
                        message_type: "text",
                    });
                }
            }
        } catch (notifyError: any) {
            console.error("[Verify] Message chat impossible:", notifyError?.message || notifyError);
        }

        return json({ success: true, status: "paid", changed: true });
    } catch (error: any) {
        console.error("[Verify] Erreur:", error?.message || error);
        return json({ error: error?.message || "verification impossible" }, 500);
    }
});
