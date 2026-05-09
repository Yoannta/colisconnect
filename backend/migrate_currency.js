const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("colisconnect.sqlite");

const migrations = [
    "ALTER TABLE offers ADD COLUMN base_currency TEXT DEFAULT 'EUR'",
    "ALTER TABLE reservations ADD COLUMN payment_split_type TEXT DEFAULT 'full'",
    "ALTER TABLE reservations ADD COLUMN frozen_rate REAL",
    "ALTER TABLE reservations ADD COLUMN start_amount REAL",
    "ALTER TABLE reservations ADD COLUMN start_currency TEXT",
    "ALTER TABLE reservations ADD COLUMN end_amount REAL",
    "ALTER TABLE reservations ADD COLUMN end_currency TEXT",
    "ALTER TABLE reservations ADD COLUMN departure_country TEXT",
    "ALTER TABLE reservations ADD COLUMN arrival_country TEXT",
];

let done = 0;
for (const sql of migrations) {
    try {
        db.exec(sql);
        const colName = sql.split("ADD COLUMN")[1].trim().split(" ")[0];
        console.log("[OK] Colonne ajoutée:", colName);
        done++;
    } catch (e) {
        if (e.message.includes("duplicate column")) {
            const colName = sql.split("ADD COLUMN")[1].trim().split(" ")[0];
            console.log("[SKIP - déjà existe]", colName);
        } else {
            console.error("[ERREUR]", e.message);
        }
    }
}

console.log("\nMigration terminée. Ajoutées:", done, "/", migrations.length);

// Vérification finale
const cols_o = db.prepare("PRAGMA table_info(offers)").all();
const cols_r = db.prepare("PRAGMA table_info(reservations)").all();
console.log("\nOFFERS:", cols_o.map(c => c.name));
console.log("RESERVATIONS:", cols_r.map(c => c.name));
