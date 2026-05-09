const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('backend/colisconnect.sqlite');
console.log(JSON.stringify(db.prepare("PRAGMA table_info(offers)").all(), null, 2));
