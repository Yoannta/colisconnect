const axios = require("axios");

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_SECRET = process.env.Paystack_SECRET_KEY || "";

/**
 * Initie une transaction Paystack et retourne un lien de paiement.
 * @param {object} params
 * @param {number} params.amountEUR - Montant en EUR à payer (sera converti en XOF)
 * @param {string} params.email - Email du client
 * @param {string} params.reference - Référence unique (ex: "CC-RES-1-1713234567")
 * @param {string} params.callbackUrl - URL de retour après paiement
 * @param {object} params.metadata - Données supplémentaires (réservation ID, etc.)
 */
async function initiateTransaction({ amountEUR, email, reference, callbackUrl, metadata }) {
    if (!PAYSTACK_SECRET) throw new Error("Paystack_SECRET_KEY manquante dans .env");

    // Conversion approximative fixe pour XOF (CFA) - 1 EUR = 655.957 XOF
    // Note: On pourrait plus tard utiliser une API de taux réels
    const amountXOF = Math.ceil(amountEUR * 655.957);

    // Règle Paystack : multiplier par 100 même pour XOF (qui n'a pas de sous-unité)
    const amountInSmallestUnit = amountXOF * 100;

    const payload = {
        email,
        amount: amountInSmallestUnit,
        currency: "XOF",
        reference,
        callback_url: callbackUrl,
        metadata: {
            ...metadata,
            custom_fields: [
                {
                    display_name: "Service",
                    variable_name: "service",
                    value: "ColisConnect Transport Service"
                }
            ]
        },
        channels: ['card', 'mobile_money'] // Pour activer Wave, Orange, MTN en Côte d'Ivoire
    };

    try {
        const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, payload, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
                "Content-Type": "application/json"
            }
        });

        if (response.data.status) {
            return {
                ok: true,
                authorizationUrl: response.data.data.authorization_url,
                accessCode: response.data.data.access_code,
                reference
            };
        } else {
            throw new Error(response.data.message || "Erreur Paystack inconnue");
        }
    } catch (err) {
        const msg = err.response?.data?.message || err.message;
        console.error("[Paystack] Erreur initiation:", msg);
        throw new Error(`Erreur initiation paiement: ${msg}`);
    }
}

/**
 * Vérifie une transaction Paystack par sa référence.
 */
async function verifyTransaction(reference) {
    if (!PAYSTACK_SECRET) throw new Error("Paystack_SECRET_KEY manquante dans .env");

    try {
        const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`
            }
        });

        const data = response.data?.data;
        if (!data) throw new Error("Données de vérification vides");

        return {
            ok: data.status === "success",
            status: data.status,
            amount: data.amount / 100, // Retour en Francs
            currency: data.currency,
            reference: data.reference,
            customerEmail: data.customer?.email
        };
    } catch (err) {
        const msg = err.response?.data?.message || err.message;
        console.error("[Paystack] Erreur vérification:", msg);
        throw new Error(`Erreur vérification: ${msg}`);
    }
}

/**
 * Vérifie la signature HMAC d'un webhook Paystack.
 */
function verifyWebhookSignature(requestBody, receivedSignature) {
    const crypto = require("crypto");
    const hash = crypto
        .createHmac("sha512", PAYSTACK_SECRET)
        .update(JSON.stringify(requestBody))
        .digest("hex");
    return hash === receivedSignature;
}

module.exports = {
    initiateTransaction,
    verifyTransaction,
    verifyWebhookSignature
};
