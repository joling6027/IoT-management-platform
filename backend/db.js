const sqlite3 = require('sqlite3').verbose()

const db = new sqlite3.Database('./data/telemetry.db')

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deviceId TEXT,
      voltage REAL,
      current REAL,
      power REAL,
      timestamp INTEGER
    )
  `)
})

module.exports = db