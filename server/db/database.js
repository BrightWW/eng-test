import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'test.db');

// Initialize SQL.js
const SQL = await initSqlJs();

let db;

// Load or create database
if (fs.existsSync(dbPath)) {
  const buffer = fs.readFileSync(dbPath);
  db = new SQL.Database(buffer);
} else {
  db = new SQL.Database();
}

// Wrapper to match better-sqlite3 API
const dbWrapper = {
  prepare: (sql) => {
    return {
      run: (...params) => {
        try {
          db.run(sql, params);
          const result = db.exec('SELECT last_insert_rowid() as id');
          return {
            lastInsertRowid: result[0]?.values[0]?.[0] || 0,
            changes: db.getRowsModified()
          };
        } finally {
          saveDatabase();
        }
      },
      get: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  },
  exec: (sql) => {
    try {
      db.exec(sql);
    } finally {
      saveDatabase();
    }
  },
  pragma: (pragma) => {
    db.run(`PRAGMA ${pragma}`);
  },
  close: () => {
    saveDatabase();
    db.close();
  }
};

function saveDatabase() {
  const data = db.export();
  fs.writeFileSync(dbPath, data);
}

// Enable foreign keys
dbWrapper.pragma('foreign_keys = ON');

// Graceful shutdown
process.on('exit', () => dbWrapper.close());
process.on('SIGINT', () => {
  dbWrapper.close();
  process.exit(0);
});

export default dbWrapper;
