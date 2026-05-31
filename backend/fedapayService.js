const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

/**
 * Service FedaPay pour ColisConnect 2026
 * Gère l'encaissement des commissions de plateforme.
 */

const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY_TEST || process.env.FEDAPAY_SECRET_KEY;
const FEDAPAY_BASE_URL = 'https://api.fedapay.com/v1';

async function createFedaPayLink({ amount, description, customerEmail, customerName, callbackUrl }) {
    if (!FEDAPAY_SECRET_KEY || FEDAPAY_SECRET_KEY.includes('COLLER_VOTRE_CLE_ICI')) {
        throw new Error("Clé API FedaPay manquante dans le fichier .env du serveur.");
    }

    try {
        const response = await axios.post(`${FEDAPAY_BASE_URL}/transactions`, {
            amount: amount,
            currency: { iso: 'XOF' }, // FedaPay gère la conversion interne si besoin, mais on cible le XOF
            description: description,
            callback_url: callbackUrl,
            customer: {
                firstname: customerName.split(' ')[0],
                lastname: customerName.split(' ').slice(1).join(' ') || 'Client',
                email: customerEmail
            }
        }, {
            headers: {
                'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Debug: Afficher la réponse brute
        console.log("[FedaPay] Réponse Création:", JSON.stringify(response.data));

        const transactionId = response.data.v1 ? response.data.v1.transaction.id : response.data.transaction.id;

        // Générer le lien de paiement (token de redirection)
        const tokenResponse = await axios.post(`${FEDAPAY_BASE_URL}/transactions/${transactionId}/token`, {}, {
            headers: { 'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}` }
        });

        const tokenUrl = tokenResponse.data.v1 ? tokenResponse.data.v1.token.url : tokenResponse.data.token.url;
        return tokenUrl;
    } catch (error) {
        console.error('[FedaPay] Error:', error.response?.data || error.message);
        throw new Error("Échec de l'initialisation du paiement FedaPay.");
    }
}

module.exports = { createFedaPayLink };
