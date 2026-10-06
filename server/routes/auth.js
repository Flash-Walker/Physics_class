// server/routes/auth.js — 认证路由
// Sprint 1：注册；Sprint 2：登录 / 登出
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { generateUid } from '../utils/uid.js'
import { signToken } from '../utils/jwt.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()

// —— 校验规则（与前端注册页保持一致）——
const USERNAME_RE = /^[\u4e00-\u9fa5A-Za-z0-9_]{2,20}$/
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/
const GENDERS = new Set(['male', 'female', 'secret'])
const OCCUPATIONS = new Set(['teacher', 'student', 'other'])
const MAX_AVATAR_BYTES = 200 * 1024 // 头像 base64 体积上限 200KB

function validate(body) {
  const { username, password, gender, birthday, occupation, avatar } = body
  if (!username || !USERNAME_RE.test(username)) return '用户名需为 2~20 位中文/字母/数字/下划线'
  if (!password || !PASSWORD_RE.test(password)) return '密码需至少 8 位且包含字母和数字'
  if (!gender || !GENDERS.has(gender)) return '请选择性别'
  if (!occupation || !OCCUPATIONS.has(occupation)) return '请选择职业'
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return '请选择出生年月日'
  const d = new Date(birthday + 'T00:00:00')
  const today = new Date()
  const min = new Date('1900-01-01T00:00:00')
  if (Number.isNaN(d.getTime()) || d < min || d > today) return '出生日期超出有效范围'
  if (avatar && avatar.startsWith('data:image/') && avatar.length * 0.75 > MAX_AVATAR_BYTES) {
    return '头像文件过大（需 ≤200KB）'
  }
  return null
}

// POST /api/auth/register — 注册（注册即自动登录，返回 token）
// 限流：默认单 IP 10 次/分钟，可用环境变量 REGISTER_LIMIT 调整（测试/部署场景）
router.post('/register', rateLimit(Number(process.env.REGISTER_LIMIT) || 10, 60 * 1000), (req, res) => {
  const { username = '', password = '', avatar, gender, birthday, occupation } = req.body || {}

  const err = validate({ username, password, gender, birthday, occupation, avatar })
  if (err) return res.status(400).json({ code: 40003, message: err })

  // 用户名查重
  const dup = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (dup) return res.status(409).json({ code: 40001, message: '用户名已被占用' })

  const passwordHash = bcrypt.hashSync(password, 10)

  // 生成 UID 并入库（UNIQUE 索引兜底，冲突自动重试最多 3 次）
  const insert = db.prepare(
    'INSERT INTO users (uid, username, password_hash, avatar, gender, birthday, occupation) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  let uid = null
  for (let attempt = 0; attempt < 3; attempt++) {
    uid = generateUid()
    try {
      insert.run(uid, username, passwordHash, avatar || 'default', gender, birthday, occupation)
      break
    } catch (e) {
      const msg = String(e.message)
      if (msg.includes('UNIQUE') && attempt < 2) continue
      console.error('[register] 写入失败:', e)
      return res.status(500).json({ code: 50000, message: '服务器内部错误' })
    }
  }

  const token = signToken({ uid, username })
  res.json({
    code: 0,
    data: {
      uid,
      username,
      avatar: avatar || 'default',
      gender,
      birthday,
      occupation,
      token
    }
  })
})

export default router
