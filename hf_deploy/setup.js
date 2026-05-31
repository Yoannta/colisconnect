const http = require('http');
const fs = require('fs');

const PORT = 7860; // Port public HF
const LOG_PATH = '/tmp/openclaw.log';

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

    let logs = '';
    if (fs.existsSync(LOG_PATH)) {
        logs = fs.readFileSync(LOG_PATH, 'utf8');
    }

    res.end(`
        <html>
            <head>
                <title>OpenClaw Cloud pairing</title>
                <meta http-equiv="refresh" content="5">
                <style>
                    body { background: #000; color: #0f0; font-family: monospace; padding: 20px; }
                    pre { white-space: pre-wrap; word-wrap: break-word; font-size: 14px; line-height: 1.2; }
                    .header { color: #fff; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                    .highlight { color: #fff; font-weight: bold; background: #222; padding: 5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🦞 OpenClaw WhatsApp Pairing</h1>
                    <p class="highlight">Le QR Code ASCII va apparaître ci-dessous. Scannez-le avec votre téléphone.</p>
                </div>
                <pre>${logs || 'Démarrage de l\'Agent... Veuillez patienter.'}</pre>
            </body>
        </html>
    `);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Log viewer ready on ${PORT}`);
});
