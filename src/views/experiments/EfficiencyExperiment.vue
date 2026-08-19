<template>
  <div class="efficiency-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="animState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：参数控制 -->
      <template #control>
        <div class="efficiency-control">
          <div class="ctrl-group">
            <div class="group-label">🏔 斜面参数</div>
            <div class="slider-row">
              <div class="slider-head">
                <span>斜面长 L</span>
                <span class="slider-val">{{ L.toFixed(1) }} m</span>
              </div>
              <input type="range" min="1" max="5" step="0.1" v-model.number="L" />
              <div class="slider-sub">最大 5 m</div>
            </div>
            <div class="slider-row">
              <div class="slider-head">
                <span>斜面高 h</span>
                <span class="slider-val">{{ h.toFixed(1) }} m</span>
              </div>
              <input type="range" min="0.2" :max="hMax" step="0.1" v-model.number="h" />
              <div class="slider-sub">坡度 h/L = {{ slope.toFixed(2) }}（θ ≈ {{ thetaDeg.toFixed(0) }}°）</div>
            </div>
          </div>

          <div class="ctrl-group">
            <div class="group-label">🧱 物体</div>
            <div class="slider-row">
              <div class="slider-head">
                <span>物体质量 m</span>
                <span class="slider-val">{{ m.toFixed(1) }} kg</span>
              </div>
              <input type="range" min="0.5" max="20" step="0.5" v-model.number="m" />
              <div class="slider-sub">重力 G = {{ G.toFixed(1) }} N（g=10 N/kg）</div>
            </div>
            <div class="check-row">
              <label class="check-label">
                <input type="checkbox" v-model="showDecomp" />
                <span>显示重力分解（G∥ / G⊥）</span>
              </label>
            </div>
          </div>

          <div class="ctrl-group">
            <div class="group-label">🪢 摩擦</div>
            <div class="slider-row">
              <div class="slider-head">
                <span>摩擦系数 μ</span>
                <span class="slider-val">{{ mu.toFixed(2) }}</span>
              </div>
              <input type="range" min="0" max="0.6" step="0.01" v-model.number="mu" />
              <div class="slider-sub">摩擦力 f = μ·G·cosθ = {{ f.toFixed(1) }} N</div>
            </div>
            <div class="quick-row">
              <button
                v-for="q in QUICK_MU"
                :key="q[0]"
                class="quick-btn"
                :class="{ active: mu === q[1] }"
                @click="mu = q[1]"
              >{{ q[0] }} μ={{ q[1] }}</button>
            </div>
          </div>

          <div class="ctrl-group">
            <div class="group-label">⏩ 拉动速度</div>
            <div class="slider-row">
              <div class="slider-head">
                <span>速度 v</span>
                <span class="slider-val">{{ v.toFixed(1) }} m/s</span>
              </div>
              <input type="range" min="0.2" max="2" step="0.1" v-model.number="v" />
              <div class="slider-sub">约 {{ pullTimeText }}拉到顶端</div>
            </div>
          </div>

          <p class="control-tip">💡 点"开始"匀速拉小车上升，观察三力与功的实时变化；改质量 m 试试——η 会变吗？</p>
        </div>
      </template>

      <!-- 中间：斜面场景画布 -->
      <template #canvas>
        <ExperimentCanvas
          ref="canvasRef"
          :draw="drawScene"
          :state="canvasState"
          :scale="1"
        />
      </template>

      <!-- 右侧：公式与实时数据 -->
      <template #data>
        <div class="efficiency-data">
          <div class="data-group">
            <div class="group-title">📐 机械效率公式</div>
            <div class="formula-box">
              <div class="formula-line">η = W有 / W总 × 100%</div>
              <div class="formula-line">W有 = Gh，W额 = fL</div>
              <div class="formula-line">W总 = FL = W有 + W额</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">实时数据</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">拉力 F（匀速拉动）</div>
                <div class="card-value">{{ F.toFixed(1) }}<span class="card-unit">N</span></div>
                <div class="card-sub">F = G·sinθ + f = {{ G.toFixed(1) }}×{{ sinT.toFixed(3) }} + {{ f.toFixed(1) }}</div>
              </div>
              <div class="card-row">
                <div class="data-card half">
                  <div class="card-label">有用功 W有</div>
                  <div class="card-value">{{ Wyou.toFixed(1) }}<span class="card-unit">J</span></div>
                  <div class="card-sub">= Gh = {{ G.toFixed(1) }}×{{ h.toFixed(1) }}</div>
                </div>
                <div class="data-card half">
                  <div class="card-label">额外功 W额</div>
                  <div class="card-value">{{ Wextra.toFixed(1) }}<span class="card-unit">J</span></div>
                  <div class="card-sub">= fL = {{ f.toFixed(1) }}×{{ L.toFixed(1) }}</div>
                </div>
              </div>
              <div class="data-card">
                <div class="card-label">总功 W总</div>
                <div class="card-value">{{ Wtotal.toFixed(1) }}<span class="card-unit">J</span></div>
                <div class="card-sub">= FL = W有 + W额</div>
              </div>
              <div class="data-card">
                <div class="card-label">机械效率 η</div>
                <div class="eta-badge">{{ eta.toFixed(1) }}%</div>
                <div class="card-sub">匀速拉动过程中 η 恒定不变</div>
              </div>
              <div class="data-card">
                <div class="card-label">拉动进度</div>
                <div class="card-value">{{ s.toFixed(1) }}<span class="card-unit">/ {{ L.toFixed(1) }} m</span></div>
                <div class="card-sub">速度 {{ v.toFixed(1) }} m/s · 倾角 θ = {{ thetaDeg.toFixed(0) }}°</div>
              </div>
              <div class="data-card tip-card">
                <div class="card-label">💡 发现</div>
                <div class="card-sub">改动物体质量 m，观察 η——机械效率与物重无关！</div>
              </div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">📈 η – 坡度关系曲线</div>
            <canvas ref="etaChartRef" class="chart-canvas"></canvas>
            <div class="chart-note">横轴坡度 h/L，纵轴机械效率 η；橙色圆点为当前工况（μ = {{ mu.toFixed(2) }}）。坡度越大，η 越高。</div>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import ExperimentLayout from '@/layouts/ExperimentLayout.vue'
