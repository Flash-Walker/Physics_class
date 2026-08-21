<template>
  <div class="experiment-page">
    <!-- 三栏主布局：左控制面板 + 中画布 + 右数据面板 -->
    <div class="layout-main">
      <!-- 左侧：参数控制面板 -->
      <aside class="panel control-panel" :class="{ 'panel-open': activePanel === 'control' }">
        <div class="panel-title">
          参数控制
          <button class="panel-close" @click="activePanel = null">✕ 关闭</button>
        </div>
        <slot name="control">
          <p class="panel-placeholder">请在此处添加实验参数控制器</p>
        </slot>
      </aside>

      <!-- 中间：模拟画布区域 -->
      <section class="canvas-wrapper">
        <div class="canvas-header">
          <div class="canvas-title-wrap">
            <span class="canvas-title">{{ experimentTitle }}</span>
            <span class="run-state" :class="runState">{{ runStateText }}</span>
          </div>
          <div class="control-buttons">
            <button class="btn btn-secondary drawer-btn" @click="togglePanel('control')">⚙ 参数</button>
            <button class="btn btn-secondary drawer-btn" @click="togglePanel('data')">📊 数据</button>
            <button class="btn btn-primary" @click="$emit('start')">开始</button>
            <button class="btn btn-secondary" @click="$emit('pause')">暂停</button>
            <button class="btn btn-reset" @click="$emit('reset')">重置</button>
          </div>
        </div>
        <div class="canvas-body">
          <slot name="canvas">
            <p class="canvas-placeholder">Canvas 模拟画布区域</p>
          </slot>
        </div>
      </section>

      <!-- 右侧：实时数据面板 -->
      <aside class="panel data-panel" :class="{ 'panel-open': activePanel === 'data' }">
        <div class="panel-title">
          实时数据
          <button class="panel-close" @click="activePanel = null">✕ 关闭</button>
        </div>
        <slot name="data">
          <p class="panel-placeholder">请在此处添加实验数据展示</p>
        </slot>
      </aside>
    </div>

    <!-- 底部：实验原理折叠面板 -->
    <!-- 移动端抽屉遮罩 -->
    <div v-if="activePanel" class="drawer-mask" @click="activePanel = null"></div>

    <div class="theory-panel">
      <div class="theory-header" @click="isTheoryOpen = !isTheoryOpen">
        <span>📖 实验原理与公式说明</span>
        <span class="toggle-icon">{{ isTheoryOpen ? '收起 ▲' : '展开 ▼' }}</span>
      </div>
      <div v-show="isTheoryOpen" class="theory-body">
        <slot name="theory">
          <p>此处展示对应实验的物理原理、推导公式与注意事项。</p>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 接收实验标题
const props = defineProps({
  experimentTitle: {
    type: String,
    default: '物理实验模拟'
  },
  // 引擎运行状态：idle / running / paused
  runState: {
    type: String,
    default: 'idle'
  }
})

// 状态徽标文案
const runStateText = computed(() => {
  const map = {
    idle: '待开始',
    running: '● 运行中',
    paused: '⏸ 已暂停',
    finished: '🏁 已完成'
  }
  return map[props.runState] || '待开始'
})

// 向父组件暴露操作事件
defineEmits(['start', 'pause', 'reset'])

// 原理面板展开状态
const isTheoryOpen = ref(false)

// 移动端抽屉：null / 'control' / 'data'
const activePanel = ref(null)
const togglePanel = (name) => {
  activePanel.value = activePanel.value === name ? null : name
}
</script>

