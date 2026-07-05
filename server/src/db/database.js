import pg from 'pg';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const SQLITE_PATH = path.join(DB_DIR, 'capitai.db');

let pgPool = null;
let sqliteDb = null;
let isPg = false;

// Check if PostgreSQL config is provided
const pgConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/capitai'
};

export async function initDb() {
  try {
    // Attempt PG connection
    if (process.env.DATABASE_URL) {
      console.log('Attempting PostgreSQL connection...');
      pgPool = new pg.Pool(pgConfig);
      await pgPool.query('SELECT NOW()'); // test query
      isPg = true;
      console.log('Successfully connected to PostgreSQL database.');
    } else {
      console.log('No DATABASE_URL found. Falling back to SQLite...');
      await initSqlite();
    }
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    console.log('Falling back to SQLite database...');
    await initSqlite();
  }

  // Create tables if they do not exist
  await createTables();
}

async function initSqlite() {
  return new Promise((resolve, reject) => {
    sqliteDb = new sqlite3.Database(SQLITE_PATH, (err) => {
      if (err) {
        console.error('SQLite initialization failed:', err.message);
        reject(err);
      } else {
        console.log('SQLite database initialized at', SQLITE_PATH);
        resolve();
      }
    });
  });
}

async function runQuery(sql, params = []) {
  if (isPg) {
    const res = await pgPool.query(sql, params);
    return res.rows;
  } else {
    return new Promise((resolve, reject) => {
      // Convert standard parameterized syntax if needed ($1, $2) to (?)
      let sqliteSql = sql;
      const matches = sql.match(/\$\d+/g);
      if (matches) {
        // SQLite uses ? or :param. Let's map $1, $2 to ? and make sure params is an array
        sqliteSql = sql.replace(/\$\d+/g, '?');
      }

      const method = sql.trim().toUpperCase().startsWith('SELECT') ? 'all' : 'run';
      sqliteDb[method](sqliteSql, params, function (err, rows) {
        if (err) {
          reject(err);
        } else {
          if (method === 'run') {
            resolve({ lastID: this.lastID, changes: this.changes });
          } else {
            resolve(rows);
          }
        }
      });
    });
  }
}

async function createTables() {
  const tables = [
    // Users (Persistent Memory)
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      memory TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    // User authentication (Username/Password with Sessions)
    `CREATE TABLE IF NOT EXISTS user_auth (
      username TEXT PRIMARY KEY,
      password_hash TEXT,
      salt TEXT,
      session_token TEXT,
      user_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    // Portfolio
    `CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      ticker TEXT,
      shares REAL,
      avg_price REAL,
      sector TEXT,
      geo TEXT,
      purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    // Watchlist
    `CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      ticker TEXT,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, ticker)
    )`,
    // Recommendations (AI Analysis Reports)
    `CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      ticker TEXT,
      score REAL,
      confidence REAL,
      decision TEXT,
      report TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    // Observability Logs
    `CREATE TABLE IF NOT EXISTS observability_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT,
      latency INTEGER,
      tokens INTEGER,
      cache_hit INTEGER,
      errors TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  // Adjust table queries for PG vs SQLite
  for (let tableSql of tables) {
    if (isPg) {
      // In PG, AUTOINCREMENT is SERIAL. Adjust sqlite elements.
      tableSql = tableSql.replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY');
      // Set timestamp defaults for pg
      tableSql = tableSql.replace('DEFAULT CURRENT_TIMESTAMP', 'DEFAULT CURRENT_TIMESTAMP');
    }
    try {
      await runQuery(tableSql);
    } catch (err) {
      console.error('Error creating table:', err.message, 'SQL:', tableSql);
    }
  }
}

// User memory helper
export async function saveUserMemory(userId, memory) {
  const memStr = JSON.stringify(memory);
  const existing = await runQuery('SELECT id FROM users WHERE id = $1', [userId]);
  if (existing.length > 0) {
    await runQuery('UPDATE users SET memory = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [memStr, userId]);
  } else {
    await runQuery('INSERT INTO users (id, memory) VALUES ($1, $2)', [userId, memStr]);
  }
}

export async function getUserMemory(userId) {
  const rows = await runQuery('SELECT memory FROM users WHERE id = $1', [userId]);
  if (rows.length > 0) {
    return JSON.parse(rows[0].memory);
  }
  return null;
}

// Portfolio helper
export async function getPortfolio(userId) {
  return await runQuery('SELECT * FROM portfolio WHERE user_id = $1', [userId]);
}

export async function savePortfolioItem(userId, item) {
  const { ticker, shares, avg_price, sector, geo } = item;
  // If exists, average the price and add shares
  const existing = await runQuery('SELECT id, shares, avg_price FROM portfolio WHERE user_id = $1 AND ticker = $2', [userId, ticker]);
  if (existing.length > 0) {
    const prevShares = existing[0].shares;
    const prevPrice = existing[0].avg_price;
    const newShares = prevShares + shares;
    const newPrice = ((prevPrice * prevShares) + (avg_price * shares)) / newShares;
    await runQuery(
      'UPDATE portfolio SET shares = $1, avg_price = $2, sector = $3, geo = $4 WHERE id = $5',
      [newShares, newPrice, sector, geo, existing[0].id]
    );
  } else {
    await runQuery(
      'INSERT INTO portfolio (user_id, ticker, shares, avg_price, sector, geo) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, ticker, shares, avg_price, sector, geo]
    );
  }
}

export async function clearPortfolio(userId) {
  await runQuery('DELETE FROM portfolio WHERE user_id = $1', [userId]);
}

// Watchlist helper
export async function getWatchlist(userId) {
  const rows = await runQuery('SELECT ticker FROM watchlist WHERE user_id = $1', [userId]);
  return rows.map(r => r.ticker);
}

export async function addToWatchlist(userId, ticker) {
  try {
    await runQuery('INSERT INTO watchlist (user_id, ticker) VALUES ($1, $2)', [userId, ticker]);
  } catch (err) {
    // Avoid double inserts
  }
}

export async function removeFromWatchlist(userId, ticker) {
  await runQuery('DELETE FROM watchlist WHERE user_id = $1 AND ticker = $2', [userId, ticker]);
}

// Recommendations helper
export async function saveRecommendation(userId, rec) {
  const { id, ticker, score, confidence, decision, report } = rec;
  await runQuery(
    'INSERT INTO recommendations (id, user_id, ticker, score, confidence, decision, report) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, userId, ticker, score, confidence, decision, JSON.stringify(report)]
  );
}

export async function getRecommendations(userId) {
  const rows = await runQuery('SELECT * FROM recommendations WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return rows.map(r => ({
    ...r,
    report: JSON.parse(r.report)
  }));
}