import ExperimentCanvas from '@/components/ExperimentCanvas.vue'
import { efficiencyConfig } from '@/config/experiments/mechanics/efficiency.js'

const config = efficiencyConfig
const G_CONST = 10 // g = 10 N/kg

// ========== 参数 ==========
const L = ref(3) // 斜面长 m
const h = ref(1.5) // 斜面高 m
const m = ref(2) // 物体质量 kg
const mu = ref(0.2) // 摩擦系数
const v = ref(1) // 拉动速度 m/s
const showDecomp = ref(true) // 显示重力分解

const QUICK_MU = [
  ['光滑', 0], ['普通', 0.2], ['粗糙', 0.4]
]

// ========== 约束 ==========
const hMax = computed(() => Math.min(3, L.value - 0.1))
watch(L, () => {
  if (h.value > hMax.value) h.value = hMax.value
})

// ========== 物理量 ==========
const G = computed(() => m.value * G_CONST) // 重力 N
const sinT = computed(() => h.value / L.value)
const cosT = computed(() => Math.sqrt(Math.max(0, 1 - sinT.value ** 2)))
const theta = computed(() => Math.asin(sinT.value)) // 倾角 rad
const thetaDeg = computed(() => (theta.value * 180) / Math.PI)
const slope = computed(() => h.value / L.value)
const f = computed(() => mu.value * G.value * cosT.value) // 摩擦力 N
const F = computed(() => G.value * sinT.value + f.value) // 匀速拉力 N
const Nnorm = computed(() => G.value * cosT.value) // 支持力 N（画分解用）

// ========== 动画 ==========
const animState = ref('idle') // idle / running / paused / finished
const s = ref(0) // 沿斜面位移 m
let rafId = null
let t0 = 0
let elapsed0 = 0

const pullTime = computed(() => L.value / v.value)
const pullTimeText = computed(() => {
  const t = pullTime.value
  return t < 60 ? '约 ' + t.toFixed(0) + ' 秒' : '约 ' + (t / 60).toFixed(1) + ' 分钟'
})

