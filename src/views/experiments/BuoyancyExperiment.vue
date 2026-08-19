<template>
  <div class="buoyancy-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="animState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：参数控制 -->
      <template #control>
        <div class="buoyancy-control">
          <div class="ctrl-group">
            <div class="group-label">🫙 容器参数</div>
            <div class="slider-row">
              <div class="slider-head">
                <span>容器底面积 S</span>
                <span class="slider-val">{{ S.toFixed(2) }} m²</span>
              </div>
              <input type="range" min="0.1" max="1" step="0.05" v-model.number="S" />
              <div class="slider-sub">最大 1 m²</div>
            </div>
            <div class="slider-row">
              <div class="slider-head">
                <span>容器高 H</span>
                <span class="slider-val">{{ H.toFixed(1) }} m</span>
              </div>
              <input type="range" min="0.5" max="5" step="0.1" v-model.number="H" />
              <div class="slider-sub">最大 5 m，容积 {{ (S * H).toFixed(2) }} m³</div>
            </div>
          </div>

          <div class="ctrl-group">
            <div class="group-label">💧 液体密度</div>
            <div class="slider-row">
              <div class="slider-head">
                <span>液体密度 ρ液</span>
                <span class="slider-val">{{ rhoL.toFixed(2) }} g/cm³</span>
              </div>
              <input type="range" min="0.5" max="1.5" step="0.01" v-model.number="rhoL" />
              <div class="slider-sub">默认水 1.0 g/cm³（可调 0.5~1.5）</div>
            </div>
            <div class="quick-row">
              <button class="quick-btn" :class="{ active: rhoL === 1 }" @click="rhoL = 1">水 1.0</button>
            </div>
          </div>

          <div class="ctrl-group">
            <div class="group-label">🧱 物体数量（重叠体研究）</div>
            <div class="preset-grid">
              <button
                v-for="n in 3"
                :key="n"
                class="preset-btn"
                :class="{ active: N === n }"
                @click="setCount(n)"
              >
                <span class="preset-name">{{ n }} 个物体</span>
              </button>
            </div>
            <div class="preset-desc">物体同轴叠放（几何中心重合），浮力分别计算</div>
          </div>

          <div class="ctrl-group" v-for="(obj, i) in objs" :key="i">
            <div class="group-label">🧊 物体 {{ i + 1 }}（第 {{ i + 1 }} 层）</div>
            <div class="slider-row">
              <div class="slider-head">
                <span>底面积 s{{ i + 1 }}</span>
                <span class="slider-val">{{ obj.s.toFixed(2) }} m²</span>
              </div>
              <input type="range" min="0.01" :max="sMax" step="0.01" v-model.number="obj.s" />
              <div class="slider-sub">须小于容器底面积 {{ S.toFixed(2) }} m²</div>
            </div>
            <div class="slider-row">
              <div class="slider-head">
                <span>高度 h{{ i + 1 }}</span>
                <span class="slider-val">{{ obj.h.toFixed(2) }} m</span>
              </div>
              <input type="range" min="0.1" :max="hMax(i)" step="0.01" v-model.number="obj.h" />
              <div class="slider-sub">叠放总高 {{ totalH.toFixed(2) }} m（须小于容器高）</div>
            </div>
            <div class="slider-row">
              <div class="slider-head">
                <span>密度 ρ{{ i + 1 }}</span>
                <span class="slider-val">{{ obj.rho.toFixed(2) }} g/cm³</span>
              </div>
              <input type="range" min="0.05" max="20" step="0.05" v-model.number="obj.rho" />
              <div class="slider-sub">相对液体密度决定沉浮</div>
            </div>
            <div class="quick-row">
              <button
                v-for="q in QUICK_RHO"
                :key="q[0]"
                class="quick-btn"
                :class="{ active: obj.rho === q[1] }"
                @click="obj.rho = q[1]"
              >{{ q[0] }} {{ q[1] }}</button>
            </div>
          </div>

          <p class="control-tip">💡 点"开始"向容器注液（3 秒注满），实时观察浮力/合力与物体状态变化</p>
        </div>
      </template>

      <!-- 中间：注液场景画布 -->
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
        <div class="buoyancy-data">
          <div class="data-group">
            <div class="group-title">📐 阿基米德原理</div>
            <div class="formula-box">
              <div class="formula-line">F浮 = ρ液·g·V排</div>
              <div class="formula-line">漂浮：F浮 = G（部分浸没）</div>
              <div class="formula-line">悬浮：F浮 = G（完全浸没）</div>
              <div class="formula-line">沉底：F浮 &lt; G</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">实时数据</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">注入液体体积 V注</div>
                <div class="card-value">{{ vinj.toFixed(2) }}<span class="card-unit">m³</span></div>
                <div class="card-sub">{{ (vinj * 1000).toFixed(0) }} L</div>
              </div>
              <div class="data-card">
                <div class="card-label">浸没物体体积 V排</div>
                <div class="card-value">{{ vSub.toFixed(3) }}<span class="card-unit">m³</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">物体所受浮力 F浮</div>
                <div class="card-value">{{ fbTotal.toFixed(1) }}<span class="card-unit">N</span></div>
              </div>
              <div class="card-row">
                <div class="data-card half">
                  <div class="card-label">总重力 G</div>
                  <div class="card-value">{{ Gtotal.toFixed(1) }}<span class="card-unit">N</span></div>
                </div>
                <div class="data-card half">
                  <div class="card-label">合力 F合</div>
                  <div class="card-value" :class="fnet >= 0 ? 'f-up' : 'f-down'">
                    {{ fnet >= 0 ? '↑' : '↓' }}{{ Math.abs(fnet).toFixed(1) }}<span class="card-unit">N</span>
                  </div>
                </div>
              </div>
              <div class="data-card">
                <div class="card-label">物体当前状态</div>
                <div class="state-badge" :class="state">{{ stateText }}</div>
              </div>
              <div class="data-card" v-for="(o, i) in objs" :key="i">
                <div class="card-label">物体 {{ i + 1 }} 浮力 F浮{{ i + 1 }}</div>
                <div class="card-value">{{ fb[i] ? fb[i].toFixed(1) : '0.0' }}<span class="card-unit">N</span></div>
                <div class="card-sub">ρ={{ o.rho.toFixed(2) }} g/cm³ · 浸没 {{ hSub[i] ? hSub[i].toFixed(2) : '0.00' }} m</div>
              </div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">📈 注液过程曲线</div>
            <canvas ref="chartRef" class="chart-canvas"></canvas>
            <div class="chart-legend">
              <span class="lg" style="color: #4a9eda">— V注</span>
              <span class="lg" style="color: #1f4e79">— V排</span>
              <span class="lg" style="color: #2e9e44">— F浮</span>
              <span class="lg" style="color: #e07b00">— F合</span>
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
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import ExperimentLayout from '@/layouts/ExperimentLayout.vue'
import ExperimentCanvas from '@/components/ExperimentCanvas.vue'
import { buoyancyConfig } from '@/config/experiments/mechanics/buoyancy.js'

