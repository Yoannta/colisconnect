import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ColisConnect — verificateur IA anti-divulgation de contacts.
// Appele (a) par le front pendant la redaction (jeton utilisateur), ou
// (b) par la base (pg_net) avec l'en-tete secret x-cc-ai-key.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cc-ai-key",
};

const SYSTEME = `Tu es le moderateur anti-fraude de ColisConnect, une plateforme de transport de colis entre la Chine et l'Afrique.
Deux utilisateurs discutent dans un chat prive. Tu recois les 10 derniers messages du fil, dans l'ordre.
Ta tache : dire si quelqu'un tente de faire sortir la conversation de la plateforme en communiquant une coordonnee.

EST UNE FRAUDE (fraude=true) :
- un numero de telephone, meme dicte chiffre par chiffre, surtout reparti sur plusieurs messages (ex : "6" puis "7" puis "1 bole de farine" puis "3 marigane" puis "3ifnn" : les mots ne servent qu'a deguiser les chiffres) ;
- un numero ecrit en lettres, en chiffres arabes/indiens/tamouls/pleine largeur, ou coupe en morceaux ;
- une adresse e-mail, un pseudo ou lien de reseau social (WhatsApp, Telegram, WeChat, Facebook, Instagram, TikTok, Snap, Viber, Signal), ou une invitation a passer sur une autre application ;
- un IBAN, un numero de compte, un lien de paiement externe, une adresse postale complete avec invite a ecrire hors plateforme.

N'EST PAS UNE FRAUDE (fraude=false) :
- un montant, meme enorme : 2 500 000 GNF, 30 000 000 GNF, 1 000 000 FCFA, 2500 euros ;
- un nombre de colis, un poids, une dimension, une date, une heure, un numero de suivi, un identifiant de commande ;
- un prix, un delai de livraison, une adresse d'entrepot demandee pour un envoi normal ;
- du texte sans aucun chiffre.

Reponds UNIQUEMENT par un objet JSON, sans texte autour :
{"fraude": true ou false, "confiance": nombre entre 0 et 1, "raison": "une phrase courte en francais", "coordonnee": "la coordonnee retrouvee ou null"}`;

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function dernierMessages(threadId: string, limite: number) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const r = await fetch(
    `${url}/rest/v1/chat_messages?thread_id=eq.${threadId}&select=created_at,sender_user_id,text&order=created_at.desc&limit=${limite}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!r.ok) throw new Error("lecture du fil impossible (" + r.status + ")");
  const rows = await r.json();
  return (rows as Array<{ created_at: string; sender_user_id: string; text: string }>).reverse();
}

async function logVerdict(threadId: string, userId: string | null, fraude: boolean, confiance: number, raison: string, extrait: string) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  await fetch(`${url}/rest/v1/ai_moderation_logs`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      thread_id: threadId,
      user_id: userId,
      risk_level: fraude ? "high" : "low",
      summary: reason0(raison),
      action_taken: fraude ? "ia_fraude" : "ia_ok",
      is_dismissed: !fraude,
      flags: { source: "ia", confiance, modele: Deno.env.get("CC_AI_MODELE") || "deepseek" },
      raw_content: extrait.slice(0, 2000),
    }),
  }).catch(() => {});
}

function reason0(s: string) {
  return (s || "").replace(/\s+/g, " ").slice(0, 300);
}

async function askModele(question: string, modele: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    if (modele === "gemini" && Deno.env.get("GEMINI_API_KEY")) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: SYSTEME + "\n\n" + question }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
      });
      const d = await r.json();
      return d?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}` },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEME }, { role: "user", content: question }],
      }),
    });
    const d = await r.json();
    return d?.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const secret = Deno.env.get("CC_AI_KEY") || "";
    const fourni = req.headers.get("x-cc-ai-key") || "";
    const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    let userId: string | null = null;
    let parLaBase = false;

    if (secret && fourni === secret) {
      parLaBase = true;
    } else {
      const url = Deno.env.get("SUPABASE_URL")!;
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${jeton}` } });
      if (!r.ok) return json({ erreur: "jeton refuse" }, 401);
      const u = await r.json();
      userId = u?.id || null;
      if (!userId) return json({ erreur: "jeton sans utilisateur" }, 401);
    }

    const corps = await req.json().catch(() => ({}));
    const threadId = String(corps.thread_id || "");
    if (!threadId) return json({ erreur: "thread_id manquant" }, 400);
    if (!userId) userId = corps.user_id || null;

    const msgs = await dernierMessages(threadId, 10);
    const extrait = msgs.map((m) => (m.text || "").trim()).filter(Boolean).join("\n");
    if (!extrait) return json({ fraude: false, confiance: 1, raison: "fil vide", coordonnee: null, modele: "aucun" });

    const modele = String(corps.modele || Deno.env.get("CC_AI_MODELE") || "deepseek");
    const question =
      "Voici les " + msgs.length + " derniers messages du fil (un par ligne, dans l'ordre) :\n" +
      extrait +
      (corps.brouillon ? "\n\nA part, le message que l'utilisateur est en train d'ecrire : " + String(corps.brouillon).slice(0, 500) : "");
    const brut = await askModele(question, modele);

    let verdict: { fraude?: boolean; confiance?: number; raison?: string; coordonnee?: string | null } = {};
    try {
      verdict = JSON.parse(brut.replace(/```json|```/g, "").trim());
    } catch {
      return json({ fraude: false, confiance: 0, raison: "reponse illisible du modele", coordonnee: null, modele, brut: brut.slice(0, 200) });
    }
    const fraude = verdict.fraude === true;
    const confiance = typeof verdict.confiance === "number" ? verdict.confiance : 0.5;
    const raison = reason0(verdict.raison || "");
    const coordonnee = verdict.coordonnee ?? null;

    await logVerdict(threadId, userId, fraude, confiance, raison, extrait);

    return json({ fraude, confiance, raison, coordonnee, modele, messages_analyses: msgs.length });
  } catch (e) {
    return json({ erreur: String((e as Error)?.message || e) }, 500);
  }
});
