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
 * Convertit un montant d'une devise à une autre.
 * Pour l'instant utilise les taux de secours. 
 * Évolutivité : pourra appeler une API externe plus tard.
 */
async function convertCurrency(amount, from, to) {
    if (from === to) return amount;

    const pair = `${from}_${to}`;
    if (FALLBACK_RATES[pair]) {
        return amount * FALLBACK_RATES[pair];
    }

    // Si on a l'inverse
    const inversePair = `${to}_${from}`;
    if (FALLBACK_RATES[inversePair]) {
        return amount / FALLBACK_RATES[inversePair];
    }

    // Si on passe par l'EUR comme pivot (ex: CNY -> XOF)
    if (from !== "EUR" && to !== "EUR") {
        const amountInEur = await convertCurrency(amount, from, "EUR");
        return await convertCurrency(amountInEur, "EUR", to);
    }

    return amount; // Par défaut si on ne sait pas convertir
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

module.exports = { convertCurrency, calculateBifurcatedPayment };
