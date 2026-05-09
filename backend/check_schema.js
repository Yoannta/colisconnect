const { DatabaseSync } = require("node:sqlite");
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, 'colisconnect.sqlite'));

try {
    const columns = db.prepare("PRAGMA table_info(offers)").all();
    console.log("Column names in 'offers' table:");
    columns.forEach(col => console.log(`- ${col.name}`));

    const hasCurrency = columns.some(c => c.name === 'base_currency');
    if (!hasCurrency) {
        console.log("\n⚠️  LA COLONNE 'base_currency' EST MANQUANTE !");
    } else {
        console.log("\n✅ La colonne 'base_currency' est bien présente.");
    }
} catch (e) {
    console.error("Erreur lors de la lecture du schéma :", e.message);
}
