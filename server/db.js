// server/db.js — SQLite 初始化与 users 表
// 数据库文件位于 server/data/physics.db（已在 .gitignore 中排除）
import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(path.join(dataDir, 'physics.db'))
db.pragma('journal_mode = WAL')

// users 表（见《用户系统升级方案》5.1 节）
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    uid            TEXT NOT NULL UNIQUE,            -- 对外用户ID，如 U7K3Q9X2M
    username       TEXT NOT NULL UNIQUE,            -- 用户名（唯一）
    password_hash  TEXT NOT NULL,                   -- bcrypt 哈希
    avatar         TEXT NOT NULL DEFAULT 'default', -- 预设头像标识 或 base64
    gender         TEXT NOT NULL DEFAULT 'secret',  -- male / female / secret
    birthday       TEXT,                            -- YYYY-MM-DD
    occupation     TEXT NOT NULL DEFAULT 'student', -- teacher / student / other
    created_at     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    last_active_at TEXT,                            -- 心跳时间，在线统计依据
    UNIQUE (uid)
  );

  CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
`)

export default db
