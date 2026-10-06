// src/stores/user.js — 用户登录态管理（Pinia）
// Sprint 1：注册后写入登录态；Sprint 2 扩展 login/logout/fetchMe
import { defineStore } from 'pinia'

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
    // 清除登录态
    logout() {
      this.token = ''
      this.userInfo = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  }
})
