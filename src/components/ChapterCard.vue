<template>
  <div class="chapter-card" @click="handleClick">
    <!-- 章节图标 -->
    <div class="card-icon">{{ icon }}</div>
    <!-- 章节标题 -->
    <h3 class="card-title">{{ title }}</h3>
    <!-- 章节简介 -->
    <p class="card-desc">{{ description }}</p>
    <!-- 实验数量统计 -->
    <div class="card-footer">
      <span class="count-num">{{ experimentCount }}</span>
      <span class="count-text">个经典实验</span>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

// 定义组件接收的参数
const props = defineProps({
  // 章节唯一标识，用于路由跳转
  id: {
    type: String,
    required: true
  },
  // 章节图标
  icon: {
    type: String,
    default: '📘'
  },
  // 章节名称
  title: {
    type: String,
    required: true
  },
  // 章节简介
  description: {
    type: String,
    default: ''
  },
  // 包含实验数量
  experimentCount: {
    type: Number,
    default: 0
  }
})

const router = useRouter()

// 点击卡片跳转到对应章节列表页
const handleClick = () => {
  router.push(`/chapter/${props.id}`)
}
</script>

<style lang="scss" scoped>
.chapter-card {
  background: $color-card-bg;
  border-radius: $radius-card;
  padding: 28px 24px;
  box-shadow: $shadow-card;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid $color-border;
  display: flex;
  flex-direction: column;

  // hover上浮+高亮边框效果
  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-card-hover;
    border-color: $color-tech-blue;
  }
}

.card-icon {
  font-size: 36px;
  margin-bottom: 12px;
  line-height: 1;
}

@media (max-width: $bp-mobile) {
  .chapter-card {
    padding: 18px 16px;
    flex-direction: row;
    align-items: center;
    gap: 14px;
  }
  .card-icon {
    font-size: 30px;
    margin-bottom: 0;
  }
  .card-desc {
    min-height: 0;
    font-size: 13px;
    margin-bottom: 8px;
  }
  .card-footer {
    padding-top: 8px;
    border-top: none;
    .count-num {
      font-size: 20px;
    }
  }
  .card-title {
    font-size: 17px;
  }
}

.card-title {
  font-size: 20px;
  color: $color-primary;
  margin-bottom: 8px;
  font-weight: 600;
}

.card-desc {
  font-size: 14px;
  color: $color-text-muted;
  line-height: 1.6;
  margin-bottom: 16px;
  // 固定简介高度，保证卡片对齐
  min-height: 44px;
  flex: 1;
}

.card-footer {
  display: flex;
  align-items: baseline;
  gap: 6px;
  border-top: 1px solid $color-border;
  padding-top: 12px;

  .count-num {
    font-size: 24px;
    font-weight: 700;
    // 实验数量用强调色突出
    color: $color-accent;
  }

  .count-text {
    font-size: 13px;
    color: $color-text-muted;
  }
}
</style>
