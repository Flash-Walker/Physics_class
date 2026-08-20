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
        :class="{ dev: exp.status !== 'done' }"
        @click="goToExperiment(exp)"
      >
        <div class="exp-number">{{ exp.num }}</div>
        <div class="exp-info">
          <h3 class="exp-name">
            {{ exp.name }}
            <span v-if="exp.status !== 'done'" class="dev-badge">开发中</span>
          </h3>
          <p class="exp-desc">{{ exp.description }}</p>
        </div>
        <div class="exp-arrow">{{ exp.status === 'done' ? '进入实验 →' : '敬请期待' }}</div>
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
  optics: {
    title: '光学',
    experiments: [
      { id: 'straight-line', num: '01', name: '光的直线传播与小孔成像', description: '光沿直线传播的经典验证：小孔成像的倒立实像', status: 'done' },
      { id: 'reflection', num: '02', name: '光的反射定律', description: '探究反射角与入射角的关系及三线共面规律', status: 'done' },
      { id: 'mirror', num: '03', name: '平面镜成像', description: '探究像与物的对称关系：等大、正立、虚像的作图', status: 'done' },
      { id: 'refraction', num: '04', name: '光的折射', description: '光从空气斜射入水中的偏折规律', status: 'dev' },
      { id: 'convex-lens', num: '05', name: '凸透镜成像规律', description: '五区成像规律与照相机/投影仪/放大镜', status: 'done' },
      { id: 'dispersion', num: '06', name: '光的色散', description: '三棱镜分解白光：红橙黄绿蓝靛紫', status: 'dev' }
    ]
  },
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

// 跳转到对应实验页（未完成实验拦截提示）
const goToExperiment = (exp) => {
  if (exp.status !== 'done') {
    alert('该实验正在开发中，敬请期待～')
    return
  }
  router.push(`/experiment/${route.params.id}/${exp.id}`)
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

  // 开发中实验：半透明 + 禁止点击
  &.dev {
    opacity: 0.6;
    cursor: not-allowed;

    &:hover {
      border-color: transparent;
      transform: none;
    }
  }
}

.dev-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: normal;
  color: $color-accent;
  background: rgba(245, 166, 35, 0.12);
  border: 1px solid rgba(245, 166, 35, 0.4);
  border-radius: 10px;
  padding: 1px 8px;
  margin-left: 8px;
  vertical-align: 2px;
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
