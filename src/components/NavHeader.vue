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
      </nav>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

// 点击Logo跳转首页
const goHome = () => {
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
</style>
