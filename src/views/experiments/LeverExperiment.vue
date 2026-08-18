<template>
  <div class="lever-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="animState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：砝码挂载控制 -->
      <template #control>
        <div class="lever-control">
          <p class="control-tip">⚖️ 等臂杠杆（左右各 10cm）<br />砝码 10g/个，位置仅限整厘米，每侧最多 10 个</p>

          <div class="sides">
            <!-- 左臂 -->
            <div class="side left">
              <div class="side-header">
                <span class="side-name">左臂</span>
                <span class="side-total" :class="{ full: leftTotal >= 10 }">{{ leftTotal }}/10</span>
              </div>
              <div class="side-rows">
                <div v-for="i in 10" :key="i" class="side-row">
                  <span class="pos-label">{{ i }}cm</span>
                  <button class="step-btn" :disabled="leftWeights[i - 1] <= 0" @click="changeCount('left', i, -1)">−</button>
                  <span class="cnt">{{ leftWeights[i - 1] }}</span>
                  <button class="step-btn" :disabled="leftTotal >= 10" @click="changeCount('left', i, 1)">＋</button>
                </div>
              </div>
            </div>

            <!-- 右臂 -->
            <div class="side right">
              <div class="side-header">
                <span class="side-name">右臂</span>
                <span class="side-total" :class="{ full: rightTotal >= 10 }">{{ rightTotal }}/10</span>
              </div>
              <div class="side-rows">
                <div v-for="i in 10" :key="i" class="side-row">
                  <span class="pos-label">{{ i }}cm</span>
                  <button class="step-btn" :disabled="rightWeights[i - 1] <= 0" @click="changeCount('right', i, -1)">−</button>
                  <span class="cnt">{{ rightWeights[i - 1] }}</span>
                  <button class="step-btn" :disabled="rightTotal >= 10" @click="changeCount('right', i, 1)">＋</button>
                </div>
              </div>
            </div>
          </div>

          <p class="control-formula">FL = F × L（力 × 力臂）</p>
        </div>
      </template>

      <!-- 中间：杠杆画布 -->
      <template #canvas>
        <ExperimentCanvas
          ref="canvasRef"
          :draw="drawScene"
          :state="canvasState"
          :scale="1"
          @resize="handleCanvasResize"
        />
      </template>

      <!-- 右侧：公式与实时数据 -->
      <template #data>
        <div class="lever-data">
          <!-- 公式区（需求：公式呈现在实时数据栏） -->
          <div class="data-group">
            <div class="group-title">📐 杠杆平衡条件</div>
            <div class="formula-box">
              <div class="formula-main">F₁ × L₁ = F₂ × L₂</div>
              <div class="formula-sub">等臂杠杆：L₁ = L₂ = 10cm</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">实时数据</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">FL(左) 力矩</div>
                <div class="card-value">{{ momentLeft }}<span class="card-unit">g·cm</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">FL(右) 力矩</div>
                <div class="card-value">{{ momentRight }}<span class="card-unit">g·cm</span></div>
              </div>
              <div class="data-card" :class="statusClass">
                <div class="card-label">杠杆状态</div>
                <div class="card-value">{{ status.text }}</div>
              </div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">力矩展开计算</div>
            <div class="formula-detail">
              <div class="detail-line">FL(左) = {{ formulaLeft }} = {{ momentLeft }} g·cm</div>
              <div class="detail-line">FL(右) = {{ formulaRight }} = {{ momentRight }} g·cm</div>
              <div class="detail-line judge">{{ judgeLine }}</div>
            </div>
          </div>
        </div>
      </template>

      <!-- 底部：实验原理 -->
      <template #theory>
        <div class="theory-content">
          <p><strong>实验原理：</strong>{{ config.theory.principle }}</p>
          <div class="formula-block">
            <h4>核心公式</h4>
            <ul>
              <li v-for="(f, i) in config.theory.formulas" :key="i">{{ f }}</li>
            </ul>
          </div>
          <div class="keypoint-block">
            <h4>知识要点</h4>
            <ul>
              <li v-for="(k, i) in config.theory.keyPoints" :key="i">{{ k }}</li>
            </ul>
          </div>
          <p class="notes">说明：{{ config.theory.notes }}</p>
        </div>
      </template>
    </ExperimentLayout>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import ExperimentLayout from '@/layouts/ExperimentLayout.vue'
