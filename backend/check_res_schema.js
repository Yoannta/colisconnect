const { DatabaseSync } = require("node:sqlite");
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, 'colisconnect.sqlite'));

try {
    const columns = db.prepare("PRAGMA table_info(reservations)").all();
    console.log("Column names in 'reservations' table:");
    columns.forEach(col => console.log(`- ${col.name}`));
} catch (e) {
    console.error("Erreur :", e.message);
}
