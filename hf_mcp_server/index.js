#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const axios = require("axios");

// Le serveur n'émet aucun "log" sur stdout pour éviter les corruptions EOF mortelles
const server = new Server(
    { name: "colisconnect-hf-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

function getToken() {
    const token = process.env.HF_TOKEN;
    if (!token) throw new Error("La variable HF_TOKEN n'est pas définie dans la conf MCP !");
    return token;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "hf_create_space",
                description: "Crée un nouvel espace Hugging Face (Docker, Gradio, etc.) / Create a HF Space",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Nom du repo (PAS de nom d'utilisateur. Ex: 'mon-nouveau-serveur')" },
                        sdk: { type: "string", enum: ["docker", "gradio", "streamlit", "static"] },
                        is_private: { type: "boolean", description: "Tant que c'est en prod, mettre true." }
                    },
                    required: ["name", "sdk", "is_private"]
                }
            },
            {
                name: "hf_get_space_info",
                description: "Obtiens le statut en temps réel du serveur (running, building, error, sleeping)",
                inputSchema: {
                    type: "object",
                    properties: {
                        repo_id: { type: "string", description: "L'identifiant complet (ex: yoann1234/mon-espace)" }
                    },
                    required: ["repo_id"]
                }
            },
            {
                name: "hf_restart_space",
                description: "Réveille un espace endormi ou force son redémarrage s'il a crashé / Restart a Space",
                inputSchema: {
                    type: "object",
                    properties: {
                        repo_id: { type: "string", description: "L'ID de l'espace (ex: yoann1234/mon-espace)" }
                    },
                    required: ["repo_id"]
                }
            },
            {
                name: "hf_set_space_secret",
                description: "Injecte une variable secrète (.env) dans le cloud Hugging Face (ex: une clé API). L'espace redémarre tout seul juste après.",
                inputSchema: {
                    type: "object",
                    properties: {
                        repo_id: { type: "string", description: "L'ID de l'espace (ex: yoann1234/mon-espace)" },
                        key: { type: "string", description: "Le nom de la variable (ex: GEMINI_API_KEY)" },
                        value: { type: "string", description: "La valeur secrète (ex: sk-12345)" }
                    },
                    required: ["repo_id", "key", "value"]
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const token = getToken();
        const { name, arguments: args } = request.params;
        const apiHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

        if (name === "hf_create_space") {
            const response = await axios.post(
                "https://huggingface.co/api/repos/create",
                { type: "space", name: args.name, private: args.is_private, sdk: args.sdk },
                { headers: apiHeaders }
            );
            return { content: [{ type: "text", text: `Serveur créé avec succès ! URL: ${response.data.url}` }] };
        } 
        
        if (name === "hf_get_space_info") {
            const response = await axios.get(
                `https://huggingface.co/api/spaces/${args.repo_id}`,
                { headers: apiHeaders }
            );
            const runtime = response.data.runtime || {};
            // Format clair et net pour l'agent
            const resText = `STATUT DU SERVEUR: ${runtime.stage || "INCONNU"}`;
            return { content: [{ type: "text", text: resText }] };
        } 
        
        if (name === "hf_restart_space") {
            await axios.post(
                `https://huggingface.co/api/spaces/${args.repo_id}/restart`,
                {},
                { headers: apiHeaders }
            );
            return { content: [{ type: "text", text: `Le serveur ${args.repo_id} vient d'être réveillé/redémarré !` }] };
        } 
        
        if (name === "hf_set_space_secret") {
            // Ecriture du nouveau secret (Hugging Face demande Key / Value)
            await axios.post(
                 `https://huggingface.co/api/spaces/${args.repo_id}/secrets`,
                 { "key": args.key, "value": args.value },
                 { headers: apiHeaders }
            );
            
            // Redémarrage forcé pour que le serveur prenne la clé en compte
             try {
                await axios.post(`https://huggingface.co/api/spaces/${args.repo_id}/restart`, {}, { headers: apiHeaders });
             } catch(e) {} 
             
            return { content: [{ type: "text", text: `🔐 Secret ${args.key} greffé au serveur avec succès ! Le serveur va redémarrer automatiquement.` }] };
        }

        throw new Error("Cet outil (Tool) n'existe pas ou tu as fait une faute de frappe.");

    } catch (error) {
        // Formattage propre pour que l'agent ne crash pas
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        return { isError: true, content: [{ type: "text", text: `❌ HF_API_ERROR: ${errorMsg}` }] };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 HuggingFace Anti-Crash MCP Server : EN LIGNE (Port sécurisé STDIO).");
}

main().catch(error => {
    // Tous les logs d'erreurs stricts vont dans Console.error (stderr) pour contourner le fameux EOF.
    console.error(error);
    process.exit(1);
});
