// server/middleware/auth.js — JWT 鉴权中间件
// 校验 Authorization: Bearer <token>，通过后在 req.user 上挂载 token payload
import { verifyToken } from '../utils/jwt.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null
  if (!token) {
    return res.status(401).json({ code: 40100, message: '未登录' })
  }
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    return res.status(401).json({ code: 40100, message: '登录已过期，请重新登录' })
  }
}
