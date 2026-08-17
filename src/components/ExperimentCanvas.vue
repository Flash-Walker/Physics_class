<template>
  <canvas ref="canvasRef" class="experiment-canvas"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  // 绘制函数（必填）：(ctx, state, utils) => {}
  draw: {
    type: Function,
    required: true
  },
  // 当前物理状态数据，变化时自动重绘
  state: {
    type: Object,
    default: () => ({})
  },
  // 缩放比例：1米对应多少像素
  scale: {
    type: Number,
    default: 50
  },
  // 物理坐标系原点在画布中的位置（比例 0~1）
  // 默认原点在左下角（符合数学坐标系：x向右，y向上）
  originX: {
    type: Number,
    default: 0 // 0=左, 0.5=中, 1=右
  },
  originY: {
    type: Number,
    default: 1 // 0=上, 0.5=中, 1=下
  },
  // 是否自动适应容器大小
  autoResize: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['ready', 'resize'])

const canvasRef = ref(null)
let ctx = null
let dpr = 1

// 画布尺寸（像素）
let canvasWidth = 0
let canvasHeight = 0

// ==========================================
// 初始化
// ==========================================

const initCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  ctx = canvas.getContext('2d')
  dpr = window.devicePixelRatio || 1

  updateSize()

  // 通知父组件画布已就绪
  emit('ready', {
    canvas,
    ctx,
    utils: canvasUtils
  })
}

// 更新画布尺寸（适配容器+高清屏）
const updateSize = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  canvasWidth = rect.width
  canvasHeight = rect.height

  // 高清屏适配：实际像素 = 显示尺寸 × DPR
  canvas.width = canvasWidth * dpr
  canvas.height = canvasHeight * dpr

  // 缩放上下文，保证绘制坐标和显示像素一致
  ctx.scale(dpr, dpr)

  // 通知父组件画布实际尺寸（用于缩放自适应）
  emit('resize', { width: canvasWidth, height: canvasHeight })

  // 尺寸变化后重绘
  redraw()
}

// ==========================================
// 核心：坐标转换工具
// 物理坐标（米，x右y上） ↔ 画布像素坐标（px，x右y下）
// ==========================================

const canvasUtils = {
  // 当前缩放比例（米→像素），供绘制函数直接使用（如计算环形半径）
  get scale() {
    return props.scale
  },

  // 画布实际宽高（像素），供绘制函数做全幅绘制
  get canvasWidth() {
    return canvasWidth
  },

  get canvasHeight() {
    return canvasHeight
  },

  /**
   * 物理坐标 → 画布像素坐标
   * @param {number} x 物理x坐标（米）
   * @param {number} y 物理y坐标（米）
   * @returns {{x: number, y: number}} 画布像素坐标
   */
  worldToCanvas(x, y) {
    const originPixelX = canvasWidth * props.originX
    const originPixelY = canvasHeight * props.originY

    return {
      x: originPixelX + x * props.scale,
      y: originPixelY - y * props.scale // y轴反向
    }
  },

  /**
   * 画布像素坐标 → 物理坐标
   */
  canvasToWorld(pixelX, pixelY) {
    const originPixelX = canvasWidth * props.originX
    const originPixelY = canvasHeight * props.originY

    return {
      x: (pixelX - originPixelX) / props.scale,
      y: (originPixelY - pixelY) / props.scale
    }
  },

  /**
   * 绘制网格背景
   * @param {number} gridSize 网格间距（米）
   */
  drawGrid(gridSize = 1) {
    if (!ctx) return
    const pixelSize = gridSize * props.scale

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)'
    ctx.lineWidth = 1

    // 竖线
    const originX = canvasWidth * props.originX
    for (let x = originX; x < canvasWidth; x += pixelSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasHeight)
      ctx.stroke()
    }
    for (let x = originX - pixelSize; x > 0; x -= pixelSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasHeight)
      ctx.stroke()
    }

    // 横线
    const originY = canvasHeight * props.originY
    for (let y = originY; y < canvasHeight; y += pixelSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasWidth, y)
      ctx.stroke()
    }
    for (let y = originY - pixelSize; y > 0; y -= pixelSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasWidth, y)
      ctx.stroke()
    }
  },

  /**
   * 绘制坐标轴
   */
  drawAxis() {
    if (!ctx) return
    const origin = canvasUtils.worldToCanvas(0, 0)

    ctx.strokeStyle = '#2c3e50'
    ctx.lineWidth = 1.5

    // x轴
    ctx.beginPath()
    ctx.moveTo(0, origin.y)
    ctx.lineTo(canvasWidth, origin.y)
    ctx.stroke()

    // y轴
    ctx.beginPath()
    ctx.moveTo(origin.x, 0)
    ctx.lineTo(origin.x, canvasHeight)
    ctx.stroke()
  }
}

// ==========================================
// 重绘控制
// ==========================================

const redraw = () => {
  if (!ctx || !props.draw) return

  // 清空画布
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // 调用父组件传入的绘制函数
  props.draw(ctx, props.state, canvasUtils)
}

// 监听状态变化自动重绘
watch(() => props.state, () => {
  requestAnimationFrame(redraw)
}, { deep: true })

// 监听缩放比例变化
watch(() => props.scale, () => {
  nextTick(redraw)
})

// ==========================================
// 窗口大小变化自适应
// ==========================================

let resizeTimer = null
const handleResize = () => {
  if (!props.autoResize) return
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    updateSize()
  }, 100)
}

// ==========================================
// 生命周期
// ==========================================

onMounted(() => {
  nextTick(() => {
    initCanvas()
    if (props.autoResize) {
      window.addEventListener('resize', handleResize)
    }
  })
})

onUnmounted(() => {
  if (props.autoResize) {
    window.removeEventListener('resize', handleResize)
  }
  clearTimeout(resizeTimer)
  ctx = null
})

// 对外暴露方法
defineExpose({
  redraw,
  canvasUtils,
  getContext: () => ctx
})
</script>

<style lang="scss" scoped>
.experiment-canvas {
  display: block;
  width: 100%;
  height: 100%;
  background: #fafbfc;
  border-radius: 4px;
}
</style>
