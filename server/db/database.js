import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'test.db');
const schemaPath = join(__dirname, 'schema.sql');

// Initialize SQL.js
const SQL = await initSqlJs();

let db;
let isNewDatabase = false;

// Load or create database
if (fs.existsSync(dbPath)) {
  const buffer = fs.readFileSync(dbPath);
  db = new SQL.Database(buffer);
} else {
  db = new SQL.Database();
  isNewDatabase = true;
  console.log('📦 Creating new database...');
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
    try {
      db.run(`PRAGMA ${pragma}`);
    } catch (err) {
      console.error(`Failed to run PRAGMA ${pragma}:`, err);
    }
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

// Check if database needs initialization
function needsInitialization() {
  try {
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='teachers'");
    return result.length === 0;
  } catch (err) {
    return true;
  }
}

// Initialize database with schema and default data
if (isNewDatabase || needsInitialization()) {
  console.log('🔧 Initializing database...');
  
  // Read and execute schema
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('✅ Database schema created');
  
  // Insert default teacher account
  const password = 'teacher123';
  const passwordHash = bcrypt.hashSync(password, 10);
  
  const stmt = db.prepare('INSERT INTO teachers (username, password_hash) VALUES (?, ?)');
  stmt.bind(['teacher', passwordHash]);
  stmt.step();
  stmt.free();
  
  console.log('👤 Default teacher account created');
  console.log('   Username: teacher');
  console.log('   Password: teacher123');
  
  saveDatabase();
  console.log('💾 Database saved');
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
