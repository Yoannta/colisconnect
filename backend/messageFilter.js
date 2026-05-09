/**
 * messageFilter.js — ColisConnect Anti-Leak Message Filter
 * Detects attempts to share personal contact info in chat messages.
 */

// Numbers written as words (FR + EN)
const WORD_DIGITS = "(zero|z[eé]ro|un|deux|trois|quatre|cinq|six|sept|huit|neuf|one|two|three|four|five|six|seven|eight|nine)";

// Separator patterns: space, dash, dot, underscore, parenthesis or combinations
const SEP = "[\\s\\-\\.\\(\\)_/]*";

// ─── Phone Number Patterns ───────────────────────────────────────────────────
const PHONE_PATTERNS = [
    // International prefix + digits: +225 07 xx xx xx, +33 6 xx xx xx xx
    /(?:\+|00)\s*\d{1,3}[\s\-\.]?\d{1,4}[\s\-\.]?\d{1,4}[\s\-\.]?\d{1,9}/,
    // African formats: 07 xx xx xx xx (starts with 0, 8-10 digits)
    /\b0\d[\s\-\.]?\d{2}[\s\-\.]?\d{2}[\s\-\.]?\d{2}[\s\-\.]?\d{0,2}\b/,
    // Compact 8+ digit sequences (no word context to avoid false positives)
    /\b\d{8,12}\b/,
    // Words: zero sept un deux...
    new RegExp(WORD_DIGITS + "(?:" + SEP + WORD_DIGITS + "){5,}", "i"),
    // Mixed: 07 un deux trois quatre
    /\b\d[\s\-]?(?:zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf)(?:[\s\-](?:zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf)){3,}/i,
    // Obfuscated with separators: 0-7-0-1-2-3...
    /\b(?:\d[\s\-\._]{0,2}){8,}/,
];

// ─── Email Patterns ──────────────────────────────────────────────────────────
const EMAIL_PATTERNS = [
    // Standard email
    /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i,
    // Obfuscated: name[at]domain(dot)com, name (at) domain
    /[a-z0-9._%+\-]+\s*[\[(]at[\])\s]\s*[a-z0-9.\-]+\s*[\[(]dot[\])\s]\s*[a-z]{2,}/i,
    // "mon email est nom arobase gmail"
    /\barobase\b/i,
    // Gmail / Yahoo / Hotmail / Outlook mention with a username
    /[a-z0-9._%+\-]{3,}\s*(?:sur\s*|at\s*)?(?:gmail|yahoo|hotmail|outlook|icloud|live)\b/i,
];

// ─── Messaging App Patterns ─────────────────────────────────────────────────
const MESSAGING_APP_PATTERNS = [
    // WhatsApp links and mentions
    /wa\.me\//i,
    /whatsapp/i,
    /wh?at?s[-\s]?app/i,
    /\bwsp\b/i,
    /\bwasap\b/i,
    // Telegram
    /t\.me\//i,
    /telegram/i,
    /t[eé]l[eé]gram/i,
    // Signal
    /\bsignal\b/i,
    // Skype
    /\bskype\b/i,
    // Viber
    /\bviber\b/i,
    // IMO
    /\bimo\b/i,
    // WeChat
    /\bwechat\b/i,
];

// ─── Social Network Patterns ─────────────────────────────────────────────────
const SOCIAL_PATTERNS = [
    // Direct @username mentions (3+ chars to avoid false positives like @voir, @moi)
    /@[a-z0-9._]{3,}/i,
    // Explicit platform mentions with URLs
    /(?:facebook|fb|instagram|insta|tiktok|snapchat|twitter|x\.com|linkedin|youtube)\s*\.?\s*com/i,
    // "mon facebook / mon insta" pattern
    /\b(?:mon|ma|my|sur)\s+(?:facebook|fb|insta(?:gram)?|snap(?:chat)?|tiktok|twitter)\b/i,
    // Links with http / www
    /https?:\/\//i,
    /\bwww\./i,
];

// ─── Combined detector ───────────────────────────────────────────────────────
const ALL_PATTERNS = [
    { type: "phone_number", patterns: PHONE_PATTERNS },
    { type: "email_address", patterns: EMAIL_PATTERNS },
    { type: "messaging_app", patterns: MESSAGING_APP_PATTERNS },
    { type: "social_network", patterns: SOCIAL_PATTERNS },
];

/**
 * Analyze a message text for contact info leakage.
 * @param {string} text - The message content to check.
 * @returns {{ blocked: boolean, type: string|null, hint: string|null }}
 */