// 功与效率（匀速恒力，过程中 η 恒定）
const Wyou = computed(() => G.value * h.value * Math.min(1, s.value / L.value))
const Wtotal = computed(() => F.value * s.value)
const Wextra = computed(() => Wtotal.value - Wyou.value)
const eta = computed(() => (F.value > 1e-9 ? (G.value * h.value) / (F.value * L.value) * 100 : 0))

const canvasState = computed(() => ({
  L: L.value,
  h: h.value,
  m: m.value,
  mu: mu.value,
  v: v.value,
  s: s.value,
  G: G.value,
  F: F.value,
  f: f.value,
  N: Nnorm.value,
  sinT: sinT.value,
  cosT: cosT.value,
  theta: theta.value,
  thetaDeg: thetaDeg.value,
  eta: eta.value,
  showDecomp: showDecomp.value
}))

// ========== 动画控制 ==========
const applyFrame = (t) => {
  s.value = Math.min(L.value, v.value * t)
}

const step = (now) => {
  const t = (now - t0) / 1000 + elapsed0
  applyFrame(t)
  if (s.value >= L.value - 1e-9) {
    animState.value = 'finished'
    rafId = null
    return
  }
  rafId = requestAnimationFrame(step)
}

const handleStart = () => {
  if (animState.value === 'running') return
  if (animState.value === 'finished') {
    elapsed0 = 0
    s.value = 0
  }
  animState.value = 'running'
  t0 = performance.now()
  rafId = requestAnimationFrame(step)
}

const handlePause = () => {
  if (animState.value !== 'running') return
  elapsed0 += (performance.now() - t0) / 1000
  cancelAnimationFrame(rafId)
  rafId = null
  animState.value = 'paused'
}

const handleReset = () => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
  elapsed0 = 0
  s.value = 0
  animState.value = 'idle'
}

// ========== 画布：斜面场景 ==========
const INK = '#1a1a1a'
const COLOR_F = '#e07b00' // 拉力 橙
const COLOR_G = '#2e9e44' // 重力 绿
const COLOR_FR = '#d9534f' // 摩擦 红
const COLOR_N = '#1f6fb5' // 支持力 蓝
const WALL = '#37474f'
const OBJ_FILL = '#1f4e79'
const OBJ_EDGE = '#0f2d47'

const drawArrow = (ctx, x1, y1, x2, y2, color, width = 2) => {
  const ang = Math.atan2(y2 - y1, x2 - x1)
  const head = 8
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - head * Math.cos(ang - 0.42), y2 - head * Math.sin(ang - 0.42))
  ctx.lineTo(x2 - head * Math.cos(ang + 0.42), y2 - head * Math.sin(ang + 0.42))
  ctx.closePath()
  ctx.fill()
}

