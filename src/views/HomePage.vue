<template>
  <div class="home-page">
    <!-- 页面标题区 -->
    <div class="page-hero">
      <h1>初中物理经典实验模拟平台</h1>
      <p class="subtitle">交互式可视化仿真 · 助力物理课堂教学</p>
	  <!-- ===== 新增：测试按钮 ===== -->
	  <button class="test-btn" @click="testBuoyancy">点击测试浮力引擎</button>
    </div>

    <!-- 章节卡片网格 -->
    <div class="chapter-grid">
      <ChapterCard
        v-for="chapter in chapterList"
        :key="chapter.id"
        :id="chapter.id"
        :icon="chapter.icon"
        :title="chapter.title"
        :description="chapter.description"
        :experiment-count="chapter.count"
      />
    </div>
  </div>
</template>

<script setup>
import ChapterCard from '@/components/ChapterCard.vue'
import { PhysicsEngine } from '@/utils/physics/PhysicsEngine.js'
import { gravity as calcGravity } from '@/utils/physics/physicsUtils.js'

// ===== 新增：测试浮力引擎 =====
const testBuoyancy = () => {
  console.log('=== 浮力模拟测试开始 ===')

  // 创建引擎，启用液体环境（水，液面高度1m，容器底部0m）
  const engine = new PhysicsEngine({
    liquid: {
      enabled: true,
      density: 1000,
      surfaceHeight: 1.0,
      bottomHeight: 0
    }
  })

  // 添加木块：质量0.5kg，底面积0.01㎡，高度0.1m
  // 初始位置：物体底部在0.8m处（整体完全浸没在水中）
  const wood = engine.addBody({
    id: 'wood',
    mass: 0.5,
    position: 0.8,
    velocity: 0,
    geometry: {
      area: 0.01,
      height: 0.1
    }
  })

  // 施加重力（竖直向下，力为负值）
  const gravity = calcGravity(wood.mass)
  engine.addForce('wood', -gravity, 'gravity')

  // 帧数计数，运行5秒后自动停止
  let frameCount = 0

  // 监听每帧更新
  engine.onUpdate = (state) => {
    const body = state.bodies[0]
    frameCount++

    // 每10帧打印一次，避免刷屏
    if (frameCount % 10 === 0) {
      console.log(
        `t=${state.totalTime.toFixed(2)}s | ` +
        `位置:${body.position.toFixed(3)}m | ` +
        `浮力:${body.buoyancy.force.toFixed(3)}N | ` +
        `浸入深度:${body.buoyancy.immersedDepth.toFixed(4)}m | ` +
        `状态:${body.buoyancy.state}`
      )
    }

    // 运行8秒后自动停止
    if (state.totalTime >= 8) {
      engine.pause()
      console.log('=== 模拟结束，引擎已暂停 ===')
      console.log('最终漂浮时浮力应≈重力：', gravity.toFixed(3), 'N')
    }
  }

  // 启动模拟
  engine.start()
}

// 五大章节基础配置
const chapterList = [
  {
    id: 'mechanics',
    icon: '⚙️',
    title: '力学',
    description: '运动学、受力分析、杠杆滑轮、浮力等经典力学实验',
    count: 7
  },
  {
    id: 'heat',
    icon: '🔥',
    title: '热学',
    description: '物态变化、比热容、热传递与内能相关实验',
    count: 5
  },
  {
    id: 'acoustics',
    icon: '🔊',
    title: '声学',
    description: '声音波形与频谱观察、回声测距模拟实验',
    count: 2
  },
  {
    id: 'optics',
    icon: '💡',
    title: '光学',
    description: '光的反射折射、凸透镜成像、平面镜成像实验',
    count: 6
  },
  {
    id: 'electricity',
    icon: '⚡',
    title: '电学',
    description: '串并联电路、欧姆定律、电功率与焦耳定律实验',
    count: 1
  }
]
</script>

<style lang="scss" scoped>
.home-page {
  padding: 40px 0 60px;
}

.page-hero {
  text-align: center;
  margin-bottom: 48px;

  h1 {
    font-size: 34px;
    color: $color-primary;
    font-weight: 700;
    margin-bottom: 12px;
    letter-spacing: 1px;
  }

  .subtitle {
    font-size: 16px;
    color: $color-text-muted;
  }
}

.chapter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
