<template>
  <div class="force-composition-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="layoutRunState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：自定义控制面板（动态力列表） -->
      <template #control>
        <div class="force-control">
          <button class="add-force-btn" :disabled="forces.length >= MAX_FORCES" @click="addForce">
            ＋ 添加力（{{ forces.length }}/{{ MAX_FORCES }}）
          </button>

          <div v-for="(force, idx) in forces" :key="force.id" class="force-item">
            <div class="force-item-header">
              <span class="color-dot" :style="{ background: forceColors[idx] }"></span>
              <input v-model="force.name" class="name-input" maxlength="8" placeholder="力名称" />
              <button
                class="delete-btn"
                title="删除该力"
                :disabled="forces.length <= 1"
                @click="removeForce(force.id)"
              >✕</button>
            </div>
            <div class="field-row">
              <div class="field-label-row">
                <span class="field-label">方向</span>
                <span class="field-value">{{ force.direction }}°</span>
              </div>
              <input type="range" min="0" max="360" step="1" v-model.number="force.direction" class="slider-input" />
            </div>
            <div class="field-row">
              <div class="field-label-row">
                <span class="field-label">大小</span>
                <span class="field-value">{{ force.magnitude }} N</span>
              </div>
              <input type="range" min="0" max="100" step="1" v-model.number="force.magnitude" class="slider-input" />
            </div>
          </div>

          <label class="component-toggle">
            <input type="checkbox" v-model="showComponents" />
            <span>显示正交分解（Fx / Fy）</span>
          </label>

          <div class="panel-footer">
            <button class="reset-btn" @click="resetDefaults">恢复默认值</button>
          </div>
        </div>
      </template>

      <!-- 中间：画布 -->
      <template #canvas>
        <ExperimentCanvas
          ref="canvasRef"
          :draw="drawScene"
          :state="canvasState"
          :scale="canvasScale"
          :origin-x="0.5"
          :origin-y="0.5"
          @resize="handleCanvasResize"
        />
      </template>

      <!-- 右侧：合力与分解数据 -->
      <template #data>
        <div class="force-data">
          <div class="data-group">
            <div class="group-title">合力（红色箭头）</div>
            <div class="card-list">
              <div class="data-card highlight">
                <div class="card-label">合力大小</div>
                <div class="card-value">{{ resultant.magnitude.toFixed(2) }}<span class="card-unit">N</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">合力方向</div>
                <div class="card-value">{{ resultant.direction.toFixed(1) }}<span class="card-unit">°</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">合力 Fx</div>
                <div class="card-value">{{ resultant.fx.toFixed(2) }}<span class="card-unit">N</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">合力 Fy</div>
                <div class="card-value">{{ resultant.fy.toFixed(2) }}<span class="card-unit">N</span></div>
              </div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">各力正交分解</div>
            <div class="data-table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>名称</th>
                    <th>大小(N)</th>
                    <th>方向(°)</th>
                    <th>Fx(N)</th>
                    <th>Fy(N)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(force, idx) in forces" :key="force.id">
                    <td><span class="color-dot" :style="{ background: forceColors[idx] }"></span></td>
                    <td>{{ force.name }}</td>
                    <td>{{ force.magnitude.toFixed(1) }}</td>
                    <td>{{ force.direction.toFixed(0) }}</td>
                    <td>{{ getComponents(force).fx.toFixed(1) }}</td>
                    <td>{{ getComponents(force).fy.toFixed(1) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="table-tip">方向规定：0° 指向右（+x），逆时针增大</p>
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
import { ref, computed, watch, onUnmounted } from 'vue'
import ExperimentLayout from '@/layouts/ExperimentLayout.vue'
import ExperimentCanvas from '@/components/ExperimentCanvas.vue'
import { forceCompositionConfig } from '@/config/experiments/mechanics/force-composition.js'

const config = forceCompositionConfig
const MAX_FORCES = 6

// ========== 常量与工具 ==========

// 6个力的固定配色（下标与力一一对应），合力固定红色
const forceColors = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#13c2c2', '#eb2f96']
const RESULTANT_COLOR = '#f5222d'

const SUB_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉']
const forceName = (n) => `F${SUB_DIGITS[n] || n}`

const deg2rad = (d) => (d * Math.PI) / 180

// ========== 力列表状态 ==========

// 默认两个力：60N@0° + 80N@90°，构成 3-4-5 三角形，合力恰为 100N
const defaultForces = () => [
  { id: 'f-1', name: forceName(1), magnitude: 60, direction: 0 },
  { id: 'f-2', name: forceName(2), magnitude: 80, direction: 90 }
]

let forceSeq = 2
const forces = ref(defaultForces())
const showComponents = ref(false)

const addForce = () => {
  if (forces.value.length >= MAX_FORCES) return
  forceSeq += 1
  forces.value.push({
    id: `f-${Date.now()}-${forceSeq}`,
    name: forceName(forceSeq),
    magnitude: 50,
    direction: 0
  })
}

const removeForce = (id) => {
  if (forces.value.length <= 1) return
  const idx = forces.value.findIndex((f) => f.id === id)
  if (idx !== -1) forces.value.splice(idx, 1)
}

const resetDefaults = () => {
  forces.value = defaultForces()
  forceSeq = 2
  showComponents.value = false
}

// ========== 矢量计算 ==========

const getComponents = (force) => {
  const rad = deg2rad(force.direction)
  return {
    fx: force.magnitude * Math.cos(rad),
    fy: force.magnitude * Math.sin(rad)
  }
}

const resultant = computed(() => {
  let fx = 0
  let fy = 0
  for (const f of forces.value) {
    const c = getComponents(f)
    fx += c.fx
    fy += c.fy
  }
  const magnitude = Math.hypot(fx, fy)
  let direction = (Math.atan2(fy, fx) * 180) / Math.PI
  if (direction < 0) direction += 360
  return { fx, fy, magnitude, direction }
})

// ========== 顺序演示动画（开始/暂停/重置） ==========

const PER_FORCE_TIME = 0.7 // 每个力箭头生长动画时长(s)
const RESULTANT_TIME = 0.8 // 合力箭头生长动画时长(s)

const animState = ref('idle') // idle / running / paused
const progress = ref(1)       // 0~1，=1 表示全部箭头已绘制完成
let animId = null
let lastTs = 0

const totalDuration = computed(() => forces.value.length * PER_FORCE_TIME + RESULTANT_TIME)

// 布局徽标状态直接复用动画状态
const layoutRunState = computed(() => animState.value)

const animLoop = () => {
  if (animState.value !== 'running') return
  const now = performance.now()
  const dt = (now - lastTs) / 1000
  lastTs = now
  progress.value = Math.min(progress.value + dt / totalDuration.value, 1)
  if (progress.value >= 1) {
    animState.value = 'paused'
    return
  }
  animId = requestAnimationFrame(animLoop)
}

const handleStart = () => {
  if (animState.value === 'running') return
  if (progress.value >= 1) progress.value = 0 // 已画完则重新演示
  animState.value = 'running'
  lastTs = performance.now()
  animLoop()
}

const handlePause = () => {
  if (animState.value !== 'running') return
  animState.value = 'paused'
  if (animId) cancelAnimationFrame(animId)
  animId = null
}

// 任何力的增删改 → 立即补全动画，避免出现半截箭头
watch(forces, () => {
  progress.value = 1
  if (animState.value === 'running') {
    animState.value = 'paused'
    if (animId) cancelAnimationFrame(animId)
    animId = null
  }
}, { deep: true })

const handleReset = () => {
  resetDefaults()
}

// ========== 画布 ==========

const canvasWidth = ref(600)
const canvasHeight = ref(450)

const handleCanvasResize = ({ width, height }) => {
  canvasWidth.value = width
  canvasHeight.value = height
}

// 缩放比例：100N 满量程映射到画布短边的 36%（px/N）
const canvasScale = computed(() => {
  const base = Math.min(canvasWidth.value, canvasHeight.value)
  return (base * 0.36) / 100
})

// 画布状态（变化时自动重绘）
const canvasState = computed(() => ({
  forces: forces.value,
  resultant: resultant.value,
  showComponents: showComponents.value,
  progress: progress.value
}))

const drawScene = (ctx, state, utils) => {
  utils.drawGrid(10)
  utils.drawAxis()

  const origin = utils.worldToCanvas(0, 0)
  const maxR = 100 * utils.scale

  // 满量程参考圆（100N 力对应的最大箭头长度）
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.arc(origin.x, origin.y, maxR, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 角度刻度盘（每 30° 一格，主方向标注 0°/90°/180°/270°）
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)'
  for (let a = 0; a < 360; a += 30) {
    const rad = deg2rad(a)
    const r1 = maxR + 6
    const r2 = a % 90 === 0 ? maxR + 14 : maxR + 10
    ctx.beginPath()
    ctx.moveTo(origin.x + r1 * Math.cos(rad), origin.y - r1 * Math.sin(rad))
    ctx.lineTo(origin.x + r2 * Math.cos(rad), origin.y - r2 * Math.sin(rad))
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ;[[0, '0°'], [90, '90°'], [180, '180°'], [270, '270°']].forEach(([a, label]) => {
    const rad = deg2rad(a)
    ctx.fillText(label, origin.x + (maxR + 26) * Math.cos(rad), origin.y - (maxR + 26) * Math.sin(rad))
  })

  const n = state.forces.length
  const T = n * PER_FORCE_TIME + RESULTANT_TIME

  // 正交分解虚线（垫底绘制）
  if (state.showComponents) {
    state.forces.forEach((f, i) => {
      drawComponents(ctx, utils, f, forceColors[i % forceColors.length])
    })
  }

  // 分力箭头（长度 ∝ 大小，逐个按动画进度生长）
  state.forces.forEach((f, i) => {
    const startT = i * PER_FORCE_TIME
    const frac = Math.min(Math.max((state.progress * T - startT) / PER_FORCE_TIME, 0), 1)
    drawArrow(ctx, origin.x, origin.y, f.magnitude * utils.scale * frac, deg2rad(f.direction),
      forceColors[i % forceColors.length], 3, f.name)
  })

  // 合力箭头（红色，最后出现）
  const r = state.resultant
  if (r.magnitude > 0.01) {
    const startT = n * PER_FORCE_TIME
    const frac = Math.min(Math.max((state.progress * T - startT) / RESULTANT_TIME, 0), 1)
    drawArrow(ctx, origin.x, origin.y, r.magnitude * utils.scale * frac, deg2rad(r.direction),
      RESULTANT_COLOR, 4, 'F合')
  }
}

// 绘制带箭头的力
const drawArrow = (ctx, x0, y0, lenPx, angleRad, color, width, label) => {
  if (lenPx < 1) return
  const tipX = x0 + lenPx * Math.cos(angleRad)
  const tipY = y0 - lenPx * Math.sin(angleRad)
  const headLen = Math.min(16, Math.max(8, lenPx * 0.28))

  // 箭杆
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(tipX, tipY)
  ctx.stroke()

  // 箭头头部
  const a1 = angleRad + Math.PI - 0.45
  const a2 = angleRad + Math.PI + 0.45
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(tipX + headLen * Math.cos(a1), tipY - headLen * Math.sin(a1))
  ctx.lineTo(tipX + headLen * Math.cos(a2), tipY - headLen * Math.sin(a2))
  ctx.closePath()
  ctx.fill()

  // 名称标签（白底防遮挡）
  if (label) {
    const lx = tipX + Math.cos(angleRad) * 20
    const ly = tipY - Math.sin(angleRad) * 20
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const tw = ctx.measureText(label).width
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.fillRect(lx - tw / 2 - 4, ly - 9, tw + 8, 18)
    ctx.fillStyle = color
    ctx.fillText(label, lx, ly)
  }
}

// 正交分解：Fx 沿 x 轴、Fy 竖直，虚线表示
const drawComponents = (ctx, utils, force, color) => {
  const origin = utils.worldToCanvas(0, 0)
  const c = getComponents(force)
  const tipX = origin.x + c.fx * utils.scale
  const tipY = origin.y - c.fy * utils.scale

  ctx.save()
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(origin.x, origin.y)
  ctx.lineTo(tipX, origin.y)
  ctx.moveTo(tipX, origin.y)
  ctx.lineTo(tipX, tipY)
  ctx.stroke()
  ctx.restore()
}

// ========== 生命周期 ==========

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
  animId = null
})
</script>

<style lang="scss" scoped>
.force-composition-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 控制面板 ========== */
.force-control {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.add-force-btn {
  padding: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.35);
  border-radius: $radius-sm;
  background: transparent;
  color: $color-accent;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(245, 166, 35, 0.12);
    border-color: $color-accent;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.force-item {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.force-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

.name-input {
  flex: 1;
  min-width: 0;
  padding: 3px 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: $color-accent;
  }
}

.delete-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: $color-danger;
    color: $color-danger;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
}

.field-value {
  color: $color-accent;
  font-weight: 500;
}

.slider-input {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: $color-accent;
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
      transform: scale(1.2);
    }
  }
}

.component-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  user-select: none;

  input {
    accent-color: $color-accent;
    width: 14px;
    height: 14px;
    cursor: pointer;
  }
}

.panel-footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.reset-btn {
  width: 100%;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: $color-accent;
    color: $color-accent;
  }
}

/* ========== 数据面板 ========== */
.force-data {
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

  &.highlight {
    border-color: $color-accent;
    background: rgba(245, 166, 35, 0.1);
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

.data-card.highlight .card-value {
  color: $color-accent;
}

.data-table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    padding: 6px 8px;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  th {
    color: rgba(255, 255, 255, 0.6);
    font-weight: 500;
    background: rgba(255, 255, 255, 0.03);
    white-space: nowrap;
  }

  td {
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
  }
}

.table-tip {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
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
