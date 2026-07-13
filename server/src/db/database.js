import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_VERCEL = !!process.env.VERCEL;

// ─── Storage backends ────────────────────────────────────────────────────────
let pgPool = null;
let sqliteDb = null;
let isPg = false;

// Pure-JS in-memory store — used on Vercel where native sqlite3 cannot compile.
// Data lives as long as the serverless function is warm (~10 min idle).
const mem = {
  users:             new Map(), // userId → { id, memory }
  user_auth:         new Map(), // username → { username, password_hash, salt, user_id, session_token }
  sessions:          new Map(), // sessionToken → username
  portfolio:         [],        // { id, user_id, ticker, shares, avg_price, sector, geo }
  watchlist:         [],        // { id, user_id, ticker }
  recommendations:   [],        // { id, user_id, ticker, score, confidence, decision, report }
  observability:     [],        // { id, endpoint, latency, tokens, cache_hit, errors, timestamp }
  _nextId:           1,
};

// ─── Init ─────────────────────────────────────────────────────────────────────
export async function initDb() {
  if (IS_VERCEL) {
    // Check if a real PostgreSQL URL is provided
    if (process.env.DATABASE_URL) {
      try {
        pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
        await pgPool.query('SELECT NOW()');
        isPg = true;
        console.log('Vercel: connected to PostgreSQL.');
        await createTables();
        return;
      } catch (err) {
        console.error('Vercel: PostgreSQL failed, falling back to in-memory store:', err.message);
        pgPool = null;
        isPg = false;
      }
    }
    console.log('Vercel: using in-memory data store (no DATABASE_URL set).');
    return; // in-memory store needs no initialisation
  }

  // ── Local development: use SQLite ──────────────────────────────────────────
  try {
    if (process.env.DATABASE_URL) {
      pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      await pgPool.query('SELECT NOW()');
      isPg = true;
      console.log('Local: connected to PostgreSQL.');
    } else {
      await initSqlite();
    }
  } catch (err) {
    console.error('Local: PostgreSQL failed, falling back to SQLite:', err.message);
    await initSqlite();
  }
  await createTables();
}

async function initSqlite() {
  // Dynamically import sqlite3 only when NOT on Vercel to avoid build failures
  const sqlite3 = (await import('sqlite3')).default;
  const fs = (await import('fs')).default;
  const DB_DIR = path.join(__dirname, '../../data');
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  const SQLITE_PATH = path.join(DB_DIR, 'capitai.db');

  return new Promise((resolve, reject) => {
    sqliteDb = new sqlite3.Database(SQLITE_PATH, (err) => {
      if (err) { console.error('SQLite init failed:', err.message); reject(err); }
      else { console.log('SQLite initialized at', SQLITE_PATH); resolve(); }
    });
  });
}

// ─── SQL query runner (PG / SQLite only — not used for in-memory path) ────────
async function runQuery(sql, params = []) {
  if (isPg) {
    const res = await pgPool.query(sql, params);
    return res.rows;
  }
  return new Promise((resolve, reject) => {
    let sqliteSql = sql;
    const matches = sql.match(/\$\d+/g);
    if (matches) sqliteSql = sql.replace(/\$\d+/g, '?');
    const method = sql.trim().toUpperCase().startsWith('SELECT') ? 'all' : 'run';
    sqliteDb[method](sqliteSql, params, function (err, rows) {
      if (err) reject(err);
      else resolve(method === 'run' ? { lastID: this.lastID, changes: this.changes } : rows);
    });
  });
}

async function createTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      memory TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS user_auth (
      username TEXT PRIMARY KEY,
      password_hash TEXT,
      salt TEXT,
      session_token TEXT,
      user_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS portfolio (
      id ${isPg ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPg ? '' : 'AUTOINCREMENT'},
      user_id TEXT, ticker TEXT, shares REAL, avg_price REAL,
      sector TEXT, geo TEXT,
      purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS watchlist (
      id ${isPg ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPg ? '' : 'AUTOINCREMENT'},
      user_id TEXT, ticker TEXT,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, ticker)
    )`,
    `CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      user_id TEXT, ticker TEXT, score REAL, confidence REAL,
      decision TEXT, report TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS observability_logs (
      id ${isPg ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPg ? '' : 'AUTOINCREMENT'},
      endpoint TEXT, latency INTEGER, tokens INTEGER, cache_hit INTEGER,
      errors TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];
  for (const sql of tables) {
    try { await runQuery(sql); } catch (err) { console.error('Table creation error:', err.message); }
  }
}

