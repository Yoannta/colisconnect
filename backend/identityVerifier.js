const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require("@google/genai");
// On force la lecture du .env dans le dossier backend
require('dotenv').config({ path: path.join(__dirname, '.env') });

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

/**
 * --- IA KIMI (Moonshot AI - Vision K2.6) ---
 */
async function callKimiVision(base64Image, promptText) {
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
        console.warn("[Vision] KIMI_API_KEY manquante dans le .env");
        return null;
    }

    console.log(`[Vision] Appel à l'IA KIMI Vision (8k)...`);
    const payload = {
        model: "moonshot-v1-8k-vision-preview",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: promptText },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${base64Image}`
                        }
                    }
                ]
            }
        ]
    };

    try {
        const response = await axios.post(
            "https://api.moonshot.cn/v1/chat/completions",
            payload,
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                timeout: 45000
            }
        );

        const content = response.data.choices[0].message.content;
        return JSON.parse(content.replace(/```json|```/g, "").trim());
    } catch (err) {
        if (err.code === 'ECONNABORTED') {
            console.error(`[Vision] Erreur KIMI : Timeout de 45s dépassé.`);
        } else {
            console.error(`[Vision] Erreur KIMI :`, err.response ? err.response.data : err.message);
        }
        return null;
    }
}

/**
 * --- IA GOOGLE DE VISION (Gemini 2.5 Flash - SDK 2026) ---
 */
async function callGeminiVision(base64Image, promptText) {
    if (!process.env.GEMINI_API_KEY) return null;
    console.log(`[Vision] Fallback vers l'IA Google (Gemini 2.5 Flash)...`);

    try {
        const result = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    parts: [
                        { text: promptText },
                        {
                            inlineData: {
                                data: base64Image,
                                mimeType: "image/jpeg"
                            }
                        }
                    ]
                }
            ]
        });

        const rawText = result.candidates[0].content.parts[0].text;
        return JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch (err) {
        console.error(`❌ [Gemini Erreur] :`, err.message);
        if (err.stack) console.error(`[Gemini Stack] :`, err.stack);
        return null;
    }
}

/**
 * Valide une image de passeport
 */
async function verifyPassportImage(input) {
    let imageBuffer;
    try {
        if (input.startsWith('data:')) {
            imageBuffer = Buffer.from(input.split(';base64,')[1], 'base64');
        } else {
            imageBuffer = fs.readFileSync(input);
        }
    } catch (e) {
        return { is_passport: false, is_approved: false, reason: "Erreur lecture image." };
    }

    const base64Str = imageBuffer.toString("base64");
    const prompt = `Analyse cette image avec un œil critique d'expert en sécurité. Est-ce un passeport réel, physique et original ? 
    Détecte s'il s'agit d'un spécimen (marques "SPECIMEN", "SAMPLE"), d'un mockup digital, d'une photo d'un écran, ou d'un montage. 
    Réponds UNIQUEMENT en JSON : 
    { 
      "is_passport": boolean, 
      "is_approved": boolean, 
      "confidence": float (0 à 1.0), 
      "reason": "Explication courte et précise en français (ex: 'Document réel validé' ou 'Détecté comme spécimen/montage')" 
    }`;

    let result = await callKimiVision(base64Str, prompt);
    let engine = "KIMI";

    if (!result) {
        result = await callGeminiVision(base64Str, prompt);
        engine = "Gemini (Fallback)";
    }

    if (result) {
        console.log(`[Identity] Résultat via ${engine} :`, result);
        return {
            is_passport: result.is_passport || false,
            is_approved: result.is_approved || false,
            confidence: result.confidence || 0.5,
            reason: result.reason || "Vérification effectuée."
        };
    }

    return { is_passport: false, is_approved: false, reason: "Échec de l'analyse." };
}

/**
 * Vérifie un reçu de paiement
 */
async function verifyPaymentReceipt(input) {
    let imageBuffer;
    try {
        if (input.startsWith('data:')) {
            imageBuffer = Buffer.from(input.split(';base64,')[1], 'base64');
        } else {
            imageBuffer = fs.readFileSync(input);
        }
    } catch (e) {
        return { is_valid: false, amount: 0, reason: "Erreur lecture image." };
    }

    const base64Str = imageBuffer.toString("base64");
    const prompt = `Analyse ce reçu. Est-il valide et quel est le montant ? Réponds UNIQUEMENT en JSON : { "is_valid": true, "amount": 0.00, "reason": "Explication en français" }`;

    let result = await callKimiVision(base64Str, prompt);
    let engine = "KIMI";

    if (!result) {
        result = await callGeminiVision(base64Str, prompt);
        engine = "Gemini (Fallback)";
    }

    if (result) {
        return {
            is_valid: result.is_valid || false,
            amount: result.amount || 0,
            reason: result.reason || "Reçu analysé."
        };
    }

    return { is_valid: false, amount: 0, reason: "Analyse impossible." };
}

module.exports = { verifyPassportImage, verifyPaymentReceipt };