import ExperimentCanvas from '@/components/ExperimentCanvas.vue'
import { leverConfig } from '@/config/experiments/mechanics/lever.js'

const config = leverConfig
const MAX_PER_SIDE = 10
const WEIGHT_G = 10 // 每个砝码 10g

// ========== 砝码状态：left/right[i] = 在 (i+1)cm 处挂的砝码数 ==========

const leftWeights = reactive(Array(10).fill(0))
const rightWeights = reactive(Array(10).fill(0))

// 默认演示：左右各在 5cm 处挂 1 个砝码（平衡 50 vs 50）
const resetDefaults = () => {
  leftWeights.fill(0)
  rightWeights.fill(0)
  leftWeights[4] = 1
  rightWeights[4] = 1
}
resetDefaults()

const leftTotal = computed(() => leftWeights.reduce((s, c) => s + c, 0))
const rightTotal = computed(() => rightWeights.reduce((s, c) => s + c, 0))

const changeCount = (side, pos, delta) => {
  const arr = side === 'left' ? leftWeights : rightWeights
  const idx = pos - 1
  const next = arr[idx] + delta
  if (next < 0) return
  const total = arr.reduce((s, c) => s + c, 0)
  if (delta > 0 && total >= MAX_PER_SIDE) return
  arr[idx] = next
}

// ========== 力矩计算（教科书标准：按水平位置） ==========

const momentLeft = computed(() => leftWeights.reduce((s, c, i) => s + c * WEIGHT_G * (i + 1), 0))
const momentRight = computed(() => rightWeights.reduce((s, c, i) => s + c * WEIGHT_G * (i + 1), 0))

// 展开式字符串：如 "10g×5cm + 20g×10cm"
const buildFormula = (arr) => {
  const terms = []
  arr.forEach((c, i) => {
    if (c > 0) terms.push(`${c * WEIGHT_G}g×${i + 1}cm`)
  })
  return terms.length ? terms.join(' + ') : '0'
}
const formulaLeft = computed(() => buildFormula(leftWeights))
const formulaRight = computed(() => buildFormula(rightWeights))

const status = computed(() => {
  const d = momentLeft.value - momentRight.value
  if (d > 0) return { text: '向左倾斜', dir: 'left' }
  if (d < 0) return { text: '向右倾斜', dir: 'right' }
  return { text: '水平平衡', dir: 'balance' }
})

const statusClass = computed(() => (status.value.dir === 'balance' ? 'balance' : ''))

const judgeLine = computed(() => {
  const d = momentLeft.value - momentRight.value
  if (d > 0) return 'FL(左) > FL(右) → 杠杆向左倾斜'
  if (d < 0) return 'FL(左) < FL(右) → 杠杆向右倾斜'
  return 'FL(左) = FL(右) → 杠杆水平平衡'
})

// ========== 倾斜动画 ==========
// 倾斜角与力矩差成正比，封顶 15°；正角 = 右倾（画布顺时针）

const MAX_TILT = (15 * Math.PI) / 180
const FULL_TILT_DELTA = 100 // 力矩差 100 g·cm → 满倾斜 15°

const animState = ref('idle') // idle / running / paused
const tiltAngle = ref(0)
let rafId = null
let lastTs = 0

const tiltTarget = computed(() => {
  const d = momentLeft.value - momentRight.value
  const t = -(d / FULL_TILT_DELTA) * MAX_TILT
  return Math.max(-MAX_TILT, Math.min(MAX_TILT, t))
})

