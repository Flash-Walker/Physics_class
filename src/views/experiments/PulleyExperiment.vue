<template>
  <div class="pulley-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="animState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：结构与参数控制 -->
      <template #control>
        <div class="pulley-control">
          <div class="ctrl-group">
            <div class="group-label">⚙️ 滑轮组结构（6 种绕法）</div>
            <div class="preset-grid">
              <button
                v-for="p in PRESETS"
                :key="p.id"
                class="preset-btn"
                :class="{ active: presetId === p.id }"
                @click="selectPreset(p.id)"
              >
                <span class="preset-name">{{ p.name }}</span>
                <span class="preset-n">n = {{ p.n }}</span>
              </button>
            </div>
            <div class="preset-desc">{{ currentPreset.desc }}（拉力方向：{{ pullText }}）</div>
          </div>

          <div class="ctrl-group">
            <div class="slider-row">
              <div class="slider-head">
                <span>重物质量 m</span>
                <span class="slider-val">{{ m.toFixed(1) }} kg</span>
              </div>
              <input type="range" min="0.1" max="10" step="0.1" v-model.number="m" />
              <div class="slider-sub">G = mg = {{ G }} N（g = 10 N/kg）</div>
            </div>

            <div class="slider-row">
              <div class="slider-head">
                <span>动滑轮质量 m动</span>
                <span class="slider-val">{{ mPulley }} g</span>
              </div>
              <input type="range" min="0" max="500" step="10" v-model.number="mPulley" />
              <div class="slider-sub">G动 = {{ Gd.toFixed(1) }} N（默认 0 = 不计滑轮重）</div>
            </div>

            <div class="slider-row">
              <div class="slider-head">
                <span>摩擦效率 η′</span>
                <span class="slider-val">{{ etaFric }}%</span>
              </div>
              <input type="range" min="50" max="100" step="5" v-model.number="etaFric" />
              <div class="slider-sub">100% = 无摩擦；调低模拟摩擦损耗</div>
            </div>

            <div class="slider-row">
              <div class="slider-head">
                <span>自由端速度 v</span>
                <span class="slider-val">{{ vPull.toFixed(1) }} cm/s</span>
              </div>
              <input type="range" min="1" max="20" step="0.5" v-model.number="vPull" />
              <div class="slider-sub">重物上升速度 = v/n = {{ (vPull / n).toFixed(1) }} cm/s</div>
            </div>
          </div>

          <p class="control-tip">💡 点"开始"提升重物 20cm，观察自由端以 n 倍速度、n 倍距离拉动</p>
        </div>
      </template>

      <!-- 中间：滑轮组画布 -->
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
        <div class="pulley-data">
          <div class="data-group">
            <div class="group-title">📐 滑轮组核心公式</div>
            <div class="formula-box">
              <div class="formula-line">F = (G + G动) / (n·η′)</div>
              <div class="formula-line">s = n·h</div>
              <div class="formula-line">v自由端 = n·v重物</div>
              <div class="formula-line">η = Gh/(Fs) = G/(nF)</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">实时数据</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">绳子段数 n</div>
                <div class="card-value">{{ n }}<span class="card-unit">段</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">拉力 F</div>
                <div class="card-value">{{ F.toFixed(2) }}<span class="card-unit">N</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">拉力方向</div>
                <div class="card-value pull-dir">{{ pullText }} <span class="pull-arrow">{{ pullArrow }}</span></div>
              </div>
              <div class="card-row">
                <div class="data-card half">
                  <div class="card-label">重物上升 h</div>
                  <div class="card-value">{{ hCm.toFixed(1) }}<span class="card-unit">cm</span></div>
                </div>
                <div class="data-card half">
                  <div class="card-label">自由端距离 s</div>
                  <div class="card-value">{{ s.toFixed(1) }}<span class="card-unit">cm</span></div>
                </div>
              </div>
              <div class="card-row">
                <div class="data-card half">
                  <div class="card-label">自由端速度 v</div>
                  <div class="card-value">{{ vPull.toFixed(1) }}<span class="card-unit">cm/s</span></div>
                </div>
                <div class="data-card half">
                  <div class="card-label">重物速度 v/n</div>
                  <div class="card-value">{{ (vPull / n).toFixed(1) }}<span class="card-unit">cm/s</span></div>
                </div>
              </div>
              <div class="data-card" :class="{ perfect: eta >= 100 }">
                <div class="card-label">机械效率 η</div>
                <div class="card-value">{{ eta }}<span class="card-unit">%</span></div>
              </div>
              <div class="card-row">
                <div class="data-card half">
                  <div class="card-label">有用功 W有</div>
                  <div class="card-value">{{ Wuseful.toFixed(2) }}<span class="card-unit">J</span></div>
                </div>
                <div class="data-card half">
                  <div class="card-label">总功 W总</div>
                  <div class="card-value">{{ Wtotal.toFixed(2) }}<span class="card-unit">J</span></div>
                </div>
              </div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">展开计算</div>
            <div class="formula-detail">
              <div class="detail-line">F = (G+G动)/(n·η′) = ({{ G }}+{{ Gd.toFixed(1) }})/({{ n }}×{{ (etaFric / 100).toFixed(2) }}) = {{ F.toFixed(2) }}N</div>
              <div class="detail-line">s = n·h = {{ n }}×{{ hCm.toFixed(1) }} = {{ s.toFixed(1) }}cm</div>
              <div class="detail-line">v重物 = v/n = {{ vPull.toFixed(1) }}/{{ n }} = {{ (vPull / n).toFixed(1) }}cm/s</div>
              <div class="detail-line">η = G/(n·F) = {{ G }}/({{ n }}×{{ F.toFixed(2) }}) = {{ eta }}%</div>
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
import { ref, computed, onUnmounted } from 'vue'
import ExperimentLayout from '@/layouts/ExperimentLayout.vue'
import ExperimentCanvas from '@/components/ExperimentCanvas.vue'
import { pulleyConfig } from '@/config/experiments/mechanics/pulley.js'

