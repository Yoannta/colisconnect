const axios = require('axios');
const { GoogleGenAI } = require("@google/genai");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testKimi() {
    console.log("--- Testing KIMI Connectivity ---");
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
        console.log("KIMI_API_KEY missing");
        return;
    }
    try {
        const start = Date.now();
        const response = await axios.get("https://api.moonshot.cn/v1/models", {
            headers: { "Authorization": `Bearer ${apiKey}` },
            timeout: 15000
        });
        console.log(`KIMI models: ${response.data.data.map(m => m.id).join(', ')}`);
        console.log(`Response time: ${Date.now() - start}ms`);
    } catch (err) {
        console.error("KIMI Error:", err.response ? err.response.data : err.message);
    }
}

async function testGemini() {
    console.log("\n--- Testing Gemini Connectivity ---");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log("GEMINI_API_KEY missing");
        return;
    }
    const genAI = new GoogleGenAI({ apiKey });
    try {
        const start = Date.now();
        console.log("Testing gemini-2.5-flash generateContent...");
        const result = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: "Hello, are you online? Respond with 'YES'." }] }]
        });
        console.log(`Gemini response: ${result.candidates[0].content.parts[0].text.trim()}`);
        console.log(`Response time: ${Date.now() - start}ms`);
    } catch (err) {
        console.error("Gemini Error:", err.message);
    }
}

async function runTests() {
    await testKimi();
    await testGemini();
}

runTests();
