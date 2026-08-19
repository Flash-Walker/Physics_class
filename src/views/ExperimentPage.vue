<template>
  <div class="experiment-page">
    <div class="exp-header">
      <button class="back-btn" @click="goBack">← 返回章节列表</button>
      <h2 class="exp-title">{{ experimentName }}</h2>
    </div>

    <!-- 动态渲染实验组件 -->
    <component :is="currentExperiment" v-if="currentExperiment" />
    <div v-else class="empty-tip">该实验正在开发中...</div>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 实验组件映射表（后续新增实验在此注册）
const experimentComponents = {
  'mechanics/meeting': defineAsyncComponent(() => import('./experiments/MeetingExperiment.vue')),
  'mechanics/train-bridge': defineAsyncComponent(() => import('./experiments/TrainBridgeExperiment.vue')),
  'mechanics/force-composition': defineAsyncComponent(() => import('./experiments/ForceCompositionExperiment.vue')),
  'mechanics/lever': defineAsyncComponent(() => import('./experiments/LeverExperiment.vue')),
  'mechanics/pulley': defineAsyncComponent(() => import('./experiments/PulleyExperiment.vue')),
  'mechanics/buoyancy': defineAsyncComponent(() => import('./experiments/BuoyancyExperiment.vue')),
  'mechanics/efficiency': defineAsyncComponent(() => import('./experiments/EfficiencyExperiment.vue'))
}

// 当前实验组件
const currentExperiment = computed(() => {
  const key = `${route.params.chapterId}/${route.params.expId}`
  return experimentComponents[key] || null
})

// 实验名称
const experimentName = computed(() => {
  const nameMap = {
    meeting: '相遇&追及问题',
    'train-bridge': '火车过桥问题',
    'force-composition': '力的合成与分解',
    lever: '杠杆平衡',
    pulley: '滑轮组',
    buoyancy: '浮力与阿基米德原理',
    efficiency: '简单机械效率'
  }
  return nameMap[route.params.expId] || '物理实验'
})

const goBack = () => {
  router.push(`/chapter/${route.params.chapterId}`)
}
</script>

<style lang="scss" scoped>
.experiment-page {
  padding: 16px 0;
  height: calc(100vh - 64px - 40px);
  display: flex;
  flex-direction: column;
}

.exp-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  .exp-title {
    font-size: 22px;
    color: $color-primary;
    font-weight: 600;
    margin: 0;
  }
}

.back-btn {
  background: none;
  border: none;
  color: $color-tech-blue;
  font-size: 15px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 4px;

  &:hover {
    background: rgba(24, 144, 255, 0.1);
  }
}

.empty-tip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 16px;
}
</style>
