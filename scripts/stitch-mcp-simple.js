#!/usr/bin/env node
/**
 * stitch-mcp-simple — MCP Server for Google Stitch (sans gcloud)
 * Utilise directement la clé API au lieu de passer par gcloud OAuth.
 * 
 * ═══════════════════════════════════════════════════════════════
 * INSTRUCTIONS DE RÉINSTALLATION
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. Vérifier que la config est dans ~/.deepcode/settings.json :
 *    "google-stitch": {
 *      "command": "node",
 *      "args": ["<CHEMIN_VERS>/stitch-mcp-simple.js"],
 *      "env": { "STITCH_API_KEY": "<VOTRE_CLE_API>" }
 *    }
 * 
 * 2. Obtenir une clé API sur https://stitch.withgoogle.com/settings
 *    La clé est stockée uniquement dans ~/.deepcode/settings.json (env: STITCH_API_KEY)
 * 
 * 3. Projet Stitch associé : 6051810808823554313
 *    Lien : https://stitch.withgoogle.com/projects/6051810808823554313
 * 
 * 4. Tester le serveur :
 *    STITCH_API_KEY="<VOTRE_CLE>" node stitch-mcp-simple.js --http 3099
 *    curl -X POST http://localhost:3099 -H "Content-Type: application/json" \
 *      -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
 * 
 * 5. Redémarrer Deep Code et taper /mcp pour vérifier
 * ═══════════════════════════════════════════════════════════════
 */

const STITCH_URL = "https://stitch.googleapis.com/mcp";
const TIMEOUT_MS = 180000;

const log = {
    info: (msg) => console.error(`[stitch-mcp-simple] ℹ️ ${msg}`),
    success: (msg) => console.error(`[stitch-mcp-simple] ✅ ${msg}`),
    warn: (msg) => console.error(`[stitch-mcp-simple] ⚠️ ${msg}`),
    error: (msg) => console.error(`[stitch-mcp-simple] ❌ ${msg}`),
};

function getApiKey() {
    const key = process.env.STITCH_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) {
        throw new Error("STITCH_API_KEY not set");
    }
    return key;
}

async function callStitchMCP(request, apiKey) {
    const url = `${STITCH_URL}?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Stitch API HTTP ${response.status}: ${text}`);
    }

    return response.json();
}

async function main() {
    const apiKey = getApiKey();
    log.info(`Starting Stitch MCP Simple (connecté avec clé API)`);

    // Mode stdio (MCP transport standard)
    process.stdin.setEncoding("utf8");
    let buffer = "";

    process.stdin.on("data", async (chunk) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop(); // garder la ligne incomplète

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            let request;
            try {
                request = JSON.parse(trimmed);
            } catch (e) {
                continue;
            }

            try {
                const response = await callStitchMCP(request, apiKey);
                // L'API Stitch renvoie parfois la réponse avec wrap MCP
                const output = JSON.stringify(response);
                process.stdout.write(output + "\n");
            } catch (err) {
                log.error(`Erreur: ${err.message}`);
                const errorResponse = {
                    jsonrpc: "2.0",
                    id: request.id || null,
                    error: {
                        code: -32000,
                        message: err.message,
                    },
                };
                process.stdout.write(JSON.stringify(errorResponse) + "\n");
            }
        }
    });

    process.stdin.on("end", () => {
        process.exit(0);
    });
}

// Mode HTTP alternatif (si on veut tester en direct)
if (process.argv.includes("--http")) {
    const http = require("http");
    const apiKey = getApiKey();
    const PORT = parseInt(process.argv[3] || 3100);
    const server = http.createServer(async (req, res) => {
        if (req.method === "POST") {
            let body = "";
            req.on("data", (c) => (body += c));
            req.on("end", async () => {
                try {
                    const request = JSON.parse(body);
                    const response = await callStitchMCP(request, apiKey);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(response));
                } catch (err) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
        } else {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("Stitch MCP Simple — use POST with JSON-RPC 2.0");
        }
    });
    server.listen(PORT, () => log.info(`HTTP mode on http://localhost:${PORT}`));
} else {
    main().catch((err) => {
        log.error(`Fatal: ${err.message}`);
        process.exit(1);
    });
}
