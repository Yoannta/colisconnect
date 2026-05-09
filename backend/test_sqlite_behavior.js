const { DatabaseSync } = require("node:sqlite");
const path = require('path');
const db = new DatabaseSync(':memory:');

db.exec("CREATE TABLE test(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");

try {
    const result = db.prepare("INSERT INTO test(name) VALUES (?)").run("Hello");
    console.log("Result of run():", result);
    console.log("Type of lastInsertRowid:", typeof result.lastInsertRowid);

    const row = db.prepare("SELECT * FROM test WHERE id = ?").get(result.lastInsertRowid);
    console.log("Retrieved row:", row);
} catch (e) {
    console.error("Crash during test:", e.message);
}
