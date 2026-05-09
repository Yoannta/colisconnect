const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const DB_FILE = path.join(__dirname, "colisconnect.sqlite");
const db = new DatabaseSync(DB_FILE);

console.log("--- Tables ---");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const table of tables) {
    console.log(`Table: ${table.name}`);
}

console.log("\n--- Views ---");
const views = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='view'").all();
for (const view of views) {
    console.log(`View: ${view.name}`);
    console.log(view.sql);
}

console.log("\n--- Triggers ---");
const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger'").all();
for (const tri of triggers) {
    console.log(`Trigger: ${tri.name}`);
    console.log(tri.sql);
}