const config = buoyancyConfig
const G_CONST = 10 // g = 10 N/kg

// ========== 参数 ==========
const S = ref(0.5) // 容器底面积 m²
const H = ref(2) // 容器高 m
const rhoL = ref(1.0) // 液体密度 g/cm³
const N = ref(1) // 物体数量
const objs = reactive([{ s: 0.25, h: 0.5, rho: 0.6 }]) // 每个物体：底面积/高度/密度

const QUICK_RHO = [
  ['木头', 0.6], ['塑料', 0.9], ['水', 1.0], ['铁', 7.9], ['铜', 8.9], ['金', 19.3]
]

// ========== 约束（底面积 < 容器底面积；叠放总高 < 容器高） ==========
const sMax = computed(() => Math.min(0.99, S.value - 0.01))
const totalH = computed(() => objs.reduce((s, o) => s + o.h, 0))
const hMax = (i) => {
  const others = objs.reduce((s, o, j) => s + (j === i ? 0 : o.h), 0)
  return Math.max(0.1, Math.min(4.99, H.value - others - 0.1))
}

const clampObjs = () => {
  objs.forEach((o) => { if (o.s > sMax.value) o.s = sMax.value })
  let total = objs.reduce((s, o) => s + o.h, 0)
  const limit = H.value - 0.1
  if (total > limit) {
    for (let i = objs.length - 1; i >= 0 && total > limit; i--) {
      const maxH = Math.max(0.1, objs[i].h - (total - limit))
      total -= objs[i].h - maxH
      objs[i].h = maxH
    }
  }
}

const setCount = (n) => {
  while (objs.length < n) objs.push({ s: 0.25, h: 0.5, rho: 0.6 })
  while (objs.length > n) objs.pop()
  N.value = n
  clampObjs()
}

watch([S, H], clampObjs)

