// server/routes/stats.js — 在线人数统计（Sprint 3）
// 口径：最近 3 分钟内发过心跳的已登录用户
import { Router } from 'express'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()

// 内存缓存：online 统计 10s 内不重复查库
let cache = { count: 0, expiresAt: 0 }
const ONLINE_WINDOW_MIN = 3 // 在线窗口：最近 3 分钟
const CACHE_TTL_MS = 10 * 1000

// POST /api/stats/heartbeat — 登录用户心跳（更新 last_active_at）
// 限流：默认单 IP 60 次/分钟（HEARTBEAT_LIMIT 可调），防止滥用刷库
router.post('/heartbeat', rateLimit(Number(process.env.HEARTBEAT_LIMIT) || 60, 60 * 1000), requireAuth, (req, res) => {
  db.prepare("UPDATE users SET last_active_at = datetime('now','localtime') WHERE uid = ?").run(req.user.uid)
  res.json({ code: 0, data: { ok: true } })
})

// GET /api/stats/online — 当前在线人数（公开接口，匿名可查）
router.get('/online', (req, res) => {
  const now = Date.now()
  if (now < cache.expiresAt) {
    return res.json({ code: 0, data: { online: cache.count } })
  }
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE last_active_at IS NOT NULL AND last_active_at >= datetime('now','localtime', ?)")
    .get(`-${ONLINE_WINDOW_MIN} minutes`)
  cache = { count: row.n, expiresAt: now + CACHE_TTL_MS }
  res.json({ code: 0, data: { online: row.n } })
})

export default router
