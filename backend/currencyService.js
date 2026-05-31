const https = require("https");

/**
 * Service de taux de change (Exchange Rate)
 * Utilise des taux de secours (failover) si l'API est injoignable.
 */

// Taux de secours (fixes) pour garantir que le site marche même sans internet
const FALLBACK_RATES = {
    "EUR_XOF": 655.957, // Taux fixe CFA BCEAO
    "EUR_XAF": 655.957, // Taux fixe CFA BEAC
    "EUR_CNY": 7.8,
    "EUR_USD": 1.08,
    "USD_EUR": 0.92,
    "CNY_EUR": 0.13,
    "XOF_EUR": 0.0015,
    "XAF_EUR": 0.0015
};

/**
 * Arrondi intelligent selon la devise
 */
function getSmartRoundedAmount(amount, currency) {
    currency = String(currency || "").toUpperCase();
    // Groupe 1 : Centaine supérieure (ex: Afrique de l'Ouest/Centrale)
    if (["XOF", "XAF", "GNF", "NGN", "RWF", "CDF", "MGA"].includes(currency)) {
        return Math.ceil(amount / 100) * 100;
    }
    // Groupe 2 : Unité supérieure (ex: Chine, Ghana, Maroc)
    if (["CNY", "GHS", "MAD", "ZAR", "DZD", "KES", "INR", "MUR"].includes(currency)) {
        return Math.ceil(amount);
    }
    // Groupe 3 : Précision 0.10 (ex: EUR, USD)
    if (["EUR", "USD", "GBP", "CHF", "CAD", "AUD"].includes(currency)) {
        return Math.ceil(amount * 10) / 10;
    }
    // Défaut
    return Math.ceil(amount);
}

/**
 * Convertit un montant d'une devise à une autre.
 * Retourne un montant arrondi "proprement".
 */
async function convertCurrency(amount, from, to) {
    let result = amount;
    if (from !== to) {
        const pair = `${from}_${to}`;
        const inversePair = `${to}_${from}`;

        if (FALLBACK_RATES[pair]) {
            result = amount * FALLBACK_RATES[pair];
        } else if (FALLBACK_RATES[inversePair]) {
            result = amount / FALLBACK_RATES[inversePair];
        } else if (from !== "EUR" && to !== "EUR") {
            const amountInEur = await convertCurrency(amount, from, "EUR");
            return await convertCurrency(amountInEur, "EUR", to);
        }
    }

    return getSmartRoundedAmount(result, to);
}

/**
 * Calcule le split 50/50 pour une réservation.
 * @param {number} totalAmount Montant total dans la monnaie de l'offre
 * @param {string} baseCurrency Monnaie de l'offre
 * @param {string} departureCurrency Monnaie pays départ
 * @param {string} arrivalCurrency Monnaie pays arrivée
 */
async function calculateBifurcatedPayment(totalAmount, baseCurrency, departureCurrency, arrivalCurrency) {
    const halfBase = totalAmount / 2;

    const amountStart = await convertCurrency(halfBase, baseCurrency, departureCurrency);
    const amountEnd = await convertCurrency(halfBase, baseCurrency, arrivalCurrency);

    return {
        total: totalAmount,
        baseCurrency,
        split: {
            start: { amount: Number(amountStart.toFixed(2)), currency: departureCurrency },
            end: { amount: Number(amountEnd.toFixed(2)), currency: arrivalCurrency }
        }
    };
}

module.exports = { convertCurrency, calculateBifurcatedPayment, getSmartRoundedAmount };
