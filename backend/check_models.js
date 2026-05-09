const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: 'c:/Users/hp/.gemini/antigravity/scratch/colis_connect/backend/.env' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // There isn't a direct listModels in the genAI instance sometimes, 
        // it's a fetch call normally, but for the SDK let's try a simple generation check.
        console.log("Checking gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hi");
        console.log("gemini-1.5-flash works!", result.response.text());
    } catch (e) {
        console.error("gemini-1.5-flash FAILED:", e.message);
    }

    try {
        console.log("Checking gemini-1.5-flash-001...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
        const result = await model.generateContent("Hi");
        console.log("gemini-1.5-flash-001 works!", result.response.text());
    } catch (e) {
        console.error("gemini-1.5-flash-001 FAILED:", e.message);
    }
}

listModels();
