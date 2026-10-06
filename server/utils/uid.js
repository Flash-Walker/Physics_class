// server/utils/uid.js — 用户 UID 生成
// 规则：U + 9 位字符；前 5 位由毫秒时间戳 base36 派生（时间可回溯），后 4 位加密随机
// 随机部分字符集去除易混淆的 0/O/1/I；唯一性由 users.uid UNIQUE 索引兜底 + 写入重试
import { randomInt } from 'node:crypto'

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // 32 字符，无易混淆字符

function randomChars(n) {
  let s = ''
  for (let i = 0; i < n; i++) {
    s += ALPHABET[randomInt(0, ALPHABET.length)]
  }
  return s
}

export function generateUid() {
  const tsPart = Date.now().toString(36).toUpperCase().slice(-5).padStart(5, '0')
  return 'U' + tsPart + randomChars(4)
}