const drawScene = (ctx, state, utils) => {
  const w = utils.canvasWidth
  const h = utils.canvasHeight

  // 背景白
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)

  // 布局：按最大尺寸固定缩放（改参数时画面不跳）
  const marginL = 118
  const marginR = 50
  const marginT = 64
  const marginB = 46
  const scale = Math.min((w - marginL - marginR) / 5.4, (h - marginT - marginB) / 3.4)
  const groundY = h - marginB
  const baseX = marginL + 8
  // 水平投影 = √(L²−h²)，保证斜边真实长度为 L·scale、斜边角 = θ（小车才能贴斜面）
  const topX = baseX + Math.sqrt(state.L * state.L - state.h * state.h) * scale
  const topY = groundY - state.h * scale

  // 地面线
  ctx.strokeStyle = '#9aa5b1'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, groundY)
  ctx.lineTo(w, groundY)
  ctx.stroke()

  // 斜面三角：底边 + 斜边 + 竖直高虚线
  ctx.strokeStyle = WALL
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  // 斜边
  ctx.beginPath()
  ctx.moveTo(baseX, groundY)
  ctx.lineTo(topX, topY)
  ctx.stroke()
  // 底边（加粗）
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(baseX, groundY)
  ctx.lineTo(topX, groundY)
  ctx.stroke()
  // 竖直高虚线
  ctx.strokeStyle = '#9aa5b1'
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 5])
  ctx.beginPath()
  ctx.moveTo(topX, groundY)
  ctx.lineTo(topX, topY)
  ctx.stroke()
  ctx.setLineDash([])

  // 标注：h、L、θ
  ctx.fillStyle = '#6b7683'
  ctx.font = '12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText('h=' + state.h.toFixed(1) + 'm', topX - 8, (groundY + topY) / 2)
  // L 标注在斜边中点
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText('L=' + state.L.toFixed(1) + 'm', (baseX + topX) / 2 + 6, (groundY + topY) / 2 - 4)
  // θ 角弧
  ctx.strokeStyle = '#6b7683'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(baseX, groundY, 18, -state.theta, 0)
  ctx.stroke()
  ctx.fillStyle = '#6b7683'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText('θ=' + state.thetaDeg.toFixed(0) + '°', baseX + 22, groundY - 8)

  // 小车（沿斜面位移 s）：translate 原点 = 车底中点（贴斜面），车体整体画在斜面之上
  const carW = 54
  const carH = 26
  const wheelR = 6
  const cx = baseX + state.s * state.cosT * scale
  const cy = groundY - state.s * state.sinT * scale
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-state.theta)
  // 车体：局部 y ∈ [-carH, 0]，底边贴原点
  ctx.fillStyle = OBJ_FILL
  ctx.fillRect(-carW / 2, -carH, carW, carH)
  ctx.strokeStyle = OBJ_EDGE
  ctx.lineWidth = 1.5
  ctx.strokeRect(-carW / 2, -carH, carW, carH)
  // 轮子：底部贴原点
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(-carW / 4, -wheelR, wheelR, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(carW / 4, -wheelR, wheelR, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // 力箭头长度比例：重力箭头固定 56px，其余按比例
  const k = 56 / state.G
  const minLen = 12
  // 车体中心（局部 (0, -carH/2) → 世界坐标）
  const carCenterX = cx - (carH / 2) * state.sinT
  const carCenterY = cy - (carH / 2) * state.cosT

  // 重力 G：竖直向下（绿）
  drawArrow(ctx, carCenterX, carCenterY, carCenterX, carCenterY + Math.max(minLen, k * state.G), COLOR_G, 2.4)
  ctx.fillStyle = COLOR_G
  ctx.font = '600 12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('G=' + state.G.toFixed(0) + 'N', carCenterX + 6, carCenterY + Math.max(minLen, k * state.G) * 0.5)

  // 力的分解（虚线，可选）
  if (state.showDecomp) {
    // G∥ 沿斜面向下（绿虚线）
    const glen = Math.max(minLen, k * state.G)
    ctx.strokeStyle = COLOR_G
    ctx.lineWidth = 1.6
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(carCenterX, carCenterY)
    ctx.lineTo(carCenterX + glen * state.cosT, carCenterY + glen * state.sinT)
    ctx.stroke()
    // G⊥ 垂直斜面向下（蓝虚线）
    ctx.strokeStyle = COLOR_N
    ctx.beginPath()
    ctx.moveTo(carCenterX, carCenterY)
    ctx.lineTo(carCenterX + glen * state.sinT, carCenterY + glen * state.cosT)
    ctx.stroke()
    ctx.setLineDash([])
    // 虚线平行四边形（辅助理解）
    ctx.strokeStyle = 'rgba(31, 111, 181, 0.4)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(carCenterX + glen * state.cosT, carCenterY + glen * state.sinT)
    ctx.lineTo(carCenterX + glen * (state.cosT + state.sinT), carCenterY + glen * (state.sinT + state.cosT))
    ctx.lineTo(carCenterX + glen * state.sinT, carCenterY + glen * state.cosT)
    ctx.stroke()
    ctx.setLineDash([])
    // 标签
    ctx.fillStyle = COLOR_G
    ctx.font = '11px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('G∥=' + (state.G * state.sinT).toFixed(1) + 'N', carCenterX + glen * state.cosT * 0.45 + 4, carCenterY + glen * state.sinT * 0.45 + 2)
    ctx.fillStyle = COLOR_N
    ctx.fillText('G⊥=' + state.N.toFixed(1) + 'N', carCenterX + glen * state.sinT * 0.4 + 4, carCenterY + glen * state.cosT * 0.4 + 2)
  }

  // 摩擦力 f：从车底接触点（= translate 原点，贴斜面）沿斜面向下（红）
  const contactX = cx
  const contactY = cy
  const flen = Math.max(minLen, k * state.f)
  drawArrow(ctx, contactX, contactY, contactX + flen * state.cosT, contactY + flen * state.sinT, COLOR_FR, 2)
  ctx.fillStyle = COLOR_FR
  ctx.font = '600 12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('f=' + state.f.toFixed(1) + 'N', contactX + flen * state.cosT * 0.3 + 4, contactY + flen * state.sinT * 0.3)

  // 拉力 F：从车前端中点（局部 (carW/2, -carH/2)）沿斜面向上（橙）
  const frontX = cx + (carW / 2) * state.cosT - (carH / 2) * state.sinT
  const frontY = cy - (carW / 2) * state.sinT - (carH / 2) * state.cosT
  const flen2 = Math.max(minLen, k * state.F)
  drawArrow(ctx, frontX, frontY, frontX + flen2 * state.cosT, frontY - flen2 * state.sinT, COLOR_F, 2.4)
  ctx.fillStyle = COLOR_F
  ctx.fillText('F=' + state.F.toFixed(1) + 'N', frontX + flen2 * state.cosT * 0.35 + 4, frontY - flen2 * state.sinT * 0.35 - 14)

  // 顶部状态：η + 进度
  ctx.fillStyle = '#2e9e44'
  ctx.font = '700 30px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('η = ' + state.eta.toFixed(1) + '%', w / 2, 12)
  ctx.fillStyle = '#6b7683'
  ctx.font = '12px "Microsoft YaHei", sans-serif'
  ctx.fillText('拉动 ' + state.s.toFixed(1) + ' / ' + state.L.toFixed(1) + ' m · 速度 ' + state.v.toFixed(1) + ' m/s', w / 2, 48)
}

// ========== 折线图：η – 坡度 ==========
const etaChartRef = ref(null)
let chartCtx = null
let chartDpr = 1
let chartW = 0
let chartH = 0

const initChart = () => {
  const c = etaChartRef.value
  if (!c) return
  const rect = c.getBoundingClientRect()
  if (rect.width < 10) return
  chartDpr = window.devicePixelRatio || 1
  chartW = rect.width
  chartH = rect.height
  c.width = chartW * chartDpr
  c.height = chartH * chartDpr
  chartCtx = c.getContext('2d')
  drawEtaChart()
}

const drawEtaChart = () => {
  if (!chartCtx || !chartW) return
  const ctx = chartCtx
  ctx.setTransform(chartDpr, 0, 0, chartDpr, 0, 0)
  ctx.clearRect(0, 0, chartW, chartH)

  const ml = 36
  const mr = 10
  const mt = 10
  const mb = 22
  const pw = chartW - ml - mr
  const ph = chartH - mt - mb

  // 网格
  ctx.strokeStyle = '#e8eaed'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const gy = mt + (ph / 4) * i
    ctx.beginPath()
    ctx.moveTo(ml, gy)
    ctx.lineTo(ml + pw, gy)
    ctx.stroke()
    const gx = ml + (pw / 4) * i
    ctx.beginPath()
    ctx.moveTo(gx, mt)
    ctx.lineTo(gx, mt + ph)
    ctx.stroke()
  }

  // 轴标签
  ctx.fillStyle = '#8a94a0'
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('0', ml, mt + ph + 4)
  ctx.fillText('1.0', ml + pw, mt + ph + 4)
  ctx.fillText('坡度 h/L', ml + pw / 2, mt + ph + 5)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText('100%', ml - 4, mt + 4)
  ctx.fillText('0%', ml - 4, mt + ph + 2)

  // η(x) = x/(x + μ√(1-x²))，x = h/L ∈ (0,1)
  const muNow = mu.value
  const etaOf = (x) => {
    if (muNow < 1e-6) return 100
    const denom = x + muNow * Math.sqrt(Math.max(0, 1 - x * x))
    return denom > 1e-9 ? (x / denom) * 100 : 0
  }
  // 曲线（绿）
  ctx.strokeStyle = '#2e9e44'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  let first = true
  for (let i = 0; i <= 100; i++) {
    const x = 0.01 + (0.94 * i) / 100
    const y = etaOf(x)
    const px = ml + (x / 1) * pw
    const py = mt + ph - (y / 100) * ph
    if (first) { ctx.moveTo(px, py); first = false } else ctx.lineTo(px, py)
  }
  ctx.stroke()

  // 当前工况点（橙）
  const x0 = slope.value
  const y0 = eta.value
  const px0 = ml + x0 * pw
  const py0 = mt + ph - (y0 / 100) * ph
  ctx.strokeStyle = '#e07b00'
  ctx.lineWidth = 1.2
  ctx.setLineDash([4, 3])
  ctx.beginPath()
  ctx.moveTo(px0, py0)
  ctx.lineTo(px0, mt + ph)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ml, py0)
  ctx.lineTo(px0, py0)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#e07b00'
  ctx.beginPath()
  ctx.arc(px0, py0, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#e07b00'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(px0, py0, 7, 0, Math.PI * 2)
  ctx.stroke()
}

