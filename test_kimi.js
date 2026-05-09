const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const axios = require('axios');

async function checkKimi(url, model) {
    const apiKey = process.env.KIMI_API_KEY;
    console.log(`\n🔍 Test sur ${url} avec le modèle ${model}...`);
    try {
        const response = await axios.post(
            url,
            {
                model: model,
                messages: [{ role: "user", content: "Hi" }]
            },
            {
                headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                timeout: 5000
            }
        );
        console.log(`✅ SUCCÈS sur ${url} !`);
        return true;
    } catch (e) {
        const errorMsg = e.response ? JSON.stringify(e.response.data.error) : e.message;
        console.log(`❌ ÉCHEC : ${errorMsg}`);
        return false;
    }
}

async function runTests() {
    const endpoints = [
        "https://api.moonshot.ai/v1/chat/completions",
        "https://api.moonshot.cn/v1/chat/completions"
    ];
    const models = ["kimi-k2.6", "moonshot-v1-8k"];

    console.log("🚀 Lancement du diagnostic Kimi...");

    for (const url of endpoints) {
        for (const model of models) {
            const ok = await checkKimi(url, model);
            if (ok) {
                console.log("\n✨ SOLUTION TROUVÉE !");
                console.log(`Il faut utiliser l'URL : ${url}`);
                console.log(`Et le modèle : ${model}`);
                return;
            }
        }
    }
    console.log("\n❌ Aucune combinaison n'a fonctionné. Ta clé est probablement invalide ou ton quota est épuisé.");
}

runTests();
