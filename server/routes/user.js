// server/routes/user.js — 用户信息路由
import { Router } from 'express'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/user/me — 当前登录用户信息
router.get('/me', requireAuth, (req, res) => {
  const row = db
    .prepare('SELECT uid, username, avatar, gender, birthday, occupation, created_at FROM users WHERE uid = ?')
    .get(req.user.uid)
  if (!row) {
    return res.status(401).json({ code: 40100, message: '账号不存在，请重新登录' })
  }
  res.json({ code: 0, data: row })
})

export default router