// ========== 动画状态 ==========
const animState = ref('idle') // idle / running / paused / finished
const d = ref(0) // 液面深度 m
const y = ref(0) // 物体底面离容器底高度 m（浮起后）
const hSub = ref([]) // 各物体浸没高度
const fb = ref([]) // 各物体浮力
const state = ref('sink') // sink / float / suspend

const DURATION = 3 // 注满耗时 s
let rafId = null
let t0 = 0
let elapsed0 = 0

// ========== 物理计算 ==========
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// 纯函数：给定参数与液面深度，求物体位置/浸没/浮力/状态
const computePhysics = (S, H, rhoL, objs, d) => {
  const rhoLkg = rhoL * 1000 // g/cm³ → kg/m³
  const g = G_CONST
  let hTotal = 0
  objs.forEach((o) => { hTotal += o.h })
  const G = objs.reduce((s, o) => s + o.rho * 1000 * g * o.s * o.h, 0)

  // 物体底面在 y 时（叠放体整体上移 y）的总浮力
  const fbAt = (yy) => {
    let v = 0
    let acc = yy
    objs.forEach((o) => {
      v += o.s * clamp(d - acc, 0, o.h)
      acc += o.h
    })
    return rhoLkg * g * v
  }

  let posY = 0
  let st = 'sink'
  if (d > 0.001 && G > 0) {
    const fb0 = fbAt(0)
    if (fb0 >= G - 1e-6) {
      // 浮力足以托起物体
      if (d >= hTotal - 1e-6 && Math.abs(fb0 - G) < Math.max(1e-3, G * 1e-4)) {
        // 完全浸没且浮力 = 重力 → 悬浮
        posY = Math.max(0, d - hTotal)
        st = 'suspend'
      } else {
        // 二分求平衡位置（漂浮）：fb(y) = G
        let lo = 0
        let hi = d
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2
          if (fbAt(mid) > G) lo = mid
          else hi = mid
        }
        posY = (lo + hi) / 2
        st = 'float'
      }
    }
  }

  const hSubArr = []
  const fbArr = []
  let acc = posY
  objs.forEach((o) => {
    const hs = clamp(d - acc, 0, o.h)
    hSubArr.push(hs)
    fbArr.push(rhoLkg * g * o.s * hs)
    acc += o.h
  })
  const vSub = hSubArr.reduce((s, hs, i) => s + objs[i].s * hs, 0)
  const fbTotal = fbArr.reduce((s, x) => s + x, 0)

  return { y: posY, hSub: hSubArr, fb: fbArr, vSub, fbTotal, G, fnet: fbTotal - G, state: st }
}

// ========== 输出数据 ==========
const vinj = computed(() => S.value * d.value) // m³
const vSub = computed(() => hSub.value.reduce((s, hs, i) => s + objs[i].s * hs, 0))
const fbTotal = computed(() => fb.value.reduce((s, x) => s + x, 0))
const Gtotal = computed(() => objs.reduce((s, o) => s + o.rho * 1000 * G_CONST * o.s * o.h, 0))
const fnet = computed(() => fbTotal.value - Gtotal.value)
const stateText = computed(() => ({ sink: '沉底', float: '漂浮', suspend: '悬浮' }[state.value]))

const canvasState = computed(() => ({
  S: S.value,
  H: H.value,
  rhoL: rhoL.value,
  d: d.value,
  y: y.value,
  objs: objs.map((o) => ({ ...o })),
  hSub: [...hSub.value],
  state: state.value
}))

// ========== 动画控制 ==========
const applyFrame = (t) => {
  const p = Math.min(1, t / DURATION)
  d.value = H.value * p
  const phys = computePhysics(S.value, H.value, rhoL.value, objs, d.value)
  y.value = phys.y
  hSub.value = phys.hSub
  fb.value = phys.fb
  state.value = phys.state
  series.value.push({
    t,
    vinj: S.value * d.value,
    vsub: phys.vSub,
    fb: phys.fbTotal,
    fnet: phys.fnet
  })
  drawChart()
}

const step = (now) => {
  const t = (now - t0) / 1000 + elapsed0
  applyFrame(t)
  if (t >= DURATION) {
    animState.value = 'finished'
    rafId = null
    return
  }
  rafId = requestAnimationFrame(step)
}

