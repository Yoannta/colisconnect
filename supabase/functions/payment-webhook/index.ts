import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Webhook GeniusPay v2 (transaction.*). Le corps n'est JAMAIS cru sur parole :
// a chaque appel on relit le paiement chez GeniusPay avec la cle secrete et on
// ne marque la reservation payee que si l'API repond "completed". La signature
// (X-GeniusPay-Signature) est verifiee en plus quand le secret est configure.

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_BASE = Deno.env.get("GENIUS_API_URL") || "https://api.geniuspay.ci";
const PAID_STATUSES = ["paid", "voyageur_paye", "colisconnect_paye", "livre", "delivered"];

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
}

async function verifyHmac(raw: string, signatureHeader: string | null, secret: string) {
    if (!signatureHeader) return false;
    const parts: Record<string, string> = {};
    for (const chunk of signatureHeader.split(",")) {
        const [k, v] = chunk.split("=");
        if (k && v) parts[k.trim()] = v.trim();
    }
    const ts = parts["t"];
    const v1 = parts["v1"];
    if (!ts || !v1) return false;
    if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // anti-rejeu
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}.${raw}`));
    const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex === v1;
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

async function markPaid(supabase: any, reservationId: string, txRef: string | null) {
    const { data: reservation, error } = await supabase
        .from("reservations")
        .select("id, status, kg, offer_id")
        .eq("id", reservationId)
        .maybeSingle();
    if (error) throw error;
    if (!reservation) return { changed: false, reason: "reservation inconnue" };

    if (PAID_STATUSES.includes(String(reservation.status || ""))) {
        return { changed: false, reason: "deja paye" };
    }

    const { error: upErr } = await supabase
        .from("reservations")
        .update({ status: "paid", payment_tx_id: txRef, updated_at: new Date().toISOString() })
        .eq("id", reservationId);
    if (upErr) throw upErr;

    const reservedKg = Number(reservation.kg || 0);
    const offerId = reservation.offer_id;
    if (reservedKg > 0 && offerId) {
        const { data: offer } = await supabase
            .from("offers")
            .select("available_kg")
            .eq("id", offerId)
            .maybeSingle();
        const currentKg = Number(offer?.available_kg || 0);
        const { error: kgErr } = await supabase
            .from("offers")
            .update({ available_kg: Math.max(0, currentKg - reservedKg) })
            .eq("id", offerId);
        if (kgErr) console.error("[Webhook] Deduction kg impossible:", kgErr.message);
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
                .ilike("text", `%${txRef || reservationId}%`)
                .limit(1);
            if (!dupe?.length) {
                await supabase.from("chat_messages").insert({
                    thread_id: thread.id,
                    text: `✅ PAIEMENT VALIDÉ !\nRéférence : ${txRef || reservationId}` +
                        (reservedKg > 0 ? `\nKilos réservés : ${reservedKg} kg` : "") +
                        `\n\nLe paiement de la commission ColisConnect a été reçu avec succès. Les informations de contact sont désormais débloquées.`,
                    sender_type: "system",
                    message_type: "text",
                });
            }
        }
    } catch (notifyError: any) {
        console.error("[Webhook] Message chat impossible:", notifyError?.message || notifyError);
    }

    return { changed: true, reason: "paye" };
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
    if (req.method !== "POST") return json({ error: "Methode non autorisee." }, 405);

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    try {
        const raw = await req.text();
        const secret = Deno.env.get("GENIUS_WEBHOOK_SECRET");
        let signatureValid = false;
        if (secret) {
            signatureValid = await verifyHmac(raw, req.headers.get("X-GeniusPay-Signature"), secret);
            if (!signatureValid) {
                console.warn("[Webhook] Signature absente ou invalide — verification API seule.");
            }
        }

        let payload: any = {};
        try { payload = JSON.parse(raw); } catch { payload = {}; }

        const reference = String(
            payload?.transaction_ref ||
            payload?.reference ||
            payload?.metadata?.reservationId ||
            payload?.data?.metadata?.reservationId ||
            "",
        );
        const status = String(payload?.new_status || payload?.data?.status || payload?.status || "").toLowerCase();

        console.log(`[Webhook] ref=${reference} status=${status} event=${payload?.event_type || payload?.event || ""}`);

        if (!reference) return json({ error: "reference manquante" }, 400);
        if (!["completed", "success"].includes(status)) {
            return json({ success: true, ignored: true, status });
        }

        // Signature valide = corps authentifie par GeniusPay : on peut s'y fier
        // (c'est le cas de l'API v1, dont les cles en place sont encore valides).
        // Sinon, on ne croit rien : on relit le paiement via l'API.
        if (signatureValid) {
            const txFromBody = String(
                payload?.data?.transaction_id || payload?.transaction_id || payload?.provider_reference || reference,
            );
            const done = await markPaid(supabase, reference, txFromBody);
            return json({ success: true, via: "signature", ...done });
        }

        const remote = await geniusGet(`/v2/payments/${encodeURIComponent(reference)}`);
        if (!remote.ok) {
            console.warn("[Webhook] Verification API impossible:", remote.status, JSON.stringify(remote.data).slice(0, 300));
            return json({ error: "verification impossible", remote_status: remote.status }, 502);
        }
        const remoteStatus = String(remote.data?.status || "").toLowerCase();
        if (remoteStatus !== "completed") {
            return json({ success: true, ignored: true, remote: remoteStatus });
        }

        const txRef = remote.data?.provider_reference || remote.data?.transaction_id || reference;
        const done = await markPaid(supabase, reference, txRef);
        return json({ success: true, ...done });
    } catch (error: any) {
        console.error("[Webhook] Erreur:", error?.message || error);
        return json({ error: error?.message || "erreur" }, 500);
    }
});