const config = pulleyConfig
const G_CONST = 10 // g = 10 N/kg

// ========== 结构预设（6 种绕法） ==========

const PRESETS = [
  { id: 'fix1', name: '单个定滑轮', n: 1, pull: 'down', desc: '不省力，只改变方向' },
  { id: 'mov1', name: '单个动滑轮', n: 2, pull: 'up', desc: '省一半力，向上拉' },
  { id: '1f1m2', name: '一定一动', n: 2, pull: 'down', desc: '向下拉' },
  { id: '1f1m3', name: '一定一动', n: 3, pull: 'up', desc: '向上拉' },
  { id: '2f2m4', name: '二定二动', n: 4, pull: 'down', desc: '向下拉' },
  { id: '2f2m5', name: '二定二动', n: 5, pull: 'up', desc: '向上拉' }
]

// ========== 参数 ==========

const presetId = ref('1f1m2') // 默认：一定一动 n=2 下拉
const m = ref(1.0) // 重物质量 kg
const mPulley = ref(0) // 动滑轮质量 g（默认 0）
const etaFric = ref(100) // 摩擦效率 %（默认 100 = 无摩擦）
const vPull = ref(4) // 自由端速度 cm/s（默认 4）

const currentPreset = computed(() => PRESETS.find(p => p.id === presetId.value))
const n = computed(() => currentPreset.value.n)

const G = computed(() => Math.round(m.value * G_CONST)) // 重物重力 N
const Gd = computed(() => mPulley.value / 100) // 动滑轮重力 N（g→kg→N）
const F = computed(() => (G.value + Gd.value) / (n.value * (etaFric.value / 100)))

const pullText = computed(() => (currentPreset.value.pull === 'up' ? '向上' : '向下'))
const pullArrow = computed(() => (currentPreset.value.pull === 'up' ? '↑' : '↓'))

const selectPreset = (id) => {
  if (presetId.value === id) return
  presetId.value = id
  hCm.value = 0 // 结构变化，重物复位
}