function analyzeMessage(text) {
    if (!text || typeof text !== "string") return { blocked: false, type: null, hint: null };

    const normalized = text.trim().toLowerCase();

    for (const group of ALL_PATTERNS) {
        for (const pattern of group.patterns) {
            if (pattern.test(normalized)) {
                return {
                    blocked: true,
                    type: group.type,
                    hint: `Contenu bloqué : tentative de partage de coordonnées (${group.type}).`,
                };
            }
        }
    }

    return { blocked: false, type: null, hint: null };
}

/**
 * Returns a simplified regex list for frontend (client-side) validation.
 * These are less precise (to keep the JS light) but give a fast first-pass UX check.
 */
function getFrontendPatterns() {
    return [
        // Phone-like (8+ digits with optional separators)
        /(?:\+|00)?\d[\d\s\-\.]{7,}/,
        // Email
        /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i,
        // WhatsApp / Telegram
        /whatsapp|wa\.me|telegram|t\.me/i,
        // Social handle
        /@[a-z0-9._]{3,}/i,
        // URL
        /https?:\/\/|www\./i,
        // Social platforms
        /facebook|instagram|tiktok|snapchat|twitter/i,
    ];
}

module.exports = { analyzeMessage, getFrontendPatterns, checkSuspiciousWords };

// ─── Passive Suspicious Word Detector ────────────────────────────────────────
// NE BLOQUE PAS le message. Déclenche uniquement une alerte IA si match.
// RÈGLE : chaque pattern doit avoir une probabilité HAUTE de fraude.
// Mots courants ou ambigus (voir, bien, numéro de vol, montant...) = EXCLUS.

const SUSPICIOUS_PATTERNS = [
    // ── Chiffres écrits en lettres (rarement utilisés, souvent pour passer les filtres)
    // Exclut: un, deux, dix, onze, douze (trop courants dans la vie normale)
    {
        reason: "chiffre_en_lettre_suspect",
        // Contexte obligatoire : doit être précédé/suivi de séparateurs pour éviter
        // "vingtaine", "treizième" (noms composés légitimes)
        pattern: /\b(trois|quatre|cinq|six|sept|huit|neuf|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf|vingt|trente|quarante|cinquante|soixante|quatre-vingt|cent)\b/i
    },
    // ── Intention de contact direct (avec possessif pour réduire faux positifs)
    {
        reason: "intention_contact_direct",
        pattern: /\b(mon\s+num[eé]ro|mon\s+num\b|mon\s+contact|mon\s+id\b|mon\s+identifiant)\b/i
    },
    // ── Invitation à sortir de la plateforme
    {
        reason: "contournement_plateforme",
        pattern: /\b(hors\s+(de\s+la\s+)?plateforme|en\s+dehors|autrement\s+(dit|qu'ici)|r[eé]gler\s+(en\s+)?dehors|payer\s+(en\s+)?dehors|paiement\s+(direct|perso|priv[eé])|virement\s+(direct|perso|priv[eé]))\b/i
    },
    // ── Demande de contact vocal/téléphonique
    {
        reason: "demande_contact_verbal",
        pattern: /\b(appelle[- ]?moi|contacte[- ]?moi|[eé]cris[- ]?moi|join\s+me|rejoins[- ]?moi|appel\s+moi)\b/i
    },
    // ── Systèmes de paiement mobile africains (hors plateforme)
    {
        reason: "paiement_mobile_externe",
        pattern: /\b(orange\s*money|mobile\s*money|momo\b|flooz\b|moov\s*money|wave\b|airtel\s*money|m-?pesa|payer\s+cash|en\s+cash)\b/i
    },
    // ── Tentatives d'obfuscation de ponctuation (pour dissimuler un email/numéro)
    {
        reason: "obfuscation_ponctuation",
        pattern: /\b(arobase|ar[o0]base|po[i1]nt\s+virgule|ti?ret|p[o0][i1]nt)\b/i
    },
];

/**
 * Vérifie si un message contient des mots suspects (mais pas bloqués).
 * @param {string} text - Contenu du message
 * @returns {{ suspicious: boolean, reason: string|null }}
 */
function checkSuspiciousWords(text) {
    if (!text || typeof text !== "string") return { suspicious: false, reason: null };
    const normalized = text.trim().toLowerCase();
    for (const { reason, pattern } of SUSPICIOUS_PATTERNS) {
        if (pattern.test(normalized)) {
            return { suspicious: true, reason };
        }
    }
    return { suspicious: false, reason: null };
}

