const axios = require("axios");

const FLW_BASE_URL = "https://api.flutterwave.com/v3";
const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || "";

// Mapping : pays -> monnaie locale Flutterwave
const COUNTRY_CURRENCY_MAP = {
    "Côte d'Ivoire": "XOF", "Bénin": "XOF", "Sénégal": "XOF", "Mali": "XOF",
    "Burkina Faso": "XOF", "Niger": "XOF", "Togo": "XOF", "Guinée-Bissau": "XOF",
    "Cameroun": "XAF", "Gabon": "XAF", "Tchad": "XAF", "Congo": "XAF",
    "Ghana": "GHS", "Nigeria": "NGN", "Kenya": "KES", "Uganda": "UGX",
    "Tanzanie": "TZS", "Rwanda": "RWF", "Zambie": "ZMW", "Afrique du Sud": "ZAR",
    "Mozambique": "MZN",
    // Default pour reste Afrique
    "default": "XOF"
};

// Mapping : pays -> code pays ISO 2 lettres (requis par Flutterwave)
const COUNTRY_CODE_MAP = {
    "Côte d'Ivoire": "CI", "Bénin": "BJ", "Sénégal": "SN", "Mali": "ML",
    "Burkina Faso": "BF", "Niger": "NE", "Togo": "TG", "Guinée-Bissau": "GW",
    "Cameroun": "CM", "Gabon": "GA", "Tchad": "TD", "Congo": "CG",
    "Ghana": "GH", "Nigeria": "NG", "Kenya": "KE", "Uganda": "UG",
    "Tanzanie": "TZ", "Rwanda": "RW", "Zambie": "ZM", "Afrique du Sud": "ZA",
    "France": "FR", "Chine": "CN", "default": "CI"
};

/**
 * Obtient la devise Flutterwave pour un pays donné.
 */
function getCurrencyForCountry(country) {
    return COUNTRY_CURRENCY_MAP[country] || COUNTRY_CURRENCY_MAP["default"];
}

/**
 * Obtient le code ISO du pays.
 */
function getCountryCode(country) {
    return COUNTRY_CODE_MAP[country] || COUNTRY_CODE_MAP["default"];
}

/**
 * Convertit un montant EUR en devise locale via les taux de secours.
 */
const EUR_RATES = {
    XOF: 655.957, XAF: 655.957, GHS: 14.2, NGN: 1530, KES: 140,
    UGX: 4100, TZS: 2800, RWF: 1380, ZMW: 28, ZAR: 20, MZN: 70, EUR: 1
};
function convertToLocalCurrency(amountEUR, currency) {
    const rate = EUR_RATES[currency] || 1;
    return Math.ceil(amountEUR * rate);
}

/**
 * Initie un paiement Flutterwave et retourne un lien de paiement.
 * @param {object} params
 * @param {number} params.amountEUR - Montant en EUR à payer
 * @param {string} params.customerEmail
 * @param {string} params.customerName
 * @param {string} params.customerPhone
 * @param {string} params.customerCountry
 * @param {string} params.txRef - Référence unique (ex: "CC-RES-1-1713234567")
 * @param {string} params.redirectUrl - URL de retour après paiement
 * @param {string} params.description
 */
async function initiatePayment({ amountEUR, customerEmail, customerName, customerPhone, customerCountry, txRef, redirectUrl, description }) {
    if (!FLW_SECRET) throw new Error("FLUTTERWAVE_SECRET_KEY manquante dans .env");

    const currency = getCurrencyForCountry(customerCountry);
    const amount = convertToLocalCurrency(amountEUR, currency);
    const countryCode = getCountryCode(customerCountry);

    const payload = {
        tx_ref: txRef,
        amount: amount,
        currency: currency,
        redirect_url: redirectUrl,
        payment_options: "card,mobilemoneysn,mobilemoneyci,mobilemoneygh,mobilemoneyrw,mobilemoneyug,mobilemoneyzm,mobilemoneytz",
        customer: {
            email: customerEmail || "client@colisconnect.com",
            name: customerName || "Client ColisConnect",
            phonenumber: customerPhone || ""
        },
        customizations: {
            title: "ColisConnect",
            description: description || "Commission de transport sécurisée",
            logo: "https://your-cdn/colisconnect-logo.png"
        },
        meta: {
            source: "colisconnect",
            country: countryCode
        }
    };

    try {
        const response = await axios.post(`${FLW_BASE_URL}/payments`, payload, {
            headers: {
                Authorization: `Bearer ${FLW_SECRET}`,
                "Content-Type": "application/json"
            },
            timeout: 15000
        });

        if (response.data.status === "success") {
            return {
                ok: true,
                paymentLink: response.data.data.link,
                txRef,
                amount,
                currency
            };
        } else {
            throw new Error(response.data.message || "Flutterwave: réponse inattendue");
        }
    } catch (err) {
        const msg = err.response?.data?.message || err.message;
        console.error("[Flutterwave] Erreur initiation:", msg);
        throw new Error(`Erreur passerelle de paiement: ${msg}`);
    }
}

/**
 * Vérifie un paiement Flutterwave par son ID de transaction.
 * Retourne { status, amount, currency, txRef }
 */
async function verifyPayment(transactionId) {
    if (!FLW_SECRET) throw new Error("FLUTTERWAVE_SECRET_KEY manquante dans .env");

    try {
        const response = await axios.get(`${FLW_BASE_URL}/transactions/${transactionId}/verify`, {
            headers: {
                Authorization: `Bearer ${FLW_SECRET}`,
                "Content-Type": "application/json"
            },
            timeout: 10000
        });

        const data = response.data?.data;
        if (!data) throw new Error("Données de vérification vides");

        return {
            ok: data.status === "successful",
            status: data.status,
            amount: data.amount,
            currency: data.currency,
            txRef: data.tx_ref,
            transactionId: data.id,
            customerEmail: data.customer?.email
        };
    } catch (err) {
        const msg = err.response?.data?.message || err.message;
        console.error("[Flutterwave] Erreur vérification:", msg);
        throw new Error(`Erreur vérification paiement: ${msg}`);
    }
}

/**
 * Vérifie la signature HMAC d'un webhook Flutterwave.
 */
function verifyWebhookSignature(requestBody, receivedHash) {
    const crypto = require("crypto");
    const expectedHash = crypto
        .createHmac("sha256", FLW_SECRET)
        .update(JSON.stringify(requestBody))
        .digest("hex");
    return expectedHash === receivedHash;
}

module.exports = {
    initiatePayment,
    verifyPayment,
    verifyWebhookSignature,
    getCurrencyForCountry,
    convertToLocalCurrency
};