// 基于时间的缓动（不依赖帧率，rAF 被节流时也能按时到位）
const easeTilt = (ts) => {
  rafId = null
  const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.1) : 0.016
  lastTs = ts
  const target = tiltTarget.value
  const diff = target - tiltAngle.value
  if (Math.abs(diff) < 0.001) {
    tiltAngle.value = target
    animState.value = 'idle'
    return
  }
  tiltAngle.value += diff * Math.min(1, dt * 8)
  rafId = requestAnimationFrame(easeTilt)
}

// 砝码变化 → 自动演示倾斜（暂停状态下不自动动）
watch([momentLeft, momentRight], () => {
  if (animState.value === 'paused') return
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  startAutoEase()
})

const startAutoEase = () => {
  if (rafId) return
  lastTs = 0
  animState.value = 'running'
  rafId = requestAnimationFrame(easeTilt)
}

const handleStart = () => {
  if (animState.value === 'running') return
  if (animState.value === 'paused') {
    startAutoEase()
    return
  }
  // idle → 重放演示：先回水平，再以固定 1.2s 线性动画倒向目标
  const target = tiltTarget.value
  const t0 = performance.now()
  const dur = 1200
  const step = (now) => {
    rafId = null
    const p = Math.min((now - t0) / dur, 1)
    tiltAngle.value = target * p
    if (p >= 1) {
      animState.value = 'idle'
      return
    }
    animState.value = 'running'
    rafId = requestAnimationFrame(step)
  }
  animState.value = 'running'
  rafId = requestAnimationFrame(step)
}

const handlePause = () => {
  if (animState.value !== 'running') return
  animState.value = 'paused'
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

const handleReset = () => {
  resetDefaults()
  tiltAngle.value = 0
  animState.value = 'idle'
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// ========== 画布 ==========

const canvasWidth = ref(600)

const handleCanvasResize = ({ width }) => {
  canvasWidth.value = width
}

const canvasState = computed(() => ({
  left: leftWeights,
  right: rightWeights,
  tilt: tiltAngle.value
}))

const drawScene = (ctx, state, utils) => {
  const w = utils.canvasWidth
  const cx = w / 2
  const apexY = 78 // 支点顶端（杠杆底部），杠杆放在画布最上端
  const scale = (w * 0.82) / 20 // px/cm：杠杆全长 20cm 占画布宽 82%
  const halfLen = 10 * scale

  // ===== 杠杆（工字形，随倾斜角旋转） =====
  ctx.save()
  ctx.translate(cx, apexY)
  ctx.rotate(state.tilt)

  // 刻度线 + 数字（上翼缘上方）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.lineWidth = 1
  for (let i = 1; i <= 10; i++) {
    const x = i * scale
    ctx.fillText(String(i), x, -34)
    ctx.fillText(String(i), -x, -34)
    ctx.beginPath()
    ctx.moveTo(x, -28)
    ctx.lineTo(x, -24)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-x, -28)
    ctx.lineTo(-x, -24)
    ctx.stroke()
  }

  // 工字形梁体：上翼缘 / 腹板 / 下翼缘 + 中心竖柱
  ctx.fillStyle = '#4a6a8a' // 腹板（浅色）
  ctx.fillRect(-halfLen, -18, halfLen * 2, 12)
  ctx.fillStyle = '#2c3e50' // 翼缘（深色）
  ctx.fillRect(-halfLen, -24, halfLen * 2, 6)
  ctx.fillRect(-halfLen, -6, halfLen * 2, 6)
  ctx.fillRect(-5, -24, 10, 24) // 中心竖柱（工字竖笔）

  ctx.restore()

  // ===== 支点三角（固定不旋转） =====
  ctx.fillStyle = '#8a6d3b'
  ctx.beginPath()
  ctx.moveTo(cx, apexY)
  ctx.lineTo(cx - 16, apexY + 22)
  ctx.lineTo(cx + 16, apexY + 22)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('支点', cx, apexY + 26)

  // ===== 砝码（吊绳始终竖直，挂在旋转后的杠杆底部） =====
  drawWeights(ctx, state, cx, apexY, scale, state.tilt, 'left')
  drawWeights(ctx, state, cx, apexY, scale, state.tilt, 'right')
}

const drawWeights = (ctx, state, cx, apexY, scale, tilt, side) => {
  const arr = side === 'left' ? state.left : state.right
  const color = side === 'left' ? '#1890ff' : '#faad14'
  const sign = side === 'left' ? -1 : 1
  const cos = Math.cos(tilt)
  const sin = Math.sin(tilt)

  for (let i = 0; i < 10; i++) {
    const n = arr[i]
    if (!n) continue
    const d = sign * (i + 1) * scale // 沿杠杆方向的距离（局部坐标）
    const ax = cx + d * cos // 挂点（杠杆底部局部 y=0 旋转后）
    const ay = apexY + d * sin
    const topY = ay + 4
    const stackH = n * 15 - 1

    // 吊绳
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(ax, topY)
    ctx.lineTo(ax, topY + stackH)
    ctx.stroke()

    // 砝码堆
    for (let k = 0; k < n; k++) {
      drawWeightBlock(ctx, ax, topY + k * 15, color)
    }

    // 数量标签
    if (n > 1) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`×${n}`, ax + 12, topY + stackH / 2)
    }
  }
}