// 参数变化 → 重绘曲线
watch([L, h, mu], () => drawEtaChart())

// ========== 生命周期 ==========
const handleWindowResize = () => {
  initChart()
}

onMounted(() => {
  setTimeout(initChart, 50)
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<style lang="scss" scoped>
.efficiency-control {
  .ctrl-group {
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.12);

    &:last-child {
      border-bottom: none;
    }
  }

  .group-label {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    color: $color-accent;
  }

  .slider-row {
    margin-bottom: 10px;

    .slider-head {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 4px;
      color: $color-text-primary;
    }

    .slider-val {
      color: $color-tech-blue;
      font-weight: 600;
    }

    input[type='range'] {
      width: 100%;
      accent-color: $color-tech-blue;
    }

    .slider-sub {
      font-size: 11px;
      color: $color-text-muted;
      margin-top: 2px;
    }
  }

  .check-row {
    margin: 4px 0 8px;

    .check-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: $color-text-primary;
      cursor: pointer;
      user-select: none;
    }
  }

  .quick-row {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 4px;
  }

  .quick-btn {
    padding: 3px 8px;
    font-size: 11px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    color: $color-text-primary;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(24, 144, 255, 0.2);
    }

    &.active {
      background: $color-accent;
      border-color: $color-accent;
      color: #fff;
    }
  }

  .control-tip {
    font-size: 12px;
    color: $color-text-muted;
    line-height: 1.6;
    margin-top: 4px;
  }
}

