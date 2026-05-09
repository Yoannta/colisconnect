const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const DB_FILE = path.join(__dirname, 'avancement_db.json');
const HTML_FILE = path.join(__dirname, 'avancement.html');
const LOG_FILE = path.join(__dirname, 'avancement_actions.log');

// Initialiser le fichier DB s'il n'existe pas
if (!fs.existsSync(DB_FILE)) {
    const initialData = [
        { id: "paiement-auto", status: "pending", title: "Le Paiement Automatique", purpose: "Virement direct via Stripe Connect.", tasks: [], updates: [{ date: "Actuel", text: "Vérification manuelle des reçus." }] },
        { id: "avis-notes", status: "pending", title: "Système d'Avis (Étoiles)", purpose: "Permettre aux clients de noter les voyageurs.", tasks: [], updates: [{ date: "Backend", text: "Structure prête dans la BDD." }] },
        { id: "alertes-sms", status: "pending", title: "Alertes Hors-Ligne (SMS/Email)", purpose: "Prévenir l'utilisateur d'un nouveau message sur son mobile.", tasks: [], updates: [{ date: "Actuel", text: "Ntfy admin uniquement." }] },
        { id: "demandes-colis", status: "pending", title: "Demandes de Transport (Expéditeur)", purpose: "Permettre aux clients de poster des annonces de recherche.", tasks: [], updates: [{ date: "Backend", text: "Routes API prêtes mais bouton caché." }] },
        { id: "verif-vols", status: "pending", title: "Vérification de Vols", purpose: "Vérifier si le vol est réel via AviationStack.", tasks: [], updates: [{ date: "Démo", text: "Liste de test de 9 vols actifs." }] },
        { id: "timeline-colis", status: "pending", title: "Ligne de Suivi du Colis", purpose: "Affichage visuel du statut (Pris ➡️ En vol ➡️ Livré).", tasks: [], updates: [{ date: "Mécanique", text: "Status changent mais pas de design visuel." }] },
        { id: "kyc-auto", status: "done", title: "Vérification KYC & Anti-Leak", purpose: "Sécurité automatique par IA pour les IDs et WhatsApp.", tasks: [], updates: [{ date: "Achevé", text: "IA Gemini Vision active." }] }
    ];
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile(HTML_FILE, (err, data) => {
            if (err) { res.writeHead(500); res.end("Error"); return; }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
    }
    else if (req.url === '/api/db' && req.method === 'GET') {
        fs.readFile(DB_FILE, (err, data) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        });
    }
    else if (req.url === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                // Le payload contient { db: Array, log: String }
                if (payload.db) {
                    fs.writeFileSync(DB_FILE, JSON.stringify(payload.db, null, 2));
                }
                if (payload.log) {
                    const logMsg = `[${new Date().toLocaleString()}] AI_ACTION_REQUIRED: ${payload.log}\n`;
                    fs.appendFileSync(LOG_FILE, logMsg);
                    console.log(`Action enregistrée: ${payload.log}`);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(400); res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
    }
    else {
        res.writeHead(404); res.end("Not Found");
    }
});

// Arrêter toute instance existante avant de relancer (facultatif si lancé via l'IA)
server.listen(PORT, () => {
    console.log(`Serveur actif sur http://localhost:${PORT}`);
});