// ========== 提升动画（速度驱动：重物速度 = v/n） ==========

const LIFT_H = 20 // cm

const animState = ref('idle') // idle / running / paused
const hCm = ref(0)
let rafId = null
let lastT = 0

const tick = (now) => {
  rafId = null
  const dt = lastT ? Math.min((now - lastT) / 1000, 0.1) : 0.016
  lastT = now
  if (animState.value === 'running') {
    hCm.value = Math.min(LIFT_H, hCm.value + (vPull.value / n.value) * dt)
  }
  if (animState.value === 'running' && hCm.value < LIFT_H) {
    rafId = requestAnimationFrame(tick)
  } else if (hCm.value >= LIFT_H) {
    animState.value = 'idle'
  }
}

const startLoop = () => {
  if (rafId) return
  lastT = 0
  rafId = requestAnimationFrame(tick)
}

const handleStart = () => {
  if (animState.value === 'running') return
  if (hCm.value >= LIFT_H - 0.01) hCm.value = 0 // 已到顶 → 重新演示
  animState.value = 'running'
  startLoop()
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
  presetId.value = '1f1m2'
  m.value = 1.0
  mPulley.value = 0
  etaFric.value = 100
  vPull.value = 4
  hCm.value = 0
  animState.value = 'idle'
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// ========== 数据计算 ==========

const s = computed(() => n.value * hCm.value) // cm
const Wuseful = computed(() => (G.value * hCm.value) / 100) // J（h: cm → m）
const Wtotal = computed(() => (F.value * s.value) / 100) // J
const eta = computed(() => {
  const nF = n.value * F.value
  return nF > 0 ? Math.round((G.value / nF) * 100) : 100
})

// ========== 画布 ==========

const canvasWidth = ref(600)
const handleCanvasResize = ({ width }) => {
  canvasWidth.value = width
}

const canvasState = computed(() => ({
  preset: presetId.value,
  h: hCm.value,
  G: G.value,
  F: F.value,
  n: n.value,
  pull: currentPreset.value.pull
}))

// 几何常量：定滑轮组与动滑轮组同轴（同一竖直线），组内双轮 8 字形叠放相切
const GEOM = {
  beamY: 34, // 天花板横梁
  fixY: 110, // 定滑轮组中心 y（单轮时即轮心）
  movY0: 250, // 动滑轮组中心 y 初始
  loadY0: 302, // 重物顶部初始 y
  pxPerCm: 6
}

// 线稿配色（白底黑线，教科书插图风格，参照 R.jpg）
const INK = '#1a1a1a'
const INK_SOFT = 'rgba(26, 26, 26, 0.55)'

// 文字标签：横梁上方为结构名，图下方为情况名（对应参考图两组标签）
const PRESET_LABEL = {
  fix1: { top: '定滑轮', bottom: '一定' },
  mov1: { top: '动滑轮', bottom: '一动' },
  '1f1m2': { top: '一定一动', bottom: '一定一动' },
  '1f1m3': { top: '一定一动', bottom: '一定一动' },
  '2f2m4': { top: '二定二动', bottom: '二定二动' },
  '2f2m5': { top: '二定二动', bottom: '二定二动' }
}

const drawScene = (ctx, state, utils) => {
  const w = utils.canvasWidth
  const h = utils.canvasHeight
  const cx = w / 2
  const preset = PRESETS.find(p => p.id === state.preset)
  const hPx = state.h * GEOM.pxPerCm
  const movY = GEOM.movY0 - hPx
  const isDouble = preset.id === '2f2m4' || preset.id === '2f2m5'
  const loadX = preset.id === 'fix1' ? cx - 80 : cx
  const loadTop = preset.id === 'fix1' ? GEOM.loadY0 - hPx : movY + 52

  // 自由端位置（s = n·h，超出画布则截断在边缘）
  const pullEnd0 = preset.pull === 'up' ? GEOM.movY0 + 30 : (preset.id === 'fix1' ? GEOM.loadY0 + 30 : GEOM.fixY + 190)
  const pullRaw = preset.pull === 'up' ? pullEnd0 - state.n * hPx : pullEnd0 + state.n * hPx
  const pullY = Math.max(46, Math.min(h - 46, pullRaw))

  // 绳子路径（一根整体：固定端 → 依次绕过各滑轮 → 自由端，无中间折点）
  const path = buildPath(preset.id, cx, movY, loadTop, pullY)

  // ===== 白底（纸面） =====
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)

  // ===== 顶部标签（结构名，横梁上方） =====
  ctx.fillStyle = INK
  ctx.font = '600 16px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(PRESET_LABEL[preset.id].top, cx, GEOM.beamY - 7)

  // ===== 天花板横梁（细墨线） =====
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, GEOM.beamY)
  ctx.lineTo(w, GEOM.beamY)
  ctx.stroke()

  // ===== 刻度尺（左侧，0-20cm） =====
  drawRuler(ctx, state.h, loadX)

  // ===== 绳子（先画，被轮子遮挡处 = 从轮后经过） =====
  drawRope(ctx, path)

  // ===== 固定端钩子（绳子一端系在滑轮组轴上） =====
  drawAnchorHook(ctx, path[0], preset.id, cx, movY)

  // ===== 滑轮（定滑轮=圆轮线框；动滑轮=六边形线框） =====
  if (preset.id === 'fix1' || preset.id === '1f1m2' || preset.id === '1f1m3') {
    drawPulley(ctx, cx, GEOM.fixY, 20, 'fixed')
  }
  if (isDouble) {
    drawPulley(ctx, cx, GEOM.fixY - 20, 20, 'fixed') // 定滑轮上轮（挂梁）
    drawPulley(ctx, cx, GEOM.fixY + 20, 20, 'fixed', false) // 定滑轮下轮（无支撑线）
  }
  if (preset.id === 'mov1' || preset.id === '1f1m2' || preset.id === '1f1m3') {
    drawPulley(ctx, cx, movY, 16, 'moving')
  }
  if (isDouble) {
    drawPulley(ctx, cx, movY - 16, 16, 'movingFlat') // 动滑轮上轮（平底）
    drawPulley(ctx, cx, movY + 16, 16, 'movingFlat') // 动滑轮下轮（平底）
  }

  // ===== 吊架（动滑轮轴 → 重物，画在轮前） =====
  if (preset.id !== 'fix1') {
    const hangerTop = isDouble ? movY + 16 : movY // 轴心出发，穿过六边形轮底
    ctx.strokeStyle = INK
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, hangerTop)
    ctx.lineTo(cx, loadTop)
    ctx.stroke()
  }
  drawLoad(ctx, loadX, loadTop, state.G)

  // ===== 手拉符号 + F 标签 =====
  const last = path[path.length - 1]
  const dir = preset.pull === 'up' ? -1 : 1
  drawHand(ctx, last.x, pullY, dir)
  ctx.fillStyle = INK
  ctx.font = '600 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`F=${state.F.toFixed(2)}N ${preset.pull === 'up' ? '↑' : '↓'}`, last.x + 12, pullY)

  // ===== 底部标签（情况名） =====
  ctx.fillStyle = INK
  ctx.font = '600 16px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(PRESET_LABEL[preset.id].bottom, cx, h - 14)
}

