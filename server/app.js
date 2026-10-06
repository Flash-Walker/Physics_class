// server/app.js — Express 入口（v2.0.0 骨架）
// Sprint 0：健康检查 + CORS + 数据库就绪；业务路由自 Sprint 1 起逐步挂载
import express from 'express'
import db from './db.js'
import authRouter from './routes/auth.js'
import userRouter from './routes/user.js'
import statsRouter from './routes/stats.js'

const app = express()
const PORT = process.env.PORT || 3000

// 解析 JSON；头像可能以 base64 提交，放宽体积限制
app.use(express.json({ limit: '2mb' }))

// CORS 白名单（本地开发 + GitHub Pages 生产域名；后续部署可追加）
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://flash-walker.github.io'
])

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// 健康检查（也用于部署探活）
app.get('/api/health', (req, res) => {
  res.json({ code: 0, data: { status: 'ok', version: '2.0.0' } })
})

// —— 业务路由 ——
app.use('/api/auth', authRouter)   // Sprint 1：注册；Sprint 2：登录/登出
app.use('/api/user', userRouter)   // Sprint 2：/user/me（JWT 鉴权）
app.use('/api/stats', statsRouter) // Sprint 3：心跳 / 在线人数

// 统一 404
app.use((req, res) => {
  res.status(404).json({ code: 40400, message: '接口不存在' })
})

app.listen(PORT, () => {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n
  console.log(`[physics-class] API server v2.0.0 running at http://localhost:${PORT}`)
  console.log(`[physics-class] users 表就绪，当前用户数：${count}`)
})