// 单个砝码（梯形）
const drawWeightBlock = (ctx, x, y, color) => {
  const wTop = 10
  const wBot = 16
  const hgt = 13
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x - wTop / 2, y)
  ctx.lineTo(x + wTop / 2, y)
  ctx.lineTo(x + wBot / 2, y + hgt)
  ctx.lineTo(x - wBot / 2, y + hgt)
  ctx.closePath()
  ctx.fill()
  // 挂钩
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y - 2)
  ctx.lineTo(x, y + 1)
  ctx.stroke()
}

// ========== 生命周期 ==========

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
})
</script>

<style lang="scss" scoped>
.lever-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 控制面板 ========== */
.lever-control {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-tip {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
  margin: 0;
}

.sides {
  display: flex;
  gap: 8px;
}

.side {
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px;
}

.side-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.side-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.side-total {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 6px;
  border-radius: 8px;

  &.full {
    color: $color-accent;
    background: rgba(245, 166, 35, 0.15);
  }
}

.side-rows {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.side-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pos-label {
  width: 26px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

.step-btn {
  width: 18px;
  height: 18px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  background: transparent;
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: $color-accent;
    color: $color-accent;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.cnt {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: $color-accent;
  font-weight: 500;
}

.control-formula {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
}

/* ========== 数据面板 ========== */
.lever-data {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.data-group {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
}

.group-title {
  font-size: 14px;
  font-weight: 500;
  color: $color-accent;
  margin-bottom: 10px;
}

.formula-box {
  background: rgba(245, 166, 35, 0.08);
  border: 1px solid rgba(245, 166, 35, 0.35);
  border-radius: 6px;
  padding: 10px 12px;
  text-align: center;
}

.formula-main {
  font-size: 20px;
  font-weight: 600;
  color: $color-accent;
  font-family: 'Georgia', 'Times New Roman', serif;
  letter-spacing: 1px;
}

.formula-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);

  &.balance {
    border-color: $color-success;
    background: rgba(82, 196, 26, 0.1);
  }
}

.card-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.card-value {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  line-height: 1.2;

  .card-unit {
    font-size: 12px;
    font-weight: normal;
    color: rgba(255, 255, 255, 0.5);
    margin-left: 4px;
  }
}

.data-card.balance .card-value {
  color: $color-success;
}

.formula-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-line {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  word-break: break-all;

  &.judge {
    color: $color-accent;
    font-weight: 500;
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px dashed rgba(255, 255, 255, 0.12);
  }
}

/* ========== 原理面板 ========== */
.theory-content {
  line-height: 1.8;
  font-size: 14px;
  color: $color-text-dark;

  h4 {
    margin: 12px 0 6px;
    color: $color-primary;
    font-size: 15px;
  }

  ul {
    margin: 0;
    padding-left: 20px;
  }

  .notes {
    margin-top: 12px;
    color: #999;
    font-size: 13px;
  }
}
</style>
