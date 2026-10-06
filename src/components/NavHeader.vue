<template>
  <header class="nav-header">
    <div class="nav-inner">
      <!-- Logo 区域，点击返回首页 -->
      <div class="logo" @click="goHome">
        <span class="logo-icon">⚛</span>
        <span class="logo-text">初中物理经典实验模拟平台</span>
      </div>
      <!-- 导航链接 -->
      <nav class="nav-links">
        <router-link to="/" class="nav-link">首页</router-link>
        <!-- 已登录：头像 + 昵称 + 退出 -->
        <template v-if="userStore.isLoggedIn">
          <span class="user-chip">
            <span class="user-avatar">
              <img v-if="avatarIsImage" :src="userStore.userInfo.avatar" alt="头像" />
              <span v-else>{{ avatarText }}</span>
            </span>
            <span class="user-name">{{ userStore.username }}</span>
            <button class="logout-btn" @click="handleLogout">退出</button>
          </span>
        </template>
        <!-- 未登录：登录 / 注册入口 -->
        <template v-else>
          <router-link to="/login" class="nav-link">登录</router-link>
          <router-link to="/register" class="nav-link">注册</router-link>
        </template>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user.js'

const router = useRouter()
const userStore = useUserStore()

// 头像展示：base64 用图片，其余用文字/emoji
const avatarIsImage = computed(() => (userStore.userInfo?.avatar || '').startsWith('data:'))
const avatarText = computed(() => {
  const a = userStore.userInfo?.avatar || 'default'
  return a === 'default' ? '👤' : a
})

// 点击Logo跳转首页
const goHome = () => {
  router.push('/')
}

async function handleLogout() {
  await userStore.logout()
  router.push('/')
}
</script>

<style lang="scss" scoped>
.nav-header {
  // 深蓝渐变背景
  background: linear-gradient(90deg, $color-primary, $color-secondary);
  color: $color-text-primary;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  // 吸顶效果
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-inner {
  max-width: $content-max-width;
  margin: 0 auto;
  padding: 0 24px;
  height: $header-height;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@media (max-width: $bp-mobile) {
  .nav-inner {
    padding: 0 12px;
    height: 52px;
  }
  .logo-icon {
    font-size: 20px;
  }
  .logo-text {
    font-size: 15px;
    max-width: 58vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nav-link {
    font-size: 14px;
    padding: 10px 6px;
  }
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;

  .logo-icon {
    font-size: 24px;
    // 强调色高亮图标
    color: $color-accent;
  }

  .logo-text {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 1px;
  }
}

.nav-links {
  display: flex;
  gap: 24px;
  align-items: center;
}

.nav-link {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  font-size: 15px;
  transition: color 0.3s ease;

  // 选中态和hover态变为强调色
  &:hover,
  &.router-link-active {
    color: $color-accent;
  }
}

// —— 登录态展示 ——
.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  padding: 4px 8px 4px 4px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: $color-accent;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.user-name {
  font-size: 14px;
  color: $color-text-primary;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: $color-accent;
    color: $color-accent;
  }
}
</style>
