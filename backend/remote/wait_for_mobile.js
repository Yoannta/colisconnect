const fs = require('fs');
const path = require('path');

const cmdPath = path.join(__dirname, 'commands.txt');
const statusPath = path.join(__dirname, '..', 'status.json');

// On récupère la taille actuelle pour ne détecter que les NOUVEAUX messages
let lastSize = fs.existsSync(cmdPath) ? fs.statSync(cmdPath).size : 0;

function updateStatus(msg, task = "En attente...", progress = 0) {
    try {
        const status = {
            thought: msg,
            task: task,
            progress: progress,
            updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
    } catch (e) { }
}

function check() {
    if (!fs.existsSync(cmdPath)) {
        updateStatus("Erreur : Fichier commands.txt manquant.", "Erreur", 0);
        return setTimeout(check, 1000);
    }

    const currentSize = fs.statSync(cmdPath).size;
    if (currentSize > lastSize) {
        const content = fs.readFileSync(cmdPath, 'utf8');
        const lines = content.trim().split('\n');
        if (lines.length > 0) {
            const lastLine = lines[lines.length - 1];
            // Format attendu: [TIMESTAMP] COMMAND
            const match = lastLine.match(/\[.*?\]\s*(.*)/);
            const command = match ? match[1] : lastLine;

            console.log(command); // On envoie la commande à Antigravity
            process.exit(0);
        }
    }
    setTimeout(check, 1000);
}

// Timeout de sécurité au bout de 4 minutes pour éviter les blocages système
setTimeout(() => {
    console.log("TIMEOUT_RETRY");
    process.exit(0);
}, 240000);

updateStatus("📡 Mode Satellite Actif. Je t'écoute depuis ton téléphone...", "En veille", 100);
check();