// ========== 绳子路径设计 ==========
// 一根完整的绳子：一端固定在滑轮组轴上，依次绕过每个滑轮（贴轮缘相切），自由端拉出。
// 同轴布局下绳段自然竖直，与中间轮子的投影重叠处由轮子遮挡（三维中绳子从轮后经过）。
// 路径元素：{ t:'line', x, y } 端点；{ t:'arc', cx, cy, r, ccw } 滑轮圆弧。
const buildPath = (id, cx, movY, loadTop, pullY) => {
  const G = GEOM
  switch (id) {
    // 单定滑轮：绳端系重物 → 绕定滑轮下半圈 → 自由端下拉
    case 'fix1':
      return [
        { t: 'line', x: cx - 80, y: loadTop },
        { t: 'arc', cx, cy: G.fixY, r: 20, ccw: true },
        { t: 'line', x: cx + 80, y: pullY }
      ]
    // 单动滑轮：固定端挂横梁钩 → 绕动滑轮上圈 → 自由端上拉
    case 'mov1':
      return [
        { t: 'line', x: cx - 70, y: G.beamY + 8 },
        { t: 'arc', cx, cy: movY, r: 16, ccw: false },
        { t: 'line', x: cx + 70, y: pullY }
      ]
    // 一定一动 n=2：绳端系定滑轮轴 → 绕动滑轮(回头整圈) → 绕定滑轮 → 自由端下拉
    case '1f1m2':
      return [
        { t: 'line', x: cx - 28, y: G.fixY },
        { t: 'arc', cx, cy: movY, r: 16, ccw: false },
        { t: 'arc', cx, cy: G.fixY, r: 20, ccw: true },
        { t: 'line', x: cx + 70, y: pullY }
      ]
    // 一定一动 n=3：绳端系动滑轮轴 → 绕定滑轮(回头整圈) → 绕动滑轮上圈 → 自由端上拉
    case '1f1m3':
      return [
        { t: 'line', x: cx - 28, y: movY },
        { t: 'arc', cx, cy: G.fixY, r: 20, ccw: false },
        { t: 'arc', cx, cy: movY, r: 16, ccw: false },
        { t: 'line', x: cx + 70, y: pullY }
      ]
    // 二定二动 n=4：绳端系定滑轮组轴 → M1回头 → D2回头 → M2回头 → D1回头 → 自由端下拉
    case '2f2m4':
      return [
        { t: 'line', x: cx - 28, y: G.fixY },
        { t: 'arc', cx, cy: movY - 16, r: 16, ccw: false },
        { t: 'arc', cx, cy: G.fixY + 20, r: 20, ccw: true },
        { t: 'arc', cx, cy: movY + 16, r: 16, ccw: false },
        { t: 'arc', cx, cy: G.fixY - 20, r: 20, ccw: true },
        { t: 'line', x: cx + 70, y: pullY }
      ]
    // 二定二动 n=5：绳端系动滑轮组轴 → D1回头 → M1回头 → D2回头 → M2上圈 → 自由端上拉
    case '2f2m5':
      return [
        { t: 'line', x: cx - 28, y: movY },
        { t: 'arc', cx, cy: G.fixY - 20, r: 20, ccw: false },
        { t: 'arc', cx, cy: movY - 16, r: 16, ccw: false },
        { t: 'arc', cx, cy: G.fixY + 20, r: 20, ccw: true },
        { t: 'arc', cx, cy: movY + 16, r: 16, ccw: false },
        { t: 'line', x: cx + 70, y: pullY }
      ]
    default:
      return []
  }
}

