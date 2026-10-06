// server/utils/jwt.js — JWT 签发与验证
// 生产环境必须通过环境变量注入 JWT_SECRET（见部署章节），开发环境有默认值
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'physics-class-dev-secret-change-me'
const EXPIRES_IN = '7d'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET)
}
