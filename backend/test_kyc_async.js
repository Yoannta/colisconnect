const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_URL = 'http://localhost:8080/api';
const FAKE_PASSPORT_PATH = path.join('C:', 'Users', 'hp', '.gemini', 'antigravity', 'brain', 'd7ac04c3-f2fb-41d7-be15-8cc0f1ee8a10', 'fake_passport_1778242487232.png');

async function test() {
    console.log("--- Test KYC Asynchrone ---");

    // 1. Login
    console.log("1. Login en tant que testuser2@example.com...");
    const loginResp = await axios.post(`${API_URL}/auth/login`, {
        email: 'testuser2@example.com',
        password: 'Password123!'
    });
    const token = loginResp.data.token;
    console.log("   Token reçu.");

    // 2. Préparation de l'image
    const imageBase64 = fs.readFileSync(FAKE_PASSPORT_PATH, { encoding: 'base64' });
    const identityDocumentData = `data:image/png;base64,${imageBase64}`;

    // 3. Soumission KYC (PATCH)
    console.log("2. Soumission du passeport (Post-Optimisation)...");
    const startTime = Date.now();
    const patchResp = await axios.patch(`${API_URL}/users/me/profile`, {
        identityDocumentData
    }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const duration = Date.now() - startTime;

    console.log(`   Réponse reçue en ${duration}ms (Attendu: rapide because async).`);
    console.log(`   Statut retourné : ${patchResp.data.user.kycStatus}`);

    if (duration > 5000) {
        console.error("   ❌ ERREUR : La réponse a été trop lente (Synchrone ?)");
    } else {
        console.log("   ✅ SUCCÈS : Réponse rapide (Asynchrone confirmée).");
    }

    // 4. Attente de l'analyse en tâche de fond
    console.log("3. Attente de l'analyse IA en arrière-plan (15s)...");
    await new Promise(r => setTimeout(r, 15000));

    // 5. Vérification du statut final dans la DB
    console.log("4. Vérification du statut final...");
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync('backend/colisconnect.sqlite');
    const user = db.prepare("SELECT kyc_status, is_verified, identity_rejection_reason FROM users WHERE email = ?").get('testuser2@example.com');

    console.log("   Statut final DB :", user.kyc_status);
    console.log("   Vérifié ? :", user.is_verified === 1 ? "OUI" : "NON");
    console.log("   Raison rejet/info :", user.identity_rejection_reason);

    if (user.kyc_status === 'manual_review') {
        console.log("   🚀 SUCCÈS : Le document suspect a bien été envoyé en REVUE MANUELLE.");
    } else if (user.kyc_status === 'approved') {
        console.log("   ⚠️  ATTENTION : Le document a été approuvé automatiquement (Prompt encore trop laxiste ?)");
    } else {
        console.log("   ℹ️  Statut actuel :", user.kyc_status);
    }
}

test().catch(err => {
    console.error("Erreur durant le test :", err.response?.data || err.message);
});