const handleStart = () => {
  if (animState.value === 'running') return
  if (animState.value === 'finished') {
    // 重新注液：从 0 开始
    elapsed0 = 0
    series.value = []
    d.value = 0
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
  d.value = 0
  y.value = 0
  hSub.value = []
  fb.value = []
  state.value = 'sink'
  series.value = []
  animState.value = 'idle'
  drawChart()
}

// ========== 画布：容器注液场景 ==========
const INK = '#1a1a1a'
const LIQUID = 'rgba(140, 200, 240, 0.45)'
const LIQUID_LINE = '#5b9bd5'
const OBJ_FILL = '#1f4e79'
const OBJ_EDGE = '#0f2d47'
const WALL = '#37474f'

const drawScene = (ctx, state, utils) => {
  const w = utils.canvasWidth
  const h = utils.canvasHeight
  const cx = w / 2

  // 背景白
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)

  // 布局：容器自适应缩放
  const marginL = 70
  const marginR = 40
  const marginT = 50
  const marginB = 28
  const innerW = w - marginL - marginR
  const innerH = h - marginT - marginB
  const scale = Math.min(innerW / state.S, innerH / state.H)
  const baseY = h - marginB
  const topY = baseY - state.H * scale
  const leftX = cx - (state.S * scale) / 2
  const rightX = cx + (state.S * scale) / 2
  const wall = 4

  // ===== 刻度（容器左壁外侧） =====
  ctx.strokeStyle = '#9aa5b1'
  ctx.lineWidth = 1
  ctx.fillStyle = '#6b7683'
  ctx.font = '11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  const ticks = [0, 0.5, 1]
  ticks.forEach((r) => {
    const ty = baseY - r * state.H * scale
    ctx.beginPath()
    ctx.moveTo(leftX - 14, ty)
    ctx.lineTo(leftX - 6, ty)
    ctx.stroke()
    ctx.fillText((r * state.H).toFixed(1) + 'm', leftX - 18, ty)
  })

  // ===== 容器（U 形：底 + 左右壁） =====
  ctx.strokeStyle = WALL
  ctx.lineWidth = wall
  ctx.lineCap = 'butt'
  // 底
  ctx.beginPath()
  ctx.moveTo(leftX - wall, baseY)
  ctx.lineTo(rightX + wall, baseY)
  ctx.stroke()
  // 左壁
  ctx.beginPath()
  ctx.moveTo(leftX - wall / 2, baseY)
  ctx.lineTo(leftX - wall / 2, topY)
  ctx.stroke()
  // 右壁
  ctx.beginPath()
  ctx.moveTo(rightX + wall / 2, baseY)
  ctx.lineTo(rightX + wall / 2, topY)
  ctx.stroke()

  // ===== 液体（浅蓝，从底到液面） =====
  const liqY = baseY - state.d * scale
  if (state.d > 0.001) {
    ctx.fillStyle = LIQUID
    ctx.fillRect(leftX, liqY, rightX - leftX, baseY - liqY)
    // 液面线
    ctx.strokeStyle = LIQUID_LINE
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(leftX - 6, liqY)
    ctx.lineTo(rightX + 6, liqY)
    ctx.stroke()
    // 液面标注
    ctx.fillStyle = '#3d7ea6'
    ctx.font = '12px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText('液面 ' + state.d.toFixed(2) + ' m', leftX - 6, liqY - 3)
  }

  // ===== 物体（深蓝矩形，自下而上叠放） =====
  let acc = state.y
  state.objs.forEach((o, i) => {
    const x0 = cx - (o.s * scale) / 2
    const y0 = baseY - (acc + o.h) * scale
    const wpx = o.s * scale
    const hpx = o.h * scale
    ctx.fillStyle = OBJ_FILL
    ctx.fillRect(x0, y0, wpx, hpx)
    ctx.strokeStyle = OBJ_EDGE
    ctx.lineWidth = 1.5
    ctx.strokeRect(x0, y0, wpx, hpx)
    // 标签（物体太矮时省略文字）
    if (hpx > 22 && wpx > 46) {
      ctx.fillStyle = '#fff'
      ctx.font = '11px "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('物体' + (i + 1), cx, y0 + hpx * 0.36)
      ctx.fillText(o.rho.toFixed(1) + ' g/cm³', cx, y0 + hpx * 0.62)
    }
    acc += o.h
  })

  // ===== 状态徽标（顶部居中） =====
  const stateColor = { sink: '#d9534f', float: '#2e9e44', suspend: '#1f6fb5' }[state.state]
  const stateName = { sink: '沉底', float: '漂浮', suspend: '悬浮' }[state.state]
  ctx.fillStyle = stateColor
  ctx.font = '600 18px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('● ' + stateName, cx, 14)
  ctx.font = '12px "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#6b7683'
  ctx.fillText('注液进度 ' + Math.min(1, state.d / state.H) * 100 + '%', cx, 38)
}

