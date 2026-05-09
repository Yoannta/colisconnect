const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * Service pour l'agrégateur ivoirien Genius Pay
 * Documentation : https://pay.genius.ci/doc
 */
class GeniusPayService {
    constructor() {
        this.apiKey = process.env.GENIUS_PUBLIC_KEY;
        this.apiSecret = process.env.GENIUS_PRIVATE_KEY;
        this.baseUrl = 'https://pay.genius.ci/api/v1/merchant';
    }

    /**
     * Initie un paiement (Lien de paiement hébergé ou Direct)
     */
    async initiatePayment(data) {
        if (!this.apiKey || !this.apiSecret) {
            console.error("[GeniusPay] Clés API manquantes.");
            return { success: false, message: "Configuration incomplète" };
        }

        try {
            // Construction du corps de la requête selon la doc v1
            const payload = {
                amount: data.amount,
                currency: "XOF",
                description: data.description || "Paiement ColisConnect",
                customer: {
                    name: data.customerName || "Client ColisConnect",
                    email: data.email,
                    phone: data.phoneNumber
                },
                success_url: data.redirectUrl || "https://colisconnect.com/payment-success",
                error_url: data.errorUrl || "https://colisconnect.com/payment-error",
                metadata: {
                    orderId: data.orderId,
                    userId: data.userId
                }
            };

            // Si aucune méthode n'est spécifiée, Genius Pay affiche sa page de Checkout
            if (data.paymentMethod) {
                payload.payment_method = data.paymentMethod;
            }

            const response = await axios.post(`${this.baseUrl}/payments`, payload, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'X-API-Secret': this.apiSecret,
                    'Content-Type': 'application/json'
                }
            });

            // La doc indique que les données sont dans response.data.data
            const paymentData = response.data.data;

            return {
                success: true,
                paymentUrl: paymentData.payment_url || paymentData.checkout_url,
                transactionId: paymentData.id,
                reference: paymentData.reference
            };
        } catch (error) {
            const errorMsg = error.response ? error.response.data : error.message;
            console.error("[GeniusPay] Erreur initiation :", JSON.stringify(errorMsg, null, 2));
            return {
                success: false,
                message: "Erreur lors de l'initiation du paiement",
                details: errorMsg
            };
        }
    }

    /**
     * Vérifie le statut d'une transaction
     */
    async checkStatus(transactionId) {
        try {
            const response = await axios.get(`${this.baseUrl}/payments/${transactionId}`, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'X-API-Secret': this.apiSecret
                }
            });

            const paymentData = response.data.data;

            return {
                success: true,
                status: paymentData.status, // completed, pending, failed
                amount: paymentData.amount,
                reference: paymentData.reference
            };
        } catch (error) {
            console.error("[GeniusPay] Erreur statut :", error.message);
            return { success: false, message: "Impossible de vérifier le statut" };
        }
    }
    /**
     * Effectue un virement (Payout) vers un numéro de téléphone (Mobile Money)
     * Utile pour reverser la part du voyageur automatiquement.
     */
    async createTransfer(data) {
        if (!this.apiKey || !this.apiSecret) {
            console.error("[GeniusPay] Clés API manquantes pour transfert.");
            return { success: false, message: "Configuration incomplète" };
        }

        try {
            const payload = {
                amount: data.amount,
                currency: "XOF",
                phone: data.phoneNumber,
                description: data.description || "Reversement Voyageur ColisConnect",
                metadata: {
                    reservationId: data.reservationId
                }
            };

            const response = await axios.post(`${this.baseUrl}/transfers`, payload, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'X-API-Secret': this.apiSecret,
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: true,
                transferId: response.data.data.id,
                status: response.data.data.status
            };
        } catch (error) {
            const errorMsg = error.response ? error.response.data : error.message;
            console.error("[GeniusPay] Erreur transfert :", JSON.stringify(errorMsg, null, 2));
            return {
                success: false,
                message: "Erreur lors du transfert des fonds",
                details: errorMsg
            };
        }
    }
}

module.exports = new GeniusPayService();
