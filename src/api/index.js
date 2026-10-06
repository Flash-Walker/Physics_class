// src/api/index.js — axios 实例（含鉴权拦截器）
// 开发环境走 vite 代理（baseURL 留空），生产环境取 VITE_API_BASE
import axios from 'axios'

// 与 src/stores/user.js 保持一致的存储键
const TOKEN_KEY = 'pc_token'
const USER_KEY = 'pc_user'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 10000
})

// 请求拦截器：自动携带 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：401 统一处理（登录接口的 401 除外——那是密码错误提示）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    if (status === 401 && !url.includes('/api/auth/login')) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      const base = import.meta.env.BASE_URL || '/'
      if (window.location.pathname !== base) {
        window.location.assign(base)
      }
    }
    return Promise.reject(error)
  }
)

export default api