// 绳子绘制：直线段截断于轮缘外切点，滑轮处画贴缘圆弧（半径 r+2 露出 2px 相切效果）
// 入出角差 < 20°（回头）→ 绕轮一整圈；否则按 ccw 方向走自然短弧
const drawRope = (ctx, path) => {
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.beginPath()
  let pen = null
  for (let i = 0; i < path.length; i++) {
    const p = path[i]
    if (p.t === 'arc') {
      const prev = pen || path[i - 1]
      const next = path[i + 1]
      const aIn = Math.atan2(prev.y - p.cy, prev.x - p.cx)
      const aOut = Math.atan2(next.y - p.cy, next.x - p.cx)
      const inPt = { x: p.cx + (p.r + 2) * Math.cos(aIn), y: p.cy + (p.r + 2) * Math.sin(aIn) }
      if (pen) ctx.lineTo(inPt.x, inPt.y)
      else ctx.moveTo(inPt.x, inPt.y)
      let da = aOut - aIn
      while (da > Math.PI) da -= 2 * Math.PI
      while (da < -Math.PI) da += 2 * Math.PI
      if (Math.abs(da) < 0.35) {
        // 回头：绕轮一整圈
        ctx.arc(p.cx, p.cy, p.r + 2, aIn, aIn + 2 * Math.PI, false)
      } else {
        ctx.arc(p.cx, p.cy, p.r + 2, aIn, aOut, p.ccw)
      }
      pen = { x: p.cx + (p.r + 2) * Math.cos(aOut), y: p.cy + (p.r + 2) * Math.sin(aOut) }
    } else {
      if (pen) ctx.lineTo(p.x, p.y)
      else ctx.moveTo(p.x, p.y)
      pen = p
    }
  }
  ctx.stroke()
}

