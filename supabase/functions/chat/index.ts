import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ============================================================================
// ColisConnect — Edge Function « chat »
// Lien entre le site public (mascotte / assistant) et DeepSeek.
//
// CONTRAT DE RÉPONSE (JSON strict, trois types seulement, jamais de texte brut) :
//   { "type": "chat",               "message": "..." }
//   { "type": "guide",              "intent": "publish_trip" }
//   { "type": "guide_confirmation", "intent": "find_country", "message": "Je peux te montrer." }
//
// SÉCURITÉ : la réponse du modèle n'est JAMAIS renvoyée telle quelle au
// navigateur. Elle est parsée, validée (type + liste blanche d'intentions),
// bornée, puis re-sérialisée par le serveur. Tout ce qui n'est pas
// explicitement autorisé est dégradé ou remplacé par un message de secours.
// ============================================================================

// ---------------------------------------------------------------------------
// Constantes de contrat / sécurité
// ---------------------------------------------------------------------------

// Les trois types de réponse autorisés.
const ALLOWED_TYPES = new Set(["chat", "guide", "guide_confirmation"]);

// Liste blanche des intentions de guidage (identique à guide-intents.js côté site).
const ALLOWED_INTENTS = new Set([
  "find_country",
  "find_offer",
  "publish_trip",
  "set_phone",
  "my_profile",
]);

const MAX_INPUT_CHARS = 500;        // taille max du message entrant (refus au-delà)
const MAX_OUTPUT_CHARS = 600;       // borne de taille sur le champ "message" renvoyé
const MAX_TOKENS = 300;             // plafond max_tokens (anti-facture)
const DEEPSEEK_TIMEOUT_MS = 15_000; // timeout AbortController sur l'appel DeepSeek

const RATE_LIMIT_MAX = 20;                     // 20 requêtes…
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;   // …par fenêtre glissante de 10 min, par IP

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

// Message de secours : renvoyé quand DeepSeek échoue ou renvoie de l'invalide.
const FALLBACK_MESSAGE =
  "Désolé, je n'arrive pas à répondre pour le moment. Réessaie dans un instant.";

// Message de dégradation : le modèle a proposé une intention hors liste blanche.
const DEGRADE_MESSAGE =
  "Je ne peux pas te montrer cette action pour le moment. Dis-moi ce que tu cherches et je t'aiderai.";

// Même en-têtes CORS que ai-assistant (site sur GitHub Pages, origine différente).
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Prompt système : force le JSON strict, le français, et interdit tout le reste.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Tu es l'assistant de ColisConnect, une plateforme de réservation de transport de colis entre l'Afrique et l'Europe. Tu réponds toujours en français, de façon courte, claire et utile.

Tu dois répondre EXCLUSIVEMENT avec un objet JSON valide, sur une seule ligne, sans aucun texte avant ni après, sans commentaire, sans bloc de code, sans guillemets autour de l'objet. Trois formats sont possibles et rien d'autre :

1. Réponse normale de conversation :
{"type":"chat","message":"ta réponse en français"}

2. Le visiteur demande explicitement et sans ambiguïté qu'on lui montre une action sur la page (mascotte de guidage). Utilise ce format uniquement si la demande est claire :
{"type":"guide","intent":"<intention>"}

