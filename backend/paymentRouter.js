// ====== UNIVERSAL PAYMENT REGISTRY (DATA-DRIVEN) ======
// Ce registre définit quel agrégateur gère quel pays et quelles méthodes il propose.

const { getCurrencyByCountry } = require('./currencyRegistry');
const geniusPay = require('./geniusPayService');

/**
 * Normalisation robuste (minuscules, retrait des accents, trim)
 */
function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

const REGISTRY = {
    // --- ZONE GENIUS PAY (Liste Officielle Validée) ---
    "cote d'ivoire": {
        aggregator: "Genius Pay",
        currency: "XOF",
        methods: [
            { id: "wave_ci", name: "Wave", type: "mobile_money" },
            { id: "orange_ci", name: "Orange Money", type: "mobile_money" },
            { id: "mtn_ci", name: "MTN Mobile Money", type: "mobile_money" },
            { id: "moov_ci", name: "Moov Money", type: "mobile_money" }
        ]
    },
    "senegal": {
        aggregator: "Genius Pay",
        currency: "XOF",
        methods: [
            { id: "orange_sn", name: "Orange Money", type: "mobile_money" },
            { id: "wave_sn", name: "Wave", type: "mobile_money" },
            { id: "free_sn", name: "Free Money", type: "mobile_money" }
        ]
    },
    "benin": {
        aggregator: "Genius Pay",
        currency: "XOF",
        methods: [
            { id: "mtn_bj", name: "MTN Mobile Money", type: "mobile_money" },
            { id: "moov_bj", name: "Moov Money", type: "mobile_money" }
        ]
    },
    "cameroun": {
        aggregator: "Genius Pay",
        currency: "XAF",
        methods: [
            { id: "mtn_cm", name: "MTN Mobile Money", type: "mobile_money" },
            { id: "orange_cm", name: "Orange Money", type: "mobile_money" }
        ]
    },
    "republique democratique du congo": {
        aggregator: "Genius Pay",
        currency: "CDF",
        methods: [
            { id: "mpesa_cd", name: "M-Pesa", type: "mobile_money" },
            { id: "orange_cd", name: "Orange Money", type: "mobile_money" },
            { id: "airtel_cd", name: "Airtel Money", type: "mobile_money" }
        ]
    },
    "congo": {
        aggregator: "Genius Pay",
        currency: "XAF",
        methods: [
            { id: "mtn_cg", name: "MTN Mobile Money", type: "mobile_money" },
            { id: "airtel_cg", name: "Airtel Money", type: "mobile_money" }
        ]
    },
    "gabon": {
        aggregator: "Genius Pay",
        currency: "XAF",
        methods: [
            { id: "airtel_ga", name: "Airtel Money", type: "mobile_money" },
            { id: "moov_ga", name: "Moov Money", type: "mobile_money" }
        ]
    },
    "kenya": {
        aggregator: "Genius Pay",
        currency: "KES",
        methods: [
            { id: "mpesa_ke", name: "M-Pesa", type: "mobile_money" },
            { id: "airtel_ke", name: "Airtel Money", type: "mobile_money" }
        ]
    },
    "ouganda": {
        aggregator: "Genius Pay",
        currency: "UGX",
        methods: [
            { id: "mtn_ug", name: "MTN Mobile Money", type: "mobile_money" },
            { id: "airtel_ug", name: "Airtel Money", type: "mobile_money" }
        ]
    },
    "rwanda": {
        aggregator: "Genius Pay",
        currency: "RWF",
        methods: [
            { id: "mtn_rw", name: "MTN Mobile Money", type: "mobile_money" },
            { id: "airtel_rw", name: "Airtel Money", type: "mobile_money" }
        ]
    },
    "zambie": {
        aggregator: "Genius Pay",
        currency: "ZMW",
        methods: [
            { id: "mtn_zm", name: "MTN Mobile Money", type: "mobile_money" },
            { id: "airtel_zm", name: "Airtel Money", type: "mobile_money" },
            { id: "zamtel_zm", name: "Zamtel Kwacha", type: "mobile_money" }
        ]
    },
    "sierra leone": {
        aggregator: "Genius Pay",
        currency: "SLE",
        methods: [
            { id: "orange_sl", name: "Orange Money", type: "mobile_money" },
            { id: "afrimoney_sl", name: "Afrimoney", type: "mobile_money" }
        ]
    },

    // --- ZONE PAYSTACK (Reste du monde / Secours) ---
    "nigeria": {
        aggregator: "Paystack",
        currency: "NGN",
        methods: [
            { id: "bank_transfer_ng", name: "Bank Transfer", type: "bank" },
            { id: "ussd_ng", name: "USSD", type: "ussd" },
            { id: "card_ng", name: "Debit Card", type: "card" }
        ]
    },
    "ghana": {
        aggregator: "Paystack",
        currency: "GHS",
        methods: [
            { id: "mtn_gh", name: "MTN Mobile Money", type: "mobile_money" },
            { id: "vodafone_gh", name: "Vodafone Cash", type: "mobile_money" }
        ]
    }
};

