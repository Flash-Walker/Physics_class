// src/api/index.js — axios 实例
// baseURL：开发环境走 vite 代理（留空），生产环境取 VITE_API_BASE
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 10000
})

export default api
