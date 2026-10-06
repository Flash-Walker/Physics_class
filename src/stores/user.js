// src/stores/user.js — 用户登录态管理（Pinia）
import { defineStore } from 'pinia'
import api from '@/api/index.js'

const TOKEN_KEY = 'pc_token'
const USER_KEY = 'pc_user'

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    userInfo: readUser()
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    username: (state) => state.userInfo?.username || '',
    uid: (state) => state.userInfo?.uid || ''
  },
  actions: {
    // 写入登录态（注册/登录成功后调用）
    setLogin(data) {
      this.token = data.token
      this.userInfo = {
        uid: data.uid,
        username: data.username,
        avatar: data.avatar || 'default',
        gender: data.gender,
        birthday: data.birthday,
        occupation: data.occupation
      }
      localStorage.setItem(TOKEN_KEY, this.token)
      localStorage.setItem(USER_KEY, JSON.stringify(this.userInfo))
    },

    // 登录（返回统一结果对象，供页面展示错误）
    async login(username, password) {
      try {
        const { data } = await api.post('/api/auth/login', { username, password })
        if (data.code === 0) {
          this.setLogin(data.data)
          return { ok: true }
        }
        return { ok: false, message: data.message || '登录失败' }
      } catch (e) {
        return { ok: false, message: e.response?.data?.message || '网络异常，请稍后重试' }
      }
    },

    // 拉取最新用户信息（登录态恢复）
    async fetchMe() {
      if (!this.token) return null
      const { data } = await api.get('/api/user/me')
      if (data.code === 0) {
        this.userInfo = { ...this.userInfo, ...data.data }
        localStorage.setItem(USER_KEY, JSON.stringify(this.userInfo))
        return this.userInfo
      }
      return null
    },

    // 登出（调用登出接口并清理本地状态）
    async logout() {
      try {
        await api.post('/api/auth/logout')
      } catch {
        // 登出接口失败不阻塞本地登出
      }
      this.clear()
    },

    // 清理本地登录态
    clear() {
      this.token = ''
      this.userInfo = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },

    // 应用启动时调用：有 token 则校验并恢复最新信息，失败自动登出
    async initialize() {
      if (!this.token) return
      try {
        await this.fetchMe()
      } catch {
        this.clear()
      }
    }
  }
})