/**
 * Retourne les méthodes de paiement pour un pays donné.
 */
function getAvailableMethods(countryName) {
    const raw = normalizeText(countryName);
    const entry = Object.entries(REGISTRY).find(([key]) => raw.includes(key) || key.includes(raw));

    if (entry) {
        return {
            status: "supported",
            aggregator: entry[1].aggregator,
            currency: entry[1].currency,
            methods: entry[1].methods
        };
    }

    // FALLBACK UNIVERSEL via Genius Pay (Grâce à l'intégration Stripe)
    return {
        status: "supported",
        aggregator: "Genius Pay",
        currency: "XOF", // Genius Pay convertira
        message: "Paiement international sécurisé disponible.",
        methods: [
            { id: "stripe", name: "Carte Bancaire / International", type: "card" },
            { id: "mobile_money", name: "Mobile Money", type: "mobile_money" }
        ]
    };
}

/**
 * Routeur de Paiement Intelligent
 */
async function initiateSmartPayment({ reservationId, departureCountry, amountEUR, customerEmail, customerName, phoneNumber, travelerPayoutNumber, callbackUrl, userId }) {
    const nativeCurrency = getCurrencyByCountry(departureCountry);
    const methodsInfo = getAvailableMethods(departureCountry);

    console.log(`[SmartPayment] Initiation pour ${departureCountry} via ${methodsInfo.aggregator}`);

    // LOGIQUE UNIVERSELLE GENIUS PAY (Gère désormais Stripe pour les autres pays)
    if (methodsInfo.aggregator === "Genius Pay" || !methodsInfo.aggregator) {
        const finalAmount = 400; // FIXE POUR TEST LIVE (demandé par l'utilisateur)
        const commissionRate = 0.12; // 12% pour la plateforme
        const commissionAmount = Math.round(finalAmount * commissionRate);
        const travelerAmount = finalAmount - commissionAmount;

        const result = await geniusPay.initiatePayment({
            amount: finalAmount,
            description: `ColisConnect Réservation #${reservationId}`,
            phoneNumber: phoneNumber,
            email: customerEmail,
            orderId: reservationId,
            userId: userId,
            redirectUrl: callbackUrl,
            metadata: {
                reservationId,
                travelerPayoutNumber: travelerPayoutNumber,
                payoutAmount: travelerAmount,
                commissionAmount: commissionAmount,
                country: departureCountry
            }
        });

        if (result.success) {
            return { paymentLink: result.paymentUrl, provider: 'Genius Pay', currency: 'XOF', amount: finalAmount };
        }
    }

    // Cas spécifique Paystack (Nigeria/Ghana)
    if (methodsInfo.aggregator === "Paystack") {
        // ... (Si on veut implémenter un appel direct Paystack plus tard)
    }

    throw new Error(`Paiement automatique non disponible pour ${departureCountry}.`);
}

module.exports = { initiateSmartPayment, getAvailableMethods };
