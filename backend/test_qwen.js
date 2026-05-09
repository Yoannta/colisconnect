require('dotenv').config({ path: 'backend/.env' });
const axios = require('axios');

async function testQwenKey() {
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) {
        return console.log("❌ Clé introuvable dans le .env !");
    }

    console.log("⏳ Test de ta clé Qwen (Alibaba) avec 5 RMB dessus...");
    console.time("⏱️ Temps de réponse");
    try {
        const response = await axios.post(
            "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
            {
                model: "qwen-vl-plus",
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: "Est-ce un texte ?" },
                        { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" } }
                    ]
                }]
            },
            {
                headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                timeout: 30000
            }
        );
        console.timeEnd("⏱️ Temps de réponse");
        console.log("✅ SUCCÈS ! Alibaba t'a répondu :");
        console.log("🗣️ Qwen dit :", response.data.choices[0].message.content);
        console.log("💳 Ta clé est PARFAITEMENT valide et prête pour la production.");
    } catch (e) {
        console.timeEnd("⏱️ Temps de réponse");
        if (e.response) {
            console.log("\n❌ REFUS d'ALIBABA :", JSON.stringify(e.response.data, null, 2));
            if (e.response.data.error && e.response.data.error.code === 'DataInspectionFailed') {
                console.log("💡 INFO Alibaba: C'est un code de contrôle. Ça veut dire que ça marche !");
            }
        } else {
            console.log("\n❌ ERREUR RÉSEAU HORRIBLE : Coupure internet ou blocage local.", e.message);
        }
    }
}
testQwenKey();