// 固定端钩子：绳子一端系在滑轮组轴上（或横梁钩）
const drawAnchorHook = (ctx, anchor, presetId, cx, movY) => {
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (presetId === 'mov1') {
    // 横梁钩：从横梁垂下的小钩
    ctx.moveTo(anchor.x, GEOM.beamY)
    ctx.lineTo(anchor.x, anchor.y)
  } else if (presetId === 'fix1') {
    // 绳端直接系重物吊环
    return
  } else {
    // 系在滑轮组轴上：从固定端点连线到轴心（截断于轮缘）
    const axleX = cx
    const axleY = presetId === '1f1m2' || presetId === '2f2m4' ? GEOM.fixY : movY
    const rimX = cx - (presetId === '1f1m2' || presetId === '2f2m4' ? 20 : 16)
    ctx.moveTo(anchor.x, axleY)
    ctx.lineTo(rimX, axleY)
  }
  ctx.stroke()
  // 钩尖小圆（线框）
  ctx.beginPath()
  ctx.arc(anchor.x, anchor.y, 3, 0, Math.PI * 2)
  ctx.stroke()
}

// 滑轮线框（参照 R.jpg 风格）：定滑轮=圆轮+挂梁支撑线+轴毂；
// 动滑轮=六边形（平顶圆角+梯形变宽+V 形收口；双轮叠放时用平底避免交叉）
const drawPulley = (ctx, x, y, r, kind, withSupport = true) => {
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  if (kind === 'fixed') {
    if (withSupport) {
      // 支撑线：横梁 → 轮心
      ctx.beginPath()
      ctx.moveTo(x, GEOM.beamY)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    // 轮圈（细圆环，不填充）
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    // 六边形动滑轮：平顶 + 梯形（向下变宽）+ V 收口 / 平底
    const halfTop = r * 0.42 // 顶边半宽
    const topY = y - r * 1.16 // 顶边 y
    const halfW = r * 1.1 // 最宽处半宽（轴心水平线）
    const yBot = kind === 'moving' ? y + r * 1.28 : y + r * 0.84 // 底部收口 / 平底
    ctx.beginPath()
    ctx.moveTo(x - halfTop, topY)
    ctx.lineTo(x + halfTop, topY)
    ctx.lineTo(x + halfW, y)
    if (kind === 'moving') {
      ctx.lineTo(x, yBot)
      ctx.lineTo(x - halfW, y)
    } else {
      ctx.lineTo(x + halfW, yBot)
      ctx.lineTo(x - halfW, yBot)
    }
    ctx.closePath()
    ctx.stroke()
  }
  // 轴毂（两种轮共用，参考图中心小毂）
  ctx.beginPath()
  ctx.arc(x, y, 3, 0, Math.PI * 2)
  ctx.stroke()
}

// 重物：吊环 + 顶边虚线 + 线框箱体 + G 标签（参照 R.jpg：白底黑线、顶边虚线）
const drawLoad = (ctx, x, topY, G) => {
  const w = 76
  const hgt = 46
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  // 吊环（绳端到箱顶）
  ctx.beginPath()
  ctx.moveTo(x, topY - 8)
  ctx.lineTo(x, topY)
  ctx.stroke()
  // 顶边虚线（虚线在上、实线箱体在下）
  ctx.setLineDash([5, 4])
  ctx.beginPath()
  ctx.moveTo(x - w / 2, topY - 3)
  ctx.lineTo(x + w / 2, topY - 3)
  ctx.stroke()
  ctx.setLineDash([])
  // 箱体
  ctx.strokeRect(x - w / 2, topY, w, hgt)
  // G 标签
  ctx.fillStyle = INK
  ctx.font = '600 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`G=${G}N`, x, topY + hgt / 2)
}

// 手拉符号：绳端锯齿形（参照 R.jpg 的手拉记号）+ 方向箭头
const drawHand = (ctx, x, y, dir) => {
  const seg = 7
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  let sx = x
  let sy = y
  for (let i = 1; i <= 4; i++) {
    sx = x + (i % 2 === 1 ? 5 : -5)
    sy = y + dir * seg * i
    ctx.lineTo(sx, sy)
  }
  ctx.stroke()
  // 箭头（指示拉力方向）
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.lineTo(sx - 6, sy - dir * 10)
  ctx.lineTo(sx + 6, sy - dir * 10)
  ctx.closePath()
  ctx.fill()
}

const drawRuler = (ctx, hCm, loadX) => {
  const x0 = 46
  const yBot = GEOM.loadY0 + 14
  const yTop = yBot - 20 * GEOM.pxPerCm
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, yTop)
  ctx.lineTo(x0, yBot)
  ctx.stroke()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let c = 0; c <= 20; c += 2) {
    const y = yBot - c * GEOM.pxPerCm
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x0 - 6, y)
    ctx.stroke()
    ctx.fillText(String(c), x0 - 9, y)
  }
  // 当前高度指示线（墨线）
  const hy = yBot - hCm * GEOM.pxPerCm
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x0, hy)
  ctx.lineTo(loadX - 34, hy)
  ctx.stroke()
  ctx.fillStyle = INK
  ctx.font = '600 11px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`h=${hCm.toFixed(1)}cm`, x0 + 6, hy - 6)
}

