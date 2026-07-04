(() => {
    const INVISIBLE_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00AD]/g;

    const LEET_MAP = {
        "0": "o",
        "1": "i",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "8": "b",
        "@": "a",
        "$": "s"
    };

    const NUMBER_WORDS = new Map([
        ["zero", "0"], ["zéro", "0"], ["o", "0"],
        ["un", "1"], ["une", "1"], ["one", "1"],
        ["deux", "2"], ["two", "2"],
        ["trois", "3"], ["three", "3"],
        ["quatre", "4"], ["four", "4"],
        ["cinq", "5"], ["five", "5"],
        ["six", "6"],
        ["sept", "7"], ["seven", "7"],
        ["huit", "8"], ["eight", "8"],
        ["neuf", "9"], ["nine", "9"]
    ]);

    const SOCIAL_TERMS = [
        "whatsapp", "wa.me", "telegram", "t.me", "instagram", "insta", "ig",
        "facebook", "fb", "messenger", "snapchat", "snap", "tiktok", "tik tok",
        "twitter", "x/twitter", "discord", "linkedin", "signal"
    ];

    const CONTACT_INTENT_RE = /\b(contact|contacte|appel|appelle|ecris|écris|message|mp|dm|prive|privé|cherche|recherche|trouve|ajoute|ajoutes|envoie|envoies|passe|ailleurs|numero|numéro|tel|t[eé]l|phone|mail|email|courriel)\b/i;
    const EMAIL_OBFUSCATION_RE = /\b(arobase|chez|\bat\b|\[at\]|\(at\)|point|\bdot\b|\[dot\]|\(dot\))\b/i;
    const URL_RE = /(?:https?:\/\/|www\.|[a-z0-9][a-z0-9-]{1,}\s*(?:\.| point | dot )\s*(?:com|fr|net|org|io|co|me|app|dev|ci|sn|cm|bj)\b)/i;
    const EMAIL_RE = /[a-z0-9._%+\-]{2,}\s*@\s*[a-z0-9.\-]{2,}\s*\.[a-z]{2,}/i;
    const HANDLE_RE = /(^|\s)[@#][a-z0-9._-]{3,}/i;
    const PHONE_RE = /(?:\+|00)?\d(?:[\s.\-_/()]*\d){7,14}/;

    function normalizeText(input = "") {
        const raw = String(input || "");
        const withoutInvisible = raw.normalize("NFKC").replace(INVISIBLE_RE, "");
        const lower = withoutInvisible.toLowerCase();
        const noAccents = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const leet = noAccents.replace(/[0134578@$]/g, (char) => LEET_MAP[char] || char);
        const emailCanonical = noAccents
            .replace(/\s*(?:\[|\()?\s*(?:arobase|at|chez)\s*(?:\]|\))?\s*/g, "@")
            .replace(/\s*(?:\[|\()?\s*(?:point|dot)\s*(?:\]|\))?\s*/g, ".");
        const numberWordsToDigits = noAccents.replace(/\b[\p{L}]+\b/gu, (word) => NUMBER_WORDS.get(word) || word);
        const compactDigits = numberWordsToDigits.replace(/\D+/g, "");

        return {
            raw,
            text: lower,
            ascii: noAccents,
            leet,
            emailCanonical,
            numberWordsToDigits,
            compactDigits,
            hadInvisibleChars: raw !== withoutInvisible
        };
    }

    function addFinding(findings, type, risk, action, summary) {
        findings.push({ type, risk, action, summary });
    }

    function evaluate(input = "", options = {}) {
        const normalized = normalizeText(input);
        const recentText = String(options.recentText || "");
        const combined = recentText ? `${recentText}\n${input}` : input;
        const combinedNorm = normalizeText(combined);
        const findings = [];

        if (normalized.hadInvisibleChars) {
            addFinding(findings, "invisible_chars", 80, "block", "Caractères invisibles détectés dans le message.");
        }

        if (PHONE_RE.test(normalized.numberWordsToDigits) || PHONE_RE.test(normalized.raw)) {
            addFinding(findings, "phone", 100, "block", "Numéro de téléphone détecté.");
        } else if (normalized.compactDigits.length >= 8 && normalized.compactDigits.length <= 15) {
            addFinding(findings, "phone_compact", 90, "block", "Suite de chiffres assimilable à un numéro détectée.");
        } else if (combinedNorm.compactDigits.length >= 8 && combinedNorm.compactDigits.length <= 15 && recentText) {
            addFinding(findings, "phone_split", 95, "block", "Numéro probablement fragmenté sur plusieurs messages.");
        }

        if (EMAIL_RE.test(normalized.emailCanonical) || EMAIL_RE.test(normalized.ascii)) {
            addFinding(findings, "email", 100, "block", "Adresse e-mail détectée.");
        } else if (EMAIL_OBFUSCATION_RE.test(normalized.raw) && CONTACT_INTENT_RE.test(normalized.raw)) {
            addFinding(findings, "email_obfuscated", 85, "block", "Adresse e-mail obfusquée probable.");
        }

        if (URL_RE.test(normalized.emailCanonical) || URL_RE.test(normalized.ascii)) {
            addFinding(findings, "external_link", 95, "block", "Lien externe ou domaine détecté.");
        }

        const socialHit = SOCIAL_TERMS.find((term) => normalized.ascii.includes(term) || normalized.leet.includes(term));
        if (socialHit) {
            const risk = CONTACT_INTENT_RE.test(normalized.raw) ? 95 : 85;
            addFinding(findings, "social_platform", risk, "block", `Plateforme externe détectée: ${socialHit}.`);
        }

        if (HANDLE_RE.test(normalized.ascii)) {
            const risk = CONTACT_INTENT_RE.test(normalized.raw) ? 90 : 70;
            addFinding(findings, "social_handle", risk, risk >= 80 ? "block" : "warn", "Identifiant social ou pseudo détecté.");
        }

        if (normalized.leet !== normalized.ascii && CONTACT_INTENT_RE.test(normalized.leet) && !CONTACT_INTENT_RE.test(normalized.ascii)) {
            addFinding(findings, "leet_contact", 80, "block", "Mot de contact masqué par leetspeak détecté.");
        }

        const maxRisk = findings.reduce((max, item) => Math.max(max, item.risk), 0);
        const action = findings.some((item) => item.action === "block") || maxRisk >= 80
            ? "block"
            : findings.length
                ? "warn"
                : "allow";

        return {
            allowed: action !== "block",
            action,
            risk: maxRisk,
            riskLevel: maxRisk >= 80 ? "high" : maxRisk >= 50 ? "medium" : "low",
            flags: findings.map((item) => item.type),
            findings,
            normalized: normalized.ascii,
            summary: findings.length
                ? findings.map((item) => item.summary).join(" ")
                : "Aucun contournement anti-contact détecté."
        };
    }

    window.CCAntiContact = {
        evaluate,
        normalizeText
    };
})();
