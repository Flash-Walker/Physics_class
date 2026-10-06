// server/middleware/rateLimit.js — 简单内存限流（单 IP 时间窗口内次数限制）
export function rateLimit(max, windowMs) {
  const hits = new Map()
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const now = Date.now()
    const list = (hits.get(ip) || []).filter((t) => now - t < windowMs)
    if (list.length >= max) {
      return res.status(429).json({ code: 42900, message: '请求过于频繁，请稍后再试' })
    }
    list.push(now)
    hits.set(ip, list)
    // 防止 Map 无限增长（超过 1 万 IP 条目时整体重置）
    if (hits.size > 10000) hits.clear()
    next()
  }
}