// Observability helper
export async function logObservability(log) {
  const { endpoint, latency, tokens, cache_hit, errors } = log;
  await runQuery(
    'INSERT INTO observability_logs (endpoint, latency, tokens, cache_hit, errors) VALUES ($1, $2, $3, $4, $5)',
    [endpoint, latency, tokens, cache_hit, errors ? String(errors) : null]
  );
}

export async function getObservabilityLogs() {
  return await runQuery('SELECT * FROM observability_logs ORDER BY timestamp DESC LIMIT 100');
}

// Authentication Helpers
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export async function dbRegisterUser(username, password) {
  const existing = await runQuery('SELECT username FROM user_auth WHERE username = $1', [username]);
  if (existing.length > 0) {
    throw new Error('Username already exists.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const userId = `user-${Math.random().toString(36).substring(2, 9)}`;

  await runQuery(
    'INSERT INTO user_auth (username, password_hash, salt, user_id) VALUES ($1, $2, $3, $4)',
    [username, hash, salt, userId]
  );
  return userId;
}

export async function dbAuthenticateUser(username, password) {
  const rows = await runQuery(
    'SELECT password_hash, salt, user_id FROM user_auth WHERE username = $1',
    [username]
  );
  if (rows.length === 0) {
    throw new Error('Invalid username or password.');
  }

  const { password_hash, salt, user_id } = rows[0];
  const hash = hashPassword(password, salt);

  if (hash !== password_hash) {
    throw new Error('Invalid username or password.');
  }

  const sessionToken = crypto.randomBytes(32).toString('hex');
  await runQuery(
    'UPDATE user_auth SET session_token = $1 WHERE username = $2',
    [sessionToken, username]
  );
  return { userId: user_id, sessionToken };
}

export async function dbValidateSession(sessionToken) {
  if (!sessionToken) return null;
  const rows = await runQuery(
    'SELECT user_id FROM user_auth WHERE session_token = $1',
    [sessionToken]
  );
  if (rows.length > 0) {
    return rows[0].user_id;
  }
  return null;
}

export async function dbDestroySession(sessionToken) {
  if (!sessionToken) return;
  await runQuery(
    'UPDATE user_auth SET session_token = NULL WHERE session_token = $1',
    [sessionToken]
  );
}