// ========== 折线图（注液过程） ==========
const chartRef = ref(null)
const series = ref([])
let chartCtx = null
let chartDpr = 1
let chartW = 0
let chartH = 0

const initChart = () => {
  const c = chartRef.value
  if (!c) return
  const rect = c.getBoundingClientRect()
  if (rect.width < 10) return
  chartDpr = window.devicePixelRatio || 1
  chartW = rect.width
  chartH = rect.height
  c.width = chartW * chartDpr
  c.height = chartH * chartDpr
  chartCtx = c.getContext('2d')
  drawChart()
}

const drawChart = () => {
  if (!chartCtx || !chartW) return
  const ctx = chartCtx
  ctx.setTransform(chartDpr, 0, 0, chartDpr, 0, 0)
  ctx.clearRect(0, 0, chartW, chartH)

  const ml = 40
  const mr = 40
  const mt = 10
  const mb = 22
  const pw = chartW - ml - mr
  const ph = chartH - mt - mb

  const data = series.value
  const tMax = Math.max(DURATION, data.length ? data[data.length - 1].t : 0)
  let vMax = 0.001
  let fMax = 0.001
  let fMin = 0
  data.forEach((p) => {
    vMax = Math.max(vMax, p.vinj, p.vsub)
    fMax = Math.max(fMax, p.fb, p.fnet)
    fMin = Math.min(fMin, p.fnet)
  })
  const fRange = fMax - fMin || 0.001

  // 网格
  ctx.strokeStyle = '#e8eaed'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const gy = mt + (ph / 4) * i
    ctx.beginPath()
    ctx.moveTo(ml, gy)
    ctx.lineTo(ml + pw, gy)
    ctx.stroke()
  }
  for (let i = 0; i <= 4; i++) {
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
  ctx.fillText(tMax.toFixed(1) + 's', ml + pw, mt + ph + 4)
  ctx.fillText('时间 t(s)', ml + pw / 2, mt + ph + 5)
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'right'
  ctx.fillText('V: ' + vMax.toFixed(2) + ' m³', ml - 4, mt + 4)
  ctx.textAlign = 'left'
  ctx.fillText('F: ' + fMax.toFixed(0) + ' N', ml + pw + 4, mt + 4)
  if (fMin < 0) {
    ctx.textAlign = 'left'
    ctx.fillText(fMin.toFixed(0), ml + pw + 4, mt + ph)
  }

  // 四条曲线
  const defs = [
    { key: 'vinj', color: '#4a9eda', axis: 'v' },
    { key: 'vsub', color: '#1f4e79', axis: 'v' },
    { key: 'fb', color: '#2e9e44', axis: 'f' },
    { key: 'fnet', color: '#e07b00', axis: 'f' }
  ]
  defs.forEach((def) => {
    ctx.strokeStyle = def.color
    ctx.lineWidth = 1.8
    ctx.beginPath()
    data.forEach((p, i) => {
      const x = ml + (p.t / tMax) * pw
      let y
      if (def.axis === 'v') {
        y = mt + ph - (p[def.key] / vMax) * ph
      } else {
        y = mt + ph - ((p[def.key] - fMin) / fRange) * ph
      }
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  })
}

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
.buoyancy-control {
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

  .preset-grid {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
  }

  .preset-btn {
    flex: 1;
    padding: 8px 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: $color-text-primary;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;

    &.active {
      background: $color-tech-blue;
      border-color: $color-tech-blue;
      color: #fff;
    }

    .preset-name {
      display: block;
    }
  }

  .preset-desc {
    font-size: 11px;
    color: $color-text-muted;
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

.buoyancy-data {
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
    background: rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    line-height: 1.9;
    color: $color-text-primary;
    font-family: 'Consolas', 'Courier New', monospace;
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

      &.f-up {
        color: $color-success;
      }

      &.f-down {
        color: #d9534f;
      }
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
    }
  }

  .card-row {
    display: flex;
    gap: 8px;

    .half {
      flex: 1;
    }
  }

  .state-badge {
    display: inline-block;
    padding: 4px 16px;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;

    &.sink {
      background: #d9534f;
    }

    &.float {
      background: #2e9e44;
    }

    &.suspend {
      background: #1f6fb5;
    }
  }

  .chart-canvas {
    width: 100%;
    height: 170px;
    background: #fafbfc;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .chart-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 6px;
    font-size: 11px;
    font-weight: 600;
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
