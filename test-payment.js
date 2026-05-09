const { initiateSmartPayment } = require('./backend/paymentRouter');

async function runTest() {
    console.log("🦁 [TEST] Lancement d'un paiement fictif ColisConnect (Côte d'Ivoire)...");

    try {
        const result = await initiateSmartPayment({
            reservationId: "TEST-GP-001",
            departureCountry: "Côte d'Ivoire",
            amountEUR: 25.50, // Environ 16,700 XOF
            customerEmail: "marchand-test@colisconnect.com",
            customerName: "Jean Testeur",
            phoneNumber: "+2250700000000",
            userId: "user_007"
        });

        console.log("\n✅ [SUCCÈS] Routage réussi !");
        console.log("-----------------------------------------");
        console.log(`Fournisseur  : ${result.provider}`);
        console.log(`Montant Final: ${result.amount} ${result.currency}`);
        console.log(`Lien de Paiement : \n${result.paymentLink}`);
        console.log("-----------------------------------------");
        console.log("\n👉 Ouvre ce lien dans ton navigateur pour voir la page de paiement Genius Pay !");

    } catch (error) {
        console.error("\n❌ [ERREUR]", error.message);
    }
}

runTest();
