<template>
  <!-- 在线人数固定栏（仅首页底部展示）；接口失败时静默隐藏，不打扰用户 -->
  <div v-if="visible" class="online-counter" aria-label="当前在线人数">
    <span class="pulse-dot"></span>
    <span class="counter-text">当前在线 <strong class="counter-num">{{ online }}</strong> 人</span>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import api from '@/api/index.js'

const online = ref(0)
const visible = ref(false)
const POLL_INTERVAL = 30 * 1000 // 30s 轮询
let timer = null

async function fetchOnline() {
  try {
    const { data } = await api.get('/api/stats/online')
    if (data.code === 0) {
      online.value = data.data.online
      visible.value = true
    }
  } catch {
    // 静默降级：接口不可用时保持隐藏/旧值，不报错不打扰
  }
}

onMounted(() => {
  fetchOnline()
  timer = setInterval(fetchOnline, POLL_INTERVAL)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.online-counter {
  position: fixed;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 18px;
  background: linear-gradient(135deg, rgba(30, 64, 105, 0.92), rgba(20, 45, 80, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(4px);
  pointer-events: none; // 纯展示，不拦截页面点击
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.6);
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.55); }
  70% { box-shadow: 0 0 0 8px rgba(74, 222, 128, 0); }
  100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
}

.counter-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.92);
}

.counter-num {
  font-size: 15px;
  color: #4ade80;
  font-weight: 700;
}

@media (max-width: $bp-mobile) {
  .online-counter {
    bottom: 12px;
    padding: 6px 14px;
    gap: 6px;
  }
  .counter-text {
    font-size: 12px;
  }
}
</style>
