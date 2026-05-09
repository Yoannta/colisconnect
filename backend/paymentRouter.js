// ====== UNIVERSAL PAYMENT REGISTRY (DATA-DRIVEN) ======
// Ce registre définit quel agrégateur gère quel pays et quelles méthodes il propose.

const { getCurrencyByCountry } = require('./currencyRegistry');
const fedapay = require('./fedapayService');
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
    // --- ZONE FEDAPAY (Afrique Francophone) ---
    "benin": {
        aggregator: "FedaPay",
        currency: "XOF",
        methods: [
            { id: "mtn_bj", name: "MTN Mobile Money", type: "mobile_money" },
            { id: "moov_bj", name: "Moov Money", type: "mobile_money" }
        ]
    },
    "togo": {
        aggregator: "FedaPay",
        currency: "XOF",
        methods: [
            { id: "tmoney_tg", name: "T-Money", type: "mobile_money" },
            { id: "moov_tg", name: "Moov Money", type: "mobile_money" }
        ]
    },
    "senegal": {
        aggregator: "FedaPay",
        currency: "XOF",
        methods: [
            { id: "orange_sn", name: "Orange Money", type: "mobile_money" },
            { id: "wave_sn", name: "Wave", type: "mobile_money" },
            { id: "free_sn", name: "Free Money", type: "mobile_money" }
        ]
    },
    "niger": {
        aggregator: "FedaPay",
        currency: "XOF",
        methods: [
            { id: "moov_ne", name: "Moov Money", type: "mobile_money" },
            { id: "airtel_ne", name: "Airtel Money", type: "mobile_money" }
        ]
    },
    "cameroun": {
        aggregator: "FedaPay",
        currency: "XAF",
        methods: [
            { id: "mtn_cm", name: "MTN Mobile Money", type: "mobile_money" },
            { id: "orange_cm", name: "Orange Money", type: "mobile_money" }
        ]
    },

    // --- ZONE GENIUS PAY (Côte d'Ivoire Prioritaire) ---
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

    // --- ZONE PAYSTACK (Reste de l'Afrique) ---
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

    return {
        status: "fallback",
        aggregator: null,
        message: "Paiement manuel recommandé.",
        methods: [
            { id: "bank_transfer", name: "Virement Bancaire", type: "manual" },
            { id: "cash_pickup", name: "Cash / Main à main", type: "manual" }
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

    // LOGIQUE GENIUS PAY
    if (methodsInfo.aggregator === "Genius Pay") {
        const finalAmount = Math.round(amountEUR * 655.957);
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
            redirectUrl: callbackUrl, // Ajout de l'URL de redirection
            metadata: {
                reservationId,
                travelerPayoutNumber: travelerPayoutNumber,
                payoutAmount: travelerAmount,
                commissionAmount: commissionAmount
            }
        });

        if (result.success) {
            return { paymentLink: result.paymentUrl, provider: 'Genius Pay', currency: 'XOF', amount: finalAmount };
        }
    }

    // LOGIQUE FEDAPAY
    if (nativeCurrency === 'XOF' || nativeCurrency === 'XAF') {
        const finalAmount = Math.round(amountEUR * 655.957);
        const link = await fedapay.createFedaPayLink({
            amount: finalAmount,
            description: `Commission ColisConnect #${reservationId}`,
            customerEmail,
            customerName,
            callbackUrl
        });
        return { paymentLink: link, provider: 'FedaPay', currency: nativeCurrency, amount: finalAmount };
    }

    throw new Error(`Paiement automatique non disponible pour ${departureCountry}.`);
}

module.exports = { initiateSmartPayment, getAvailableMethods };