// ─── Helpers: in-memory vs SQL ────────────────────────────────────────────────
const useMemory = () => IS_VERCEL && !isPg;

// ─── User Memory ──────────────────────────────────────────────────────────────
export async function saveUserMemory(userId, memory) {
  if (useMemory()) {
    mem.users.set(userId, { id: userId, memory: JSON.stringify(memory) });
    return;
  }
  const memStr = JSON.stringify(memory);
  const existing = await runQuery('SELECT id FROM users WHERE id = $1', [userId]);
  if (existing.length > 0) {
    await runQuery('UPDATE users SET memory = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [memStr, userId]);
  } else {
    await runQuery('INSERT INTO users (id, memory) VALUES ($1, $2)', [userId, memStr]);
  }
}

export async function getUserMemory(userId) {
  if (useMemory()) {
    const row = mem.users.get(userId);
    return row ? JSON.parse(row.memory) : null;
  }
  const rows = await runQuery('SELECT memory FROM users WHERE id = $1', [userId]);
  return rows.length > 0 ? JSON.parse(rows[0].memory) : null;
}

// ─── Portfolio ────────────────────────────────────────────────────────────────
export async function getPortfolio(userId) {
  if (useMemory()) return mem.portfolio.filter(r => r.user_id === userId);
  return await runQuery('SELECT * FROM portfolio WHERE user_id = $1', [userId]);
}

export async function savePortfolioItem(userId, item) {
  const { ticker, shares, avg_price, sector, geo } = item;
  if (useMemory()) {
    const idx = mem.portfolio.findIndex(r => r.user_id === userId && r.ticker === ticker);
    if (idx >= 0) {
      const prev = mem.portfolio[idx];
      const newShares = prev.shares + shares;
      const newPrice = ((prev.avg_price * prev.shares) + (avg_price * shares)) / newShares;
      mem.portfolio[idx] = { ...prev, shares: newShares, avg_price: newPrice, sector, geo };
    } else {
      mem.portfolio.push({ id: mem._nextId++, user_id: userId, ticker, shares, avg_price, sector, geo });
    }
    return;
  }
  const existing = await runQuery('SELECT id, shares, avg_price FROM portfolio WHERE user_id = $1 AND ticker = $2', [userId, ticker]);
  if (existing.length > 0) {
    const { id: eid, shares: ps, avg_price: pp } = existing[0];
    const ns = ps + shares;
    const np = ((pp * ps) + (avg_price * shares)) / ns;
    await runQuery('UPDATE portfolio SET shares=$1, avg_price=$2, sector=$3, geo=$4 WHERE id=$5', [ns, np, sector, geo, eid]);
  } else {
    await runQuery('INSERT INTO portfolio (user_id,ticker,shares,avg_price,sector,geo) VALUES ($1,$2,$3,$4,$5,$6)', [userId, ticker, shares, avg_price, sector, geo]);
  }
}

export async function clearPortfolio(userId) {
  if (useMemory()) { mem.portfolio = mem.portfolio.filter(r => r.user_id !== userId); return; }
  await runQuery('DELETE FROM portfolio WHERE user_id = $1', [userId]);
}

// ─── Watchlist ────────────────────────────────────────────────────────────────
export async function getWatchlist(userId) {
  if (useMemory()) return mem.watchlist.filter(r => r.user_id === userId).map(r => r.ticker);
  const rows = await runQuery('SELECT ticker FROM watchlist WHERE user_id = $1', [userId]);
  return rows.map(r => r.ticker);
}

export async function addToWatchlist(userId, ticker) {
  if (useMemory()) {
    const exists = mem.watchlist.some(r => r.user_id === userId && r.ticker === ticker);
    if (!exists) mem.watchlist.push({ id: mem._nextId++, user_id: userId, ticker });
    return;
  }
  try { await runQuery('INSERT INTO watchlist (user_id,ticker) VALUES ($1,$2)', [userId, ticker]); } catch {}
}

export async function removeFromWatchlist(userId, ticker) {
  if (useMemory()) { mem.watchlist = mem.watchlist.filter(r => !(r.user_id === userId && r.ticker === ticker)); return; }
  await runQuery('DELETE FROM watchlist WHERE user_id=$1 AND ticker=$2', [userId, ticker]);
}

// ─── Recommendations ──────────────────────────────────────────────────────────
export async function saveRecommendation(userId, rec) {
  const { id, ticker, score, confidence, decision, report } = rec;
  if (useMemory()) {
    mem.recommendations.unshift({ id, user_id: userId, ticker, score, confidence, decision, report: JSON.stringify(report), created_at: new Date().toISOString() });
    return;
  }
  await runQuery('INSERT INTO recommendations (id,user_id,ticker,score,confidence,decision,report) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id, userId, ticker, score, confidence, decision, JSON.stringify(report)]);
}

export async function getRecommendations(userId) {
  if (useMemory()) {
    return mem.recommendations.filter(r => r.user_id === userId).map(r => ({ ...r, report: JSON.parse(r.report) }));
  }
  const rows = await runQuery('SELECT * FROM recommendations WHERE user_id=$1 ORDER BY created_at DESC', [userId]);
  return rows.map(r => ({ ...r, report: JSON.parse(r.report) }));
}

// ─── Observability ────────────────────────────────────────────────────────────
export async function logObservability(log) {
  const { endpoint, latency, tokens, cache_hit, errors } = log;
  if (useMemory()) {
    mem.observability.unshift({ id: mem._nextId++, endpoint, latency, tokens, cache_hit, errors: errors ? String(errors) : null, timestamp: new Date().toISOString() });
    if (mem.observability.length > 100) mem.observability.pop(); // cap at 100
    return;
  }
  await runQuery('INSERT INTO observability_logs (endpoint,latency,tokens,cache_hit,errors) VALUES ($1,$2,$3,$4,$5)', [endpoint, latency, tokens, cache_hit, errors ? String(errors) : null]);
}

export async function getObservabilityLogs() {
  if (useMemory()) return mem.observability.slice(0, 100);
  return await runQuery('SELECT * FROM observability_logs ORDER BY timestamp DESC LIMIT 100');
}

// ─── Authentication ───────────────────────────────────────────────────────────
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export async function dbRegisterUser(username, password) {
  if (useMemory()) {
    if (mem.user_auth.has(username)) throw new Error('Username already exists.');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const userId = `user-${Math.random().toString(36).substring(2, 9)}`;
    mem.user_auth.set(username, { username, password_hash: hash, salt, user_id: userId, session_token: null });
    return userId;
  }
  const existing = await runQuery('SELECT username FROM user_auth WHERE username = $1', [username]);
  if (existing.length > 0) throw new Error('Username already exists.');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const userId = `user-${Math.random().toString(36).substring(2, 9)}`;
  await runQuery('INSERT INTO user_auth (username,password_hash,salt,user_id) VALUES ($1,$2,$3,$4)', [username, hash, salt, userId]);
  return userId;
}

export async function dbAuthenticateUser(username, password) {
  if (useMemory()) {
    const row = mem.user_auth.get(username);
    if (!row) throw new Error('Invalid username or password.');
    if (hashPassword(password, row.salt) !== row.password_hash) throw new Error('Invalid username or password.');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    row.session_token = sessionToken;
    mem.sessions.set(sessionToken, username);
    return { userId: row.user_id, sessionToken };
  }
  const rows = await runQuery('SELECT password_hash,salt,user_id FROM user_auth WHERE username=$1', [username]);
  if (rows.length === 0) throw new Error('Invalid username or password.');
  const { password_hash, salt, user_id } = rows[0];
  if (hashPassword(password, salt) !== password_hash) throw new Error('Invalid username or password.');
  const sessionToken = crypto.randomBytes(32).toString('hex');
  await runQuery('UPDATE user_auth SET session_token=$1 WHERE username=$2', [sessionToken, username]);
  return { userId: user_id, sessionToken };
}

export async function dbValidateSession(sessionToken) {
  if (!sessionToken) return null;
  if (useMemory()) {
    const username = mem.sessions.get(sessionToken);
    if (!username) return null;
    const row = mem.user_auth.get(username);
    return row ? row.user_id : null;
  }
  const rows = await runQuery('SELECT user_id FROM user_auth WHERE session_token=$1', [sessionToken]);
  return rows.length > 0 ? rows[0].user_id : null;
}

export async function dbDestroySession(sessionToken) {
  if (!sessionToken) return;
  if (useMemory()) {
    const username = mem.sessions.get(sessionToken);
    if (username) {
      const row = mem.user_auth.get(username);
      if (row) row.session_token = null;
      mem.sessions.delete(sessionToken);
    }
    return;
  }
  await runQuery('UPDATE user_auth SET session_token=NULL WHERE session_token=$1', [sessionToken]);
}