<style lang="scss" scoped>
.experiment-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ========== 三栏主布局 ========== */
.layout-main {
  display: grid;
  grid-template-columns: $sidebar-width 1fr $sidebar-width;
  gap: 16px;
  height: calc(100vh - #{$header-height} - 120px);
  min-height: 520px;
}

.panel {
  background: $color-secondary;
  color: $color-text-primary;
  border-radius: $radius-card;
  padding: 16px;
  box-shadow: $shadow-panel;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  color: $color-accent;
}

.panel-placeholder {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  text-align: center;
  padding: 40px 0;
}

/* ========== 中间画布区 ========== */
.canvas-wrapper {
  background: $color-card-bg;
  border-radius: $radius-card;
  box-shadow: $shadow-panel;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.canvas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid $color-border;
  background: #fafbfc;
}

.canvas-title {
  font-size: 16px;
  font-weight: 600;
  color: $color-primary;
}

.canvas-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.run-state {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 500;

  &.idle {
    color: $color-text-muted;
    background: $color-bg;
    border: 1px solid $color-border;
  }

  &.running {
    color: $color-success;
    background: rgba(82, 196, 26, 0.1);
    border: 1px solid rgba(82, 196, 26, 0.3);
  }

  &.paused {
    color: $color-accent;
    background: rgba(245, 166, 35, 0.1);
    border: 1px solid rgba(245, 166, 35, 0.3);
  }

  &.finished {
    color: $color-success;
    background: rgba(82, 196, 26, 0.12);
    border: 1px solid rgba(82, 196, 26, 0.4);
  }
}

.control-buttons {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 16px;
  border: none;
  border-radius: $radius-sm;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-primary {
  background: $color-tech-blue;
  color: #fff;
  &:hover { background: #3b7fc4; }
}

.btn-secondary {
  background: $color-secondary;
  color: #fff;
  &:hover { background: #183050; }
}

.btn-reset {
  background: #fff;
  color: $color-primary;
  border: 1px solid $color-border;
  &:hover { background: $color-bg; }
}

.canvas-body {
  flex: 1;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-placeholder {
  color: $color-text-muted;
  font-size: 14px;
}

/* ========== 底部原理面板 ========== */
.theory-panel {
  background: $color-card-bg;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  overflow: hidden;
}

.theory-header {
  padding: 14px 20px;
  background: $color-primary;
  color: $color-text-primary;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-weight: 500;
  user-select: none;
  transition: background 0.2s;
  &:hover { background: #081e33; }
}

.toggle-icon {
  font-size: 12px;
  opacity: 0.8;
}

.theory-body {
  padding: 20px 24px;
  line-height: 1.8;
  color: $color-text-dark;
  font-size: 14px;
}

/* ===== 移动端抽屉控件（桌面端隐藏） ===== */
.drawer-btn,
.panel-close {
  display: none;
}

.drawer-mask {
  display: none;
}

/* ===== 移动端适配：画布优先 + 底部抽屉 ===== */
@media (max-width: $bp-mobile) {
  .layout-main {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 52px - 40px);
    min-height: 0;
    gap: 10px;
  }

  .canvas-wrapper {
    flex: 1;
    min-height: 0;
  }

  /* 左右面板 → 固定底部抽屉 */
  .panel.control-panel,
  .panel.data-panel {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 58vh;
    max-height: 480px;
    z-index: 300;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.25);
    transform: translateY(105%);
    transition: transform 0.28s ease;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));

    &.panel-open {
      transform: translateY(0);
    }
  }

  .panel-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-close {
    display: inline-block;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: #fff;
    border-radius: 14px;
    padding: 5px 14px;
    font-size: 13px;
    cursor: pointer;
  }

  .drawer-mask {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.42);
    z-index: 290;
  }

  /* 抽屉按钮在移动端显示 */
  .drawer-btn {
    display: inline-block;
  }

  .canvas-header {
    padding: 8px 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .canvas-title {
    font-size: 14px;
  }

  .control-buttons {
    flex-wrap: wrap;
    gap: 6px;
  }

  .btn {
    padding: 8px 12px;
    font-size: 13px;
  }

  .canvas-body {
    padding: 8px;
  }

  .theory-header {
    padding: 12px 14px;
    font-size: 14px;
  }

  .theory-body {
    padding: 14px 16px;
    font-size: 13px;
  }
}
</style>
