<template>
  <div class="app-container">
    <NavHeader />
    <main class="page-main">
      <router-view />
    </main>
    <Footer />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import NavHeader from '@/components/NavHeader.vue'
import Footer from '@/components/Footer.vue'
import { useUserStore } from '@/stores/user.js'
import api from '@/api/index.js'

const userStore = useUserStore()

let heartbeatTimer = null

// 登录用户心跳：启动时立即上报一次，之后每 60s 一次（Sprint 3 在线统计依据）
function startHeartbeat() {
  if (!userStore.isLoggedIn) return
  const beat = () => {
    if (!userStore.isLoggedIn) return
    api.post('/api/stats/heartbeat').catch(() => {}) // 静默，失败不影响使用
  }
  beat()
  heartbeatTimer = setInterval(beat, 60 * 1000)
}

// 应用启动：恢复并校验登录态，随后启动心跳
onMounted(async () => {
  await userStore.initialize()
  startHeartbeat()
})

onBeforeUnmount(() => {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
})
</script>

<style lang="scss">
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: "Source Han Sans CN", "思源黑体", "Microsoft YaHei", sans-serif;
  background-color: $color-bg;
  color: $color-text-dark;
  line-height: 1.5;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1;
  width: 100%;
  max-width: $content-max-width;
  margin: 0 auto;
  padding: 0 24px;
}

/* ===== 移动端全局适配 ===== */
* {
  -webkit-tap-highlight-color: transparent;
}

@media (max-width: $bp-mobile) {
  .page-main {
    padding: 0 12px;
  }
}
</style>