.efficiency-data {
  .data-group {
    margin-bottom: 14px;
  }

  .group-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    color: $color-accent;
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

  .data-card {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 8px 12px;

    .card-label {
      font-size: 12px;
      color: $color-text-muted;
      margin-bottom: 2px;
    }

    .card-value {
      font-size: 20px;
      font-weight: 700;
      color: $color-text-primary;
    }

    .card-unit {
      font-size: 12px;
      font-weight: 400;
      color: $color-text-muted;
      margin-left: 4px;
    }

    .card-sub {
      font-size: 11px;
      color: $color-text-muted;
      margin-top: 2px;
      line-height: 1.5;
    }
  }

  .card-row {
    display: flex;
    gap: 8px;

    .half {
      flex: 1;
    }
  }

  .eta-badge {
    display: inline-block;
    padding: 4px 16px;
    border-radius: 14px;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    background: #2e9e44;
  }

  .tip-card {
    border: 1px dashed rgba(224, 123, 0, 0.5);
  }

  .chart-canvas {
    width: 100%;
    height: 170px;
    background: #fafbfc;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .chart-note {
    font-size: 11px;
    color: $color-text-muted;
    line-height: 1.6;
    margin-top: 6px;
  }
}

.theory-content {
  line-height: 1.8;

  .formula-block,
  .keypoint-block {
    margin-top: 10px;

    h4 {
      color: $color-primary;
      margin-bottom: 4px;
    }

    ul {
      padding-left: 20px;
    }
  }

  .notes {
    margin-top: 10px;
    color: $color-text-muted;
    font-size: 13px;
  }
}
</style>
