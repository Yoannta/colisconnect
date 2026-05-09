const { DatabaseSync } = require("node:sqlite");
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, 'colisconnect.sqlite'));

try {
    const rows = db.prepare("SELECT id, offer_id, departure_country, status FROM reservations ORDER BY id DESC LIMIT 5").all();
    console.log("Dernières réservations :");
    rows.forEach(r => console.log(`ID: ${r.id} | OfferID: ${r.offer_id} | Country: ${r.departure_country} | Status: ${r.status}`));
} catch (e) {
    console.error("Erreur :", e.message);
}
