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
        ["neuf", "9"], ["nine", "9"],
        // dizaines et au-dela : sans elles, un numero ecrit en toutes lettres passait
        ["dix", "10"], ["ten", "10"],
        ["onze", "11"], ["eleven", "11"],
        ["douze", "12"], ["twelve", "12"],
        ["treize", "13"], ["thirteen", "13"],
        ["quatorze", "14"], ["fourteen", "14"],
        ["quinze", "15"], ["fifteen", "15"],
        ["seize", "16"], ["sixteen", "16"],
        ["dixsept", "17"], ["seventeen", "17"],
        ["dixhuit", "18"], ["eighteen", "18"],
        ["dixneuf", "19"], ["nineteen", "19"],
        ["vingt", "20"], ["twenty", "20"],
        ["trente", "30"], ["thirty", "30"],
        ["quarante", "40"], ["forty", "40"],
        ["cinquante", "50"], ["fifty", "50"],
        ["soixante", "60"], ["sixty", "60"],
        ["seventy", "70"], ["eighty", "80"], ["ninety", "90"]
    ]);

    // systemes de chiffres non latins (arabe, persan, devanagari, bengali, thai)
    const DIGIT_BLOCKS = [0x0660, 0x06F0, 0x0966, 0x09E6, 0x0E50];
    const DIGIT_MAP = {};
    DIGIT_BLOCKS.forEach((base) => {
        for (let i = 0; i < 10; i += 1) DIGIT_MAP[String.fromCodePoint(base + i)] = String(i);
    });
    const NONLATIN_DIGIT_RE = /[\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF\u0E50-\u0E59]/g;

    // dates, heures et quantites : ce ne sont pas des numeros de telephone
    const DATE_RE = /\b[0-3]?\d[\/.-][0-1]?\d[\/.-](?:19|20)\d{2}\b|\b(?:19|20)\d{2}[\/.-][0-1]?\d[\/.-][0-3]?\d\b/g;
    const TIME_RE = /\b\d{1,2}[h:]\d{2}\b/g;
    const UNIT_RE = /\b\d{1,7}\s*(?:kg|kgs|km|cm|mm|g|t|tonnes?|pi[eè]ces?|colis|sacs?|cartons?|palettes?|jours?|semaines?|mois|ans|min|h|pers?|personnes?|places?)\b/g;
    const DEVISE = "gnf|xof|xaf|fcfa|cfa|f cfa|fcf|ngn|ghs|cdf|gmd|sll|lrd|mru|cve|mad|dzd|tnd|egp|kes|tzs|ugx|rwf|bif|etb|sos|sdg|ssp|zmw|mwk|mzn|aoa|zar|lsl|szl|bwp|nad|mga|mur|scr|kmf|djf|ern|lyd|euros?|dollars?|yuans?|renminbi|rmb|naira|cedi|shillings?|ariary|dirham|dinar|livres?|roupies?|pesos?|reais?|kwanza|francs?";
    const MONEY_RE = new RegExp("\\b\\d{1,3}(?:[ \\u00a0.,]\\d{3})+\\s*(?:" + DEVISE + ")?\\b", "gi");
    const CURRENCY_RE = new RegExp("\\b\\d{1,12}\\s*(?:" + DEVISE + ")\\b", "gi");
    const SYMBOL_RE = /(\d|^)\s*(?:euros?|dollars?|[€$£¥₦₵₹₽₺])([^0-9]|$)/g;
    const MULTIPLIER_RE = /\b\d{1,9}\s*(?:millions?|milliards?|milliers?|milles?|k|m)\b/gi;
    const ROUND_RE = /\b[1-9]\d{0,3}0{4,}\b/g;
    const REFERENCE_RE = /\b(reference|ref|suivi|tracking|bordereau)[a-z\s:#-]{0,14}[1-9]\d{8,24}\b/gi;

    function toAsciiDigits(value) {
        return String(value || "").replace(NONLATIN_DIGIT_RE, (char) => DIGIT_MAP[char] || char);
    }

    function termRe(term) {
        const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp("(^|[^a-z0-9])" + esc + "([^a-z0-9]|$)", "i");
    }

    const SOCIAL_COMPACT_TERMS = [
        "whatsapp", "whatsap", "watssap", "whattsap", "wathsapp", "watsap",
        "telegram", "instagram", "snapchat", "facebook", "messenger", "tiktok",
        "wechat", "weixin", "viber", "discord", "linkedin", "skype"
    ];

    const SOCIAL_TERMS = [
        "whatsapp", "wa.me", "telegram", "t.me", "instagram", "insta", "ig",
        "facebook", "fb", "messenger", "snapchat", "snap", "tiktok", "tik tok",
        "twitter", "x/twitter", "discord", "linkedin", "signal"
    ];

    // durcissement apres red-team : lettres substituees, braille, CJK, pseudo
    const LETTER_DIGITS = { o: "0", i: "1", l: "1", s: "5", b: "8", t: "7", g: "6", e: "3", z: "2", a: "4" };
    const LETTER_TOKENS_RE = /\b[oilsbtgeza]\b/gi;
    const LETTERS_RE = /[oilsbtgeza]/g;
    const CONTACT_INTENT_STRICT_RE = /\b(contact|contacter|appel|appelle|appeler|joindre|numero|num|tel|phone|portable|whatsapp|mail|email|pseudo|compte|identifiant|username)\b/i;
    const BRAILLE_RE = /[\u2800-\u28FF]/g;
    const SOCIAL_CJK_RE = /(微信|微訊|电报|電報|纸飞机|脸书|臉書)/;
    const HANDLE_HINT_RE = /\b(pseudo|identifiant|username)\b[a-z ,:'-]{0,25}[0-9]{2,}|\b(pseudo|identifiant|username)\b[a-z '-]{0,25}(underscore|souligne|tiret)/;
    const PLATFORM_LEET_TERMS = [
        "whatsapp", "whatsap", "watsapp", "telegram", "instagram", "snapchat",
        "facebook", "messenger", "tiktok", "wechat", "viber", "discord", "linkedin", "skype"
    ];
    const CYRILLIC_MAP = {
        "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "в": "b",
        "і": "i", "ј": "j", "к": "k", "м": "m", "т": "t", "ԁ": "d", "һ": "h", "ѕ": "s", "ԛ": "q"
    };
    const CYRILLIC_RE = /[аеорсхувіјкмтԁһѕԛ]/g;
    const CHINESE_DIGITS = {
        "〇": "0", "零": "0", "一": "1", "壹": "1", "二": "2", "两": "2", "贰": "2", "三": "3",
        "叁": "3", "四": "4", "肆": "4", "五": "5", "伍": "5", "六": "6", "陆": "6", "七": "7",
        "柒": "7", "八": "8", "捌": "8", "九": "9", "玖": "9", "十": "10", "百": "100", "千": "1000"
    };
    const CHINESE_RE = /[〇零一壹二两贰三叁四肆五伍六陆七柒八捌九玖十百千]/g;

    function collapseDigits(value) {
        let out = String(value || "");
        for (let i = 0; i < 40; i += 1) {
            const next = out.replace(/([0-9])[\s.\-+/()_,]+([0-9])/g, "$1$2");
            if (next === out) break;
            out = next;
        }
        return out;
    }

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
        const noCyrillic = noAccents.replace(CYRILLIC_RE, (char) => CYRILLIC_MAP[char] || char);
        const noCjkDigits = noCyrillic.replace(CHINESE_RE, (char) => CHINESE_DIGITS[char] || char);
        const asciiDigits = toAsciiDigits(noCjkDigits);
        const leet = asciiDigits.replace(/[0134578@$]/g, (char) => LEET_MAP[char] || char);
        const emailCanonical = asciiDigits
            .replace(/\s*(?:\[|\()?\s*(?:arobase|arobaz|aroba|arroba|at|chez)\s*(?:\]|\))?\s*/g, "@")
            .replace(/\s*(?:\[|\()?\s*(?:virgule|punto|punct|pount|point|punt|dot)\s*(?:\]|\))?\s*/g, ".");
        const numberWordsToDigits = asciiDigits.replace(/\b[\p{L}]+\b/gu, (word) => NUMBER_WORDS.get(word) || word);
        const sansChiffresParasites = numberWordsToDigits
            .replace(DATE_RE, " ")
            .replace(TIME_RE, " ")
            .replace(UNIT_RE, " ")
            .replace(MONEY_RE, " ")
            .replace(CURRENCY_RE, " ")
            .replace(SYMBOL_RE, "$1 $2")
            .replace(MULTIPLIER_RE, " ")
            .replace(REFERENCE_RE, " ");
        const numbers = collapseDigits(sansChiffresParasites).replace(ROUND_RE, " ");
        const compactDigits = numbers.replace(/\D+/g, "");

        return {
            raw,
            text: lower,
            ascii: asciiDigits,
            leet,
            emailCanonical,
            numbers,
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

        if (PHONE_RE.test(normalized.numbers)) {
            addFinding(findings, "phone", 100, "block", "Numéro de téléphone détecté.");
        } else if (normalized.compactDigits.length >= 8) {
            addFinding(findings, "phone_compact", 90, "block", "Suite de chiffres assimilable à un numéro détectée.");
        } else if (recentText && combinedNorm.compactDigits.length >= 8) {
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

        const compactAscii = normalized.ascii.replace(/[^a-z0-9]/g, "");
        const socialHit = SOCIAL_TERMS.find((term) => termRe(term).test(normalized.ascii) || termRe(term).test(normalized.leet))
            || SOCIAL_COMPACT_TERMS.find((term) => compactAscii.includes(term));
        if (socialHit) {
            const risk = CONTACT_INTENT_RE.test(normalized.raw) ? 95 : 85;
            addFinding(findings, "social_platform", risk, "block", `Plateforme externe détectée: ${socialHit}.`);
        }

        if (HANDLE_RE.test(normalized.ascii)) {
            const risk = CONTACT_INTENT_RE.test(normalized.raw) ? 90 : 70;
            addFinding(findings, "social_handle", risk, risk >= 80 ? "block" : "warn", "Identifiant social ou pseudo détecté.");
        }

        const brailleCells = (normalized.ascii.match(BRAILLE_RE) || []).length;
        if (brailleCells >= 4) {
            addFinding(findings, "braille", 95, "block", "Écriture braille détectée dans le message.");
        }

        const loneLetters = (normalized.ascii.match(LETTER_TOKENS_RE) || []).length;
        if (loneLetters >= 8) {
            addFinding(findings, "phone_letters", 100, "block", "Chiffres écrits en lettres isolées.");
        } else if (CONTACT_INTENT_STRICT_RE.test(normalized.ascii)) {
            const asLetters = collapseDigits(normalized.numbers.replace(LETTERS_RE, (ch) => LETTER_DIGITS[ch] || ch));
            if (/[0-9]{8,}/.test(asLetters)) {
                addFinding(findings, "phone_letters", 95, "block", "Chiffres écrits en lettres (substitution).");
            }
        }

        const platformLeet = collapseDigits(normalized.ascii
            .replace(/[^a-z0-9]/g, "")
            .replace(/[0134578]/g, (ch) => ({ 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b" })[ch] || ch));
        if (PLATFORM_LEET_TERMS.some((term) => platformLeet.includes(term))) {
            addFinding(findings, "social_platform", 90, "block", "Plateforme externe écrite en leet.");
        }

        if (SOCIAL_CJK_RE.test(normalized.ascii)) {
            addFinding(findings, "social_platform", 90, "block", "Plateforme externe (écriture CJK).");
        }

        if (HANDLE_HINT_RE.test(normalized.ascii)) {
            addFinding(findings, "social_handle", 85, "block", "Pseudonyme ou identifiant annoncé.");
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