3. La demande est ambiguë (on n'est pas certain que le visiteur veuille être guidé). Propose-lui alors de lui montrer :
{"type":"guide_confirmation","intent":"<intention>","message":"Je peux te montrer."}

Les SEULES intentions autorisées (valeur de "intent") sont, au choix, une seule parmi :
- find_country : montrer où choisir / chercher le pays
- find_offer : montrer où trouver une offre de transport
- publish_trip : montrer comment publier un trajet / une annonce
- set_phone : montrer où saisir son numéro de téléphone
- my_profile : montrer où accéder à son profil / compte

RÈGLES STRICTES :
- N'utilise AUCUNE autre intention que celles listées ci-dessus. Si la demande ne correspond à aucune d'elles, réponds en "chat".
- Ne produis JAMAIS de code, de HTML, de CSS, de coordonnées géographiques, ni de commande système.
- Ne réponds jamais avec du texte libre : uniquement l'objet JSON, strictement dans l'un des trois formats.
- Le champ "message" fait au maximum 600 caractères.
- Réponds toujours en français.`;

// Consigne additionnelle injectée lors de l'unique nouvelle tentative après échec.
const STRICT_RETRY_SUFFIX = `

ATTENTION : ta réponse précédente n'était pas un objet JSON valide conforme au format demandé. Réponds maintenant UNIQUEMENT avec un objet JSON sur une seule ligne, commençant par { et finissant par }, sans aucun texte autour, en respectant exactement l'un des trois formats autorisés.`;

// ---------------------------------------------------------------------------
// Rate limiter en mémoire (par adresse IP, fenêtre glissante).
// NOTE : en mémoire = par instance d'Edge Function. C'est un premier filet
// anti-abus suffisant pour un site public, pas une garantie distribuée.
// ---------------------------------------------------------------------------
const hitsByIp = new Map<string, number[]>();
let sweepCounter = 0;

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  const recent = (hitsByIp.get(ip) ?? []).filter((t) => t > cutoff);

  if (recent.length >= RATE_LIMIT_MAX) {
    hitsByIp.set(ip, recent);
    return true;
  }

  recent.push(now);
  hitsByIp.set(ip, recent);

  // Nettoyage périodique pour éviter la fuite mémoire sur des instances longues.
  sweepCounter++;
  if (sweepCounter >= 1000 || hitsByIp.size > 10_000) {
    sweepCounter = 0;
    for (const [key, arr] of hitsByIp) {
      if (arr.every((t) => t <= cutoff)) hitsByIp.delete(key);
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helpers de réponse / validation
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Extrait un objet JSON d'un texte qui peut être entouré de bruit (code fence,
 *  intro de phrase, etc.). Renvoie la valeur parsée ou null. */
function extractJson(text: string): unknown | null {
  if (!text) return null;
  const trimmed = text.trim();

  // 1) essai direct
  try {
    return JSON.parse(trimmed);
  } catch {
    /* on continue */
  }

  // 2) on isole la première { et la dernière }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      /* on continue */
    }
  }

  return null;
}

/** Normalise un champ "message" : chaîne non vide, bornée à MAX_OUTPUT_CHARS. */
function sanitizeMessage(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (!s) return "";
  return s.length > MAX_OUTPUT_CHARS ? s.slice(0, MAX_OUTPUT_CHARS) : s;
}

type ValidPayload =
  | { type: "chat"; message: string }
  | { type: "guide"; intent: string }
  | { type: "guide_confirmation"; intent: string; message: string };

/**
 * Valide et normalise le contenu renvoyé par le modèle.
 * - null : échec dur (pas de JSON, type inconnu, structure vide) → nouvelle
 *   tentative puis message de secours.
 * - un objet "chat" : dégradation d'une intention hors liste blanche (jamais
 *   d'intention inventée ne sort de cette fonction).
 */
function tryNormalize(content: string): ValidPayload | null {
  const parsed = extractJson(content);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;

  const type = obj.type;
  if (typeof type !== "string" || !ALLOWED_TYPES.has(type)) {
    return null;
  }

  if (type === "chat") {
    const message = sanitizeMessage(obj.message);
    if (!message) return null;
    return { type: "chat", message };
  }

  // guide / guide_confirmation : l'intent DOIT être dans la liste blanche.
  const intent = typeof obj.intent === "string" ? obj.intent : "";
  if (!ALLOWED_INTENTS.has(intent)) {
    // Dégradation : on ne laisse jamais passer une intention inconnue.
    return { type: "chat", message: DEGRADE_MESSAGE };
  }

  if (type === "guide") {
    return { type: "guide", intent };
  }

  // guide_confirmation : exige un message, sinon on dégrade.
  const message = sanitizeMessage(obj.message);
  if (!message) {
    return { type: "chat", message: DEGRADE_MESSAGE };
  }
  return { type: "guide_confirmation", intent, message };
}

// ---------------------------------------------------------------------------
// Appel DeepSeek avec timeout (AbortController).
// ---------------------------------------------------------------------------
async function callDeepSeek(userMessage: string, strictRetry = false): Promise<string> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) {
    throw new Error("La clé DeepSeek n'est pas configurée (DEEPSEEK_API_KEY).");
  }

  const messages = [
    {
      role: "system",
      content: strictRetry ? SYSTEM_PROMPT + STRICT_RETRY_SUFFIX : SYSTEM_PROMPT,
    },
    { role: "user", content: userMessage },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);

  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        max_tokens: MAX_TOKENS,
        temperature: strictRetry ? 0 : 0.2,
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`DeepSeek a répondu ${response.status}${errText ? " : " + errText.slice(0, 200) : ""}`);
    }

    const data = await response.json();

    // Certaines erreurs applicatives DeepSeek arrivent avec un 200 + objet "error".
    if (data?.error?.message) {
      throw new Error(`DeepSeek : ${String(data.error.message).slice(0, 300)}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("DeepSeek a renvoyé une réponse vide.");
    }
    return content;
  } catch (err) {
    // Timeout / annulation.
    if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
      throw new Error("DeepSeek a mis trop de temps à répondre (timeout).");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  // 1. CORS : préflight + mêmes en-têtes que ai-assistant.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée. Utilise POST." }, 405);
  }

  // 2. Rate limit par IP.
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return jsonResponse(
      { error: "Trop de requêtes. Merci de patienter quelques minutes avant de réessayer." },
      429,
    );
  }

  // 3. Lecture + validation du corps de requête.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corps de requête JSON invalide." }, 400);
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonResponse({ error: "Le corps doit être un objet JSON." }, 400);
  }

  const prompt = (body as Record<string, unknown>).prompt;
  if (typeof prompt !== "string" || !prompt.trim()) {
    return jsonResponse({ error: "Le champ 'prompt' (texte) est requis." }, 400);
  }
  if (prompt.length > MAX_INPUT_CHARS) {
    return jsonResponse(
      { error: `Message trop long (maximum ${MAX_INPUT_CHARS} caractères).` },
      400,
    );
  }

  // 4. Appel DeepSeek + validation. On ne renvoie jamais le texte brut du modèle.
  try {
    let payload = tryNormalize(await callDeepSeek(prompt));

    // Une seule nouvelle tentative avec consigne plus stricte.
    if (!payload) {
      payload = tryNormalize(await callDeepSeek(prompt, true));
    }

    // Échec final → message de secours (jamais de 500 brut).
    if (!payload) {
      payload = { type: "chat", message: FALLBACK_MESSAGE };
    }

    return jsonResponse(payload);
  } catch (err) {
    // Gestion d'erreur complète : on log, on renvoie un message exploitable.
    console.error("[chat] Erreur:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ type: "chat", message: FALLBACK_MESSAGE });
  }
});
