<template>
  <div class="chapter-page">
    <!-- 顶部导航与标题 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">← 返回首页</button>
      <h2>{{ currentChapter.title }} · 实验列表</h2>
    </div>

    <!-- 实验条目列表 -->
    <div class="experiment-list">
      <div
        v-for="exp in currentChapter.experiments"
        :key="exp.id"
        class="experiment-item"
        @click="goToExperiment(exp.id)"
      >
        <div class="exp-number">{{ exp.num }}</div>
        <div class="exp-info">
          <h3 class="exp-name">{{ exp.name }}</h3>
          <p class="exp-desc">{{ exp.description }}</p>
        </div>
        <div class="exp-arrow">进入实验 →</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()

// 各章节实验数据配置
const chapterData = {
  mechanics: {
    title: '力学',
    experiments: [
      { id: 'meeting', num: '01', name: '相遇&追及问题', description: '直道与环形跑道下的两物体相遇、追及模拟' },
      { id: 'train-bridge', num: '02', name: '火车过桥问题', description: '列车完全过桥路程分析' },
      { id: 'force-composition', num: '03', name: '力的合成与分解', description: '平行四边形定则可视化' },
      { id: 'lever', num: '04', name: '杠杆平衡', description: '杠杆原理与平衡条件实验' },
      { id: 'pulley', num: '05', name: '滑轮组', description: '定滑轮动滑轮与机械效率' },
      { id: 'buoyancy', num: '06', name: '浮力与阿基米德原理', description: '浮力大小与排液体积关系' },
      { id: 'efficiency', num: '07', name: '简单机械效率', description: '有用功、额外功与机械效率' }
    ]
  },
  // 其余章节后续逐步补充
  heat: { title: '热学', experiments: [] },
  acoustics: { title: '声学', experiments: [] },
  optics: { title: '光学', experiments: [] },
  electricity: { title: '电学', experiments: [] }
}

// 根据路由参数获取当前章节数据
const currentChapter = computed(() => {
  const id = route.params.id
  return chapterData[id] || { title: '未知章节', experiments: [] }
})

// 返回首页
const goBack = () => {
  router.push('/')
}

// 跳转到对应实验页
const goToExperiment = (expId) => {
  router.push(`/experiment/${route.params.id}/${expId}`)
}
</script>

<style lang="scss" scoped>
.chapter-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 0;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;

  h2 {
    font-size: 24px;
    color: $color-primary;
    font-weight: 600;
  }
}

.back-btn {
  background: none;
  border: none;
  color: $color-tech-blue;
  font-size: 15px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: $radius-sm;
  transition: background 0.2s;

  &:hover {
    background: rgba(74, 144, 226, 0.1);
  }
}

.experiment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.experiment-item {
  background: $color-card-bg;
  border-radius: $radius-card;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: $shadow-card;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;

  &:hover {
    border-color: $color-tech-blue;
    transform: translateX(4px);
  }
}

.exp-number {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: $color-primary;
  color: $color-accent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.exp-info {
  flex: 1;

  .exp-name {
    font-size: 18px;
    color: $color-primary;
    margin-bottom: 4px;
    font-weight: 500;
  }

  .exp-desc {
    font-size: 14px;
    color: $color-text-muted;
  }
}

.exp-arrow {
  color: $color-tech-blue;
  font-size: 14px;
  font-weight: 500;
}
</style>