// ========== 生命周期 ==========

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
})
</script>

<style lang="scss" scoped>
.pulley-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 控制面板 ========== */
.pulley-control {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ctrl-group {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
}

.group-label {
  font-size: 13px;
  font-weight: 500;
  color: $color-accent;
  margin-bottom: 8px;
}

.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  cursor: pointer;
  transition: all 0.15s;

  .preset-name {
    font-size: 12px;
  }

  .preset-n {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.55);
  }

  &:hover:not(.active) {
    border-color: rgba(245, 166, 35, 0.5);
  }

  &.active {
    border-color: $color-accent;
    background: rgba(245, 166, 35, 0.15);

    .preset-n {
      color: $color-accent;
      font-weight: 600;
    }
  }
}

.preset-desc {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  text-align: center;
}

.slider-row {
  margin-bottom: 10px;

  &:last-child {
    margin-bottom: 0;
  }
}

.slider-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 4px;
}

.slider-val {
  color: $color-accent;
  font-weight: 600;
  font-size: 13px;
}

input[type='range'] {
  width: 100%;
  accent-color: $color-accent;
  cursor: pointer;
}

.slider-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.control-tip {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
  margin: 0;
}

/* ========== 数据面板 ========== */
.pulley-data {
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

.formula-line {
  font-size: 15px;
  font-weight: 600;
  color: $color-accent;
  font-family: 'Georgia', 'Times New Roman', serif;
  letter-spacing: 0.5px;
  line-height: 1.7;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-row {
  display: flex;
  gap: 8px;
}

.data-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);

  &.half {
    flex: 1;
  }

  &.perfect {
    border-color: $color-success;
    background: rgba(82, 196, 26, 0.1);

    .card-value {
      color: $color-success;
    }
  }
}

.card-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.card-value {
  font-size: 19px;
  font-weight: 600;
  color: #fff;
  line-height: 1.2;

  .card-unit {
    font-size: 12px;
    font-weight: normal;
    color: rgba(255, 255, 255, 0.5);
    margin-left: 4px;
  }

  &.pull-dir {
    color: $color-accent;
  }

  .pull-arrow {
    font-size: 16px;
  }
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
