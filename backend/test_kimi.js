const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const axios = require('axios');

async function listModels() {
    const apiKey = process.env.KIMI_API_KEY;
    const url = "https://api.moonshot.cn/v1/models"; // On teste sur le serveur qui a fonctionné

    console.log("🚀 Récupération de la liste des modèles disponibles pour ta clé...");
    try {
        const response = await axios.get(url, {
            headers: { "Authorization": `Bearer ${apiKey}` }
        });

        console.log("\n✅ Modèles trouvés :");
        response.data.data.forEach(m => {
            console.log(`- ${m.id}`);
        });
        console.log("\nCopie le nom de celui qui semble être 'Vision' !");
    } catch (e) {
        console.log("❌ Erreur lors de la récupération :", e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

listModels();
