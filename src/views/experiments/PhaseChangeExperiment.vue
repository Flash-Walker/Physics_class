<template>
  <div class="phase-change-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="animState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：物质 / 操作方式 / 功率 -->
      <template #control>
        <div class="pc-control">
          <div class="ctrl-group">
            <div class="group-label">🧪 烧杯内物质</div>
            <div class="substance-grid">
              <button
                v-for="sub in substanceList"
                :key="sub.id"
                class="sub-btn"
                :class="{ active: substanceId === sub.id }"
                @click="selectSubstance(sub.id)"
              >
                {{ sub.name }}
              </button>
            </div>
            <p class="sub-info">{{ substanceInfo }}</p>
          </div>

          <div class="ctrl-group">
            <div class="group-label">操作方式</div>
            <div class="mode-grid">
              <button class="mode-btn heat" :class="{ active: mode === 'heat' }" @click="setMode('heat')">🔥 酒精灯</button>
              <button class="mode-btn stop" :class="{ active: mode === 'none' }" @click="setMode('none')">⏹ 停止</button>
              <button class="mode-btn cool" :class="{ active: mode === 'cool' }" @click="setMode('cool')">❄️ 冷冻室</button>
            </div>
            <p class="mode-tip">{{ modeTip }}</p>
          </div>

          <div class="ctrl-group">
            <div class="group-label">⚡ 功率（加热 / 制冷速度）</div>
            <input type="range" min="1" max="5" step="1" v-model.number="power" class="power-slider" />
            <div class="power-labels">
              <span>小火</span>
              <span class="power-now">{{ powerText }}</span>
              <span>大火</span>
            </div>
          </div>

          <p class="control-tip">💡 提示：水沸腾后持续加热温度不变；晶体熔化/凝固时温度不变；石蜡、煤油无固定熔点。切换物质会自动重置实验。</p>
        </div>
      </template>

      <!-- 中间：烧杯场景画布 -->
      <template #canvas>
        <ExperimentCanvas
          ref="canvasRef"
          :draw="drawScene"
          :state="sim"
          :scale="1"
          @resize="handleCanvasResize"
        />
      </template>

      <!-- 右侧：实时数据 + t-T 曲线 -->
      <template #data>
        <div class="pc-data">
          <div class="data-group">
            <div class="group-title">🌡 当前状态</div>
            <div class="temp-big">{{ tempDisplay }}<span class="unit">℃</span></div>
            <div class="phase-badge" :style="{ color: phaseInfo.color, borderColor: phaseInfo.color }">
              {{ phaseInfo.name }}
            </div>
            <div class="mode-line">{{ modeText }} · 功率 {{ powerText }}</div>
            <div class="mode-line">实验时间：{{ simTime.toFixed(1) }} s</div>
          </div>

          <div class="data-group">
            <div class="group-title">📈 温度-时间曲线（t-T）</div>
            <canvas ref="curveRef" class="curve-canvas"></canvas>
          </div>

          <div class="data-group">
            <div class="group-title">📋 物态变化记录</div>
            <div class="event-list">
              <div v-for="(ev, i) in events" :key="i" class="event-item">{{ ev }}</div>
              <div v-if="!events.length" class="event-empty">暂无记录（开始实验后自动记录关键节点）</div>
            </div>
          </div>
        </div>
      </template>

      <!-- 底部：实验原理 -->
      <template #theory>
        <div class="theory-content">
          <p><strong>实验原理：</strong>{{ config.theory.principle }}</p>
          <div class="formula-block">
            <h4>核心公式与概念</h4>
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
import { phaseChangeConfig } from '@/config/experiments/heat/phaseChange.js'

const config = phaseChangeConfig

// ==========================================
// 物质参数
// ==========================================

const T_MIN = -100
const T_MAX = 800
const RATE_PER_POWER = 1.7 // ℃/s · 每档功率

const SUBSTANCES = {
  water: {
    id: 'water', name: '水', type: 'crystal', melt: 0, boil: 100,
    liquid: '#3f8ef0', liquidLight: '#9cc8f8', solid: '#cfe8ff', solidDeep: '#a8d0f4',
    particleSolid: '#b7d8f5', particleLiquid: '#4a94e8', particleGas: 'rgba(160,200,240,0.9)',
    bubble: 'rgba(120,180,240,0.9)'
  },
  haibo: {
    id: 'haibo', name: '海波', type: 'crystal', melt: 48, boil: null,
    liquid: '#e8dfc2', liquidLight: '#f2ecd8', solid: '#f0ece2', solidDeep: '#ddd6c4',
    particleSolid: '#e6e0d0', particleLiquid: '#d9cfae', particleGas: 'rgba(220,214,190,0.9)',
    bubble: 'rgba(200,190,160,0.9)'
  },
  alcohol: {
    id: 'alcohol', name: '酒精', type: 'crystal', melt: -114, boil: 78,
    liquid: '#a9d4ea', liquidLight: '#d3eaf7', solid: '#e4f2fb', solidDeep: '#c8e4f2',
    particleSolid: '#d6eaf6', particleLiquid: '#8cc4e0', particleGas: 'rgba(170,215,235,0.9)',
    bubble: 'rgba(140,200,230,0.9)'
  },
  paraffin: {
    id: 'paraffin', name: '石蜡', type: 'amorphous', soften: [40, 60], vapor: [300, 600],
    liquid: '#f2df9a', liquidLight: '#f8eec4', solid: '#fbf3d9', solidDeep: '#efe2b8',
    particleSolid: '#f3ead0', particleLiquid: '#e8d488', particleGas: 'rgba(235,220,170,0.9)',
    bubble: 'rgba(230,210,150,0.9)'
  },
  kerosene: {
    id: 'kerosene', name: '煤油', type: 'amorphous', soften: [-45, -25], vapor: [150, 300],
    liquid: '#e3c964', liquidLight: '#f0e2a0', solid: '#e8ddaa', solidDeep: '#d6c684',
    particleSolid: '#e2d7a8', particleLiquid: '#d4b94e', particleGas: 'rgba(230,215,150,0.9)',
    bubble: 'rgba(220,200,120,0.9)'
  }
}

const substanceList = [
  { id: 'water', name: '水' },
  { id: 'haibo', name: '海波' },
  { id: 'alcohol', name: '酒精' },
  { id: 'paraffin', name: '石蜡' },
  { id: 'kerosene', name: '煤油' }
]

const substanceId = ref('water')
const substance = computed(() => SUBSTANCES[substanceId.value])

// ==========================================
// 实验状态
// ==========================================

const mode = ref('none') // none / heat / cool
const power = ref(3) // 1~5
const animState = ref('idle') // idle / running / paused
const temp = ref(25)
const simTime = ref(0)
// 相变平台：{ type: 'melt'|'freeze'|'condense'|'boil-pin', progress: 0~1 }
const transition = reactive({ type: null, progress: 0 })

const rate = computed(() => RATE_PER_POWER * power.value)
const plateauDur = computed(() => 14 / power.value) // 熔化/凝固/液化平台时长（秒）

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// 当前物相
const phase = computed(() => {
  const s = substance.value
  if (s.type === 'crystal') {
    if (transition.type === 'melt') return 'melting'
    if (transition.type === 'freeze') return 'freezing'
    if (transition.type === 'condense') return 'condensing'
    if (transition.type === 'boil-pin') return 'boiling'
    const T = temp.value
    if (T < s.melt) return 'solid'
    if (s.boil !== null && T >= s.boil) return 'boiling'
    return 'liquid'
  }
  const m = clamp((temp.value - s.soften[0]) / (s.soften[1] - s.soften[0]), 0, 1)
  const v = s.vapor ? clamp((temp.value - s.vapor[0]) / (s.vapor[1] - s.vapor[0]), 0, 1) : 0
  if (m <= 0) return 'solid'
  if (m >= 1 && v <= 0) return 'liquid'
  if (m < 1) return 'softening'
  return 'vaporizing'
})

// 固/液/气比例
const fractions = computed(() => {
  const s = substance.value
  if (s.type === 'crystal') {
    if (transition.type === 'melt') return { fs: 1 - transition.progress, fl: transition.progress, fg: 0 }
    if (transition.type === 'freeze') return { fs: transition.progress, fl: 1 - transition.progress, fg: 0 }
    if (transition.type === 'condense') return { fs: 0, fl: transition.progress, fg: 1 - transition.progress }
    if (transition.type === 'boil-pin') return { fs: 0, fl: 0.55, fg: 0.45 }
    const T = temp.value
    if (T < s.melt) return { fs: 1, fl: 0, fg: 0 }
    if (s.boil !== null && T >= s.boil) return { fs: 0, fl: 0.55, fg: 0.45 }
    return { fs: 0, fl: 1, fg: 0 }
  }
  const m = clamp((temp.value - s.soften[0]) / (s.soften[1] - s.soften[0]), 0, 1)
  const v = s.vapor ? clamp((temp.value - s.vapor[0]) / (s.vapor[1] - s.vapor[0]), 0, 1) : 0
  return { fs: 1 - m, fl: m * (1 - v), fg: v }
})

// 物相展示
const PHASE_LABEL = {
  solid: { name: '固态', color: '#b37feb' },
  liquid: { name: '液态', color: '#40a9ff' },
  melting: { name: '固液共存 · 熔化中', color: '#ffa940' },
  freezing: { name: '固液共存 · 凝固中', color: '#40a9ff' },
  boiling: { name: '液气共存 · 沸腾中', color: '#ff4d4f' },
  condensing: { name: '液气共存 · 液化中', color: '#36cfc9' },
  softening: { name: '软化中 · 无固定熔点', color: '#ffa940' },
  vaporizing: { name: '汽化中 · 无固定沸点', color: '#ff4d4f' }
}
const phaseInfo = computed(() => PHASE_LABEL[phase.value] || PHASE_LABEL.liquid)

const substanceInfo = computed(() => {
  const s = substance.value
  if (s.type === 'crystal') {
    const meltTxt = s.melt <= T_MIN ? `熔点 ${s.melt}℃（低于 -100℃ 下限，不会凝固）` : `熔点 ${s.melt}℃`
    const boilTxt = s.boil === null ? '不设沸点（教材不涉及，可升温至 800℃）' : `沸点 ${s.boil}℃`
    return `晶体 · ${meltTxt} · ${boilTxt}`
  }
  return `非晶体（混合物）· 软化区间 ${s.soften[0]}~${s.soften[1]}℃ · 汽化区间 ${s.vapor[0]}~${s.vapor[1]}℃`
})

const modeText = computed(() => {
  if (mode.value === 'heat') return '🔥 酒精灯加热中'
  if (mode.value === 'cool') return '❄️ 冷冻室制冷中'
  return '⏹ 未加热 / 制冷'
})

const modeTip = computed(() => {
  if (mode.value === 'heat') return '酒精灯加热中：温度持续升高，达到熔沸点后出现平台'
  if (mode.value === 'cool') return '冷冻室制冷中：温度持续降低，凝固时温度不变（晶体）'
  return '请选择加热或制冷方式，再点击「开始」'
})

const powerText = computed(() => ['小火', '中小火', '中火', '中大火', '大火'][power.value - 1])
const tempDisplay = computed(() => (Math.abs(temp.value) < 0.05 ? '0.0' : temp.value.toFixed(1)))

// ==========================================
// 温度推进（含相变平台状态机）
// ==========================================

function stepTemp(dt) {
  const s = substance.value
  const dir = mode.value === 'heat' ? 1 : mode.value === 'cool' ? -1 : 0
  if (!dir) return
  const r = rate.value * dir

  // 非晶体：连续升温/降温，无平台
  if (s.type !== 'crystal') {
    temp.value = clamp(temp.value + r * dt, T_MIN, T_MAX)
    return
  }

  const melt = s.melt
  const boil = s.boil

  // 相变平台处理
  if (transition.type) {
    const tr = transition.type
    // 反向操作切换：熔化↔凝固、沸腾↔液化
    if (tr === 'melt' && dir < 0) { transition.type = 'freeze'; transition.progress = 1 - transition.progress; temp.value = melt; return }
    if (tr === 'freeze' && dir > 0) { transition.type = 'melt'; transition.progress = 1 - transition.progress; temp.value = melt; return }
    if (tr === 'condense' && dir > 0) { transition.type = 'boil-pin'; temp.value = boil; return }
    if (tr === 'boil-pin' && dir < 0) { transition.type = 'condense'; transition.progress = 0; temp.value = boil; return }
    if (tr === 'boil-pin') { temp.value = boil; return } // 沸腾平台：持续加热温度不变

    transition.progress += dt / plateauDur.value
    if (transition.progress >= 1) {
      temp.value = tr === 'melt' ? melt + 0.02 : tr === 'freeze' ? melt - 0.02 : boil - 0.02
      transition.type = null
    } else {
      temp.value = tr === 'condense' ? boil : melt
    }
    return
  }

  // 正常移动，检测是否进入平台
  const prev = temp.value
  let next = prev + r * dt
  next = clamp(next, T_MIN, T_MAX)

  if (dir > 0) {
    if (boil !== null && prev < boil && next >= boil) {
      transition.type = 'boil-pin'
      temp.value = boil
      return
    }
    if (melt > T_MIN && prev < melt && next >= melt) {
      transition.type = 'melt'
      transition.progress = 0
      temp.value = melt
      return
    }
  } else {
    if (boil !== null && prev > boil && next <= boil) {
      transition.type = 'condense'
      transition.progress = 0
      temp.value = boil
      return
    }
    if (melt > T_MIN && prev > melt && next <= melt) {
      transition.type = 'freeze'
      transition.progress = 0
      temp.value = melt
      return
    }
  }
  temp.value = next
}

// ==========================================
// 粒子系统（固 / 液 / 气 三态）
// ==========================================

const N = 72
const COLS = 9
const ROWS = 8
const particles = reactive([])
const bubbles = reactive([])
const pops = reactive([])
const steam = reactive([])

let geo = null
let simClock = 0

// 画布几何（与 drawScene 中的计算保持一致）
function getGeo(w, h) {
  const bw = Math.min(w * 0.52, 340)
  const bh = Math.min(h * 0.62, 400)
  const cx = w / 2
  const by1 = h * 0.8
  const by0 = by1 - bh
  const bx0 = cx - bw / 2
  const bx1 = cx + bw / 2
  const surfaceY = by1 - bh * 0.52
  const wall = 5
  return {
    w, h, cx, bw, bh, bx0, bx1, by0, by1, surfaceY, wall,
    liqLeft: bx0 + wall, liqRight: bx1 - wall, liqBottom: by1 - wall
  }
}

// 初始化粒子锚点（固态晶格位置；非晶体带随机错位）
function initAnchors() {
  const g = getGeo(canvasW.value, canvasH.value)
  if (canvasW.value < 60 || canvasH.value < 60) return
  geo = g
  const padX = 16
  const padY = 14
  const cellW = (g.liqRight - g.liqLeft - padX * 2) / COLS
  const cellH = (g.liqBottom - g.surfaceY - padY * 2) / ROWS
  const jitter = substance.value.type === 'crystal' ? 0 : 3.6
  particles.length = 0
  for (let i = 0; i < N; i++) {
    const row = Math.floor(i / COLS)
    const col = i % COLS
    const ax = g.liqLeft + padX + col * cellW + cellW / 2 + (Math.random() - 0.5) * jitter
    const ay = g.liqBottom - padY - row * cellH - cellH / 2 + (Math.random() - 0.5) * jitter
    particles.push(reactive({
      ax, ay, x: ax, y: ay, vx: 0, vy: 0,
      ph: Math.random() * Math.PI * 2,
      size: Math.min(cellW, cellH) * 0.4
    }))
  }
}

// 粒子三态更新
function updateParticles(dt) {
  const g = geo
  if (!g || particles.length !== N) return
  const f = fractions.value
  const s = substance.value
  const nSolid = Math.round(f.fs * N)
  const nLiquid = Math.round(f.fl * N)
  const boiling = phase.value === 'boiling' || phase.value === 'vaporizing'
  const nearMelt = s.type === 'crystal' && Math.abs(temp.value - s.melt) < 5
  const vibAmp = nearMelt ? 2.8 : 1.3

  for (let i = 0; i < N; i++) {
    const p = particles[i]
    // 固态：晶格点附近振动
    if (i < nSolid) {
      p.x = p.ax + Math.sin(simClock * 2.1 + p.ph) * vibAmp
      p.y = p.ay + Math.cos(simClock * 1.9 + p.ph * 1.6) * vibAmp * 0.85
      p.vx = 0
      p.vy = 0
      continue
    }
    // 液态：自由运动 + 无规则扰动（沸腾时剧烈）
    if (i < nSolid + nLiquid) {
      const ag = boiling ? 110 : 26
      p.vx += (Math.random() - 0.5) * ag * dt
      p.vy += (Math.random() - 0.5) * ag * dt
      p.vy += 150 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.988
      p.vy *= 0.988
      const sp = Math.hypot(p.vx, p.vy)
      const cap = boiling ? 140 : 75
      if (sp > cap) { p.vx *= cap / sp; p.vy *= cap / sp }
      if (p.x < g.liqLeft + p.size) { p.x = g.liqLeft + p.size; p.vx = Math.abs(p.vx) * 0.55 }
      if (p.x > g.liqRight - p.size) { p.x = g.liqRight - p.size; p.vx = -Math.abs(p.vx) * 0.55 }
      if (p.y > g.liqBottom - p.size) { p.y = g.liqBottom - p.size; p.vy = -Math.abs(p.vy) * 0.5 }
      if (p.y < g.surfaceY + p.size) { p.y = g.surfaceY + p.size; p.vy = Math.abs(p.vy) * 0.35 }
      continue
    }
    // 气态：快速无规则运动（全气态时充满整个烧杯，否则在液面上方）
    const fullGas = f.fs === 0 && f.fl === 0
    const gasTop = g.by0 + p.size
    const gasBot = fullGas ? g.liqBottom - p.size : g.surfaceY - p.size
    p.vx += (Math.random() - 0.5) * 70 * dt
    p.vy += (Math.random() - 0.5) * 70 * dt - 22 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= 0.995
    p.vy *= 0.995
    const sp = Math.hypot(p.vx, p.vy)
    if (sp > 160) { p.vx *= 160 / sp; p.vy *= 160 / sp }
    if (p.x < g.liqLeft + p.size) { p.x = g.liqLeft + p.size; p.vx = Math.abs(p.vx) * 0.6 }
    if (p.x > g.liqRight - p.size) { p.x = g.liqRight - p.size; p.vx = -Math.abs(p.vx) * 0.6 }
    if (p.y < gasTop) { p.y = gasTop; p.vy = Math.abs(p.vy) * 0.6 }
    if (p.y > gasBot) { p.y = gasBot; p.vy = -Math.abs(p.vy) * 0.6 }
  }
}

// ==========================================
// 气泡（沸腾前由大变小消失 / 沸腾时由小变大破裂）
// ==========================================

let bubbleTimer = 0
function updateBubbles(dt) {
  const g = geo
  if (!g) return
  const s = substance.value
  const boiling = phase.value === 'boiling' || phase.value === 'vaporizing'
  const nearBoil =
    phase.value === 'liquid' && mode.value === 'heat' &&
    ((s.type === 'crystal' && s.boil !== null && temp.value > s.boil - 10) ||
      (s.type === 'amorphous' && s.vapor && temp.value > s.vapor[0] - 10))

  if (boiling || nearBoil) {
    bubbleTimer -= dt
    if (bubbleTimer <= 0) {
      bubbleTimer = boiling ? 0.22 : 0.55
      const x = g.liqLeft + 20 + Math.random() * (g.liqRight - g.liqLeft - 40)
      bubbles.push({
        x,
        y: g.liqBottom - 3,
        r: boiling ? 1.8 + Math.random() * 2.6 : 5 + Math.random() * 4,
        kind: boiling ? 'boil' : 'pre',
        vy: boiling ? 60 + Math.random() * 25 : 38 + Math.random() * 14,
        wob: Math.random() * Math.PI * 2
      })
    }
  }

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]
    b.y -= b.vy * dt
    b.x += Math.sin(b.wob + b.y * 0.05) * 6 * dt
    if (b.kind === 'pre') {
      b.r = Math.max(0.4, b.r - 12 * dt) // 沸腾前：上升过程中由大变小
    } else {
      b.r = Math.min(b.r + 9 * dt, 11) // 沸腾时：上升过程中由小变大
    }
    if (b.y < g.surfaceY + 2) {
      if (b.kind === 'boil') pops.push({ x: b.x, y: g.surfaceY, r: 1, life: 1 })
      bubbles.splice(i, 1)
    }
  }

  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]
    p.r += 22 * dt
    p.life -= dt * 2.2
    if (p.life <= 0) pops.splice(i, 1)
  }
}

// ==========================================
// 蒸汽（沸腾 / 汽化时上升消散）
// ==========================================

let steamTimer = 0
function updateSteam(dt) {
  const g = geo
  if (!g) return
  const ph = phase.value
  if (ph === 'boiling' || ph === 'vaporizing') {
    steamTimer -= dt
    if (steamTimer <= 0) {
      steamTimer = 0.09
      const srcY = ph === 'vaporizing' ? g.by0 + 6 : g.surfaceY
      steam.push({
        x: g.liqLeft + 12 + Math.random() * (g.liqRight - g.liqLeft - 24),
        y: srcY,
        vx: (Math.random() - 0.5) * 14,
        vy: -(26 + Math.random() * 22),
        r: 2.5 + Math.random() * 2.5,
        life: 1.6
      })
    }
  }
  for (let i = steam.length - 1; i >= 0; i--) {
    const st = steam[i]
    st.x += st.vx * dt
    st.y += st.vy * dt
    st.r += 9 * dt
    st.life -= dt * 0.7
    if (st.life <= 0) steam.splice(i, 1)
  }
}

// ==========================================
// t-T 曲线
// ==========================================

const curve = reactive([])
let lastCurveT = -1

function pushCurve() {
  if (simTime.value - lastCurveT >= 0.2) {
    lastCurveT = simTime.value
    curve.push({ t: simTime.value, T: temp.value })
    if (curve.length > 4000) curve.splice(0, 500)
  }
}

function niceStep(raw) {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag
}

const curveRef = ref(null)
function drawCurve() {
  const cv = curveRef.value
  if (!cv) return
  const dpr = window.devicePixelRatio || 1
  const cw = cv.clientWidth
  const ch = cv.clientHeight
  if (cw < 40 || ch < 40) return
  if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) {
    cv.width = Math.round(cw * dpr)
    cv.height = Math.round(ch * dpr)
  }
  const ctx = cv.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cw, ch)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, cw, ch)

  const ml = 38, mr = 10, mt = 10, mb = 20
  const pw = cw - ml - mr
  const phh = ch - mt - mb
  const s = substance.value

  let tMax = 10
  let yMin = Infinity
  let yMax = -Infinity
  for (const pt of curve) {
    tMax = Math.max(tMax, pt.t)
    yMin = Math.min(yMin, pt.T)
    yMax = Math.max(yMax, pt.T)
  }
  if (!curve.length) { yMin = 20; yMax = 30 }
  if (s.type === 'crystal') {
    yMin = Math.min(yMin, s.melt)
    yMax = Math.max(yMax, s.boil !== null ? s.boil : s.melt)
  } else {
    yMin = Math.min(yMin, s.soften[0])
    yMax = Math.max(yMax, s.vapor ? s.vapor[1] : s.soften[1])
  }
  yMin = Math.max(-110, Math.floor((yMin - 8) / 10) * 10)
  yMax = Math.min(810, Math.ceil((yMax + 8) / 10) * 10)
  if (yMax - yMin < 20) yMax = yMin + 20

  const X = (t) => ml + (t / tMax) * pw
  const Y = (T) => mt + phh - ((T - yMin) / (yMax - yMin)) * phh

  // 网格
  ctx.strokeStyle = 'rgba(0,0,0,0.07)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const yy = mt + (phh / 4) * i
    ctx.beginPath(); ctx.moveTo(ml, yy); ctx.lineTo(cw - mr, yy); ctx.stroke()
    const xx = ml + (pw / 4) * i
    ctx.beginPath(); ctx.moveTo(xx, mt); ctx.lineTo(xx, mt + phh); ctx.stroke()
  }

  // Y 轴刻度
  ctx.font = '9px sans-serif'
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  const yStep = niceStep((yMax - yMin) / 4)
  for (let T = Math.ceil(yMin / yStep) * yStep; T <= yMax; T += yStep) {
    ctx.fillText(String(T), ml - 4, Y(T))
  }
  // X 轴刻度
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let i = 0; i <= 4; i++) {
    const t = (tMax / 4) * i
    ctx.fillText(t.toFixed(0) + 's', X(t), mt + phh + 4)
  }
  // 轴标题
  ctx.textAlign = 'left'
  ctx.fillText('温度/℃', 4, mt + 4)
  ctx.textAlign = 'right'
  ctx.fillText('时间', cw - mr, mt + phh + 10)

  // 熔点 / 沸点参考虚线
  if (s.type === 'crystal') {
    if (s.melt > yMin && s.melt < yMax) {
      ctx.setLineDash([4, 3])
      ctx.strokeStyle = 'rgba(24,144,255,0.45)'
      ctx.beginPath(); ctx.moveTo(ml, Y(s.melt)); ctx.lineTo(cw - mr, Y(s.melt)); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(24,144,255,0.85)'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`熔点 ${s.melt}℃`, cw - mr - 4, Y(s.melt) - 8)
    }
    if (s.boil !== null && s.boil > yMin && s.boil < yMax) {
      ctx.setLineDash([4, 3])
      ctx.strokeStyle = 'rgba(255,77,79,0.45)'
      ctx.beginPath(); ctx.moveTo(ml, Y(s.boil)); ctx.lineTo(cw - mr, Y(s.boil)); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255,77,79,0.85)'
      ctx.textAlign = 'right'
      ctx.fillText(`沸点 ${s.boil}℃`, cw - mr - 4, Y(s.boil) + 10)
    }
  }

  // 曲线
  if (curve.length > 1) {
    ctx.strokeStyle = '#2c3e50'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    curve.forEach((pt, i) => {
      const xx = X(pt.t)
      const yy = Y(pt.T)
      if (i === 0) ctx.moveTo(xx, yy)
      else ctx.lineTo(xx, yy)
    })
    ctx.stroke()
    const last = curve[curve.length - 1]
    ctx.fillStyle = '#e0453c'
    ctx.beginPath()
    ctx.arc(X(last.t), Y(last.T), 3, 0, Math.PI * 2)
    ctx.fill()
  } else if (!curve.length) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('点击「开始」并选择加热/制冷后自动绘制 t-T 曲线', ml + pw / 2, mt + phh / 2)
  }
}

// ==========================================
// 物态变化事件记录
// ==========================================

const events = reactive([])
let lastPhase = ''
function recordEvents() {
  const ph = phase.value
  if (ph === lastPhase) return
  const s = substance.value
  const names = {
    solid: '变为固态', liquid: '变为液态', melting: '开始熔化（固液共存）',
    freezing: '开始凝固（固液共存）', boiling: '开始沸腾（液气共存）',
    condensing: '开始液化（液气共存）', softening: '开始软化（无固定熔点）',
    vaporizing: '开始汽化（无固定沸点）'
  }
  if (lastPhase !== '') {
    events.unshift(`[${simTime.value.toFixed(1)}s] ${s.name}：${names[ph] || ph}（${temp.value.toFixed(1)}℃）`)
    if (events.length > 30) events.pop()
  }
  lastPhase = ph
}

// ==========================================
// 控制操作
// ==========================================

const setMode = (m) => { mode.value = m }

function resetSim() {
  temp.value = 25
  transition.type = null
  transition.progress = 0
  simTime.value = 0
  lastCurveT = -1
  curve.length = 0
  bubbles.length = 0
  pops.length = 0
  steam.length = 0
  events.length = 0
  lastPhase = ''
  mode.value = 'none'
  initAnchors()
}

function selectSubstance(id) {
  if (id === substanceId.value) return
  substanceId.value = id
  resetSim()
  animState.value = 'idle'
}

const handleStart = () => { animState.value = 'running' }
const handlePause = () => {
  if (animState.value === 'running') animState.value = 'paused'
}
const handleReset = () => {
  resetSim()
  animState.value = 'idle'
}

// ==========================================
// 主循环与画布
// ==========================================

const canvasW = ref(0)
const canvasH = ref(0)

const handleCanvasResize = ({ width, height }) => {
  canvasW.value = width
  canvasH.value = height
  initAnchors()
}

// 供 ExperimentCanvas 深监听重绘
const sim = reactive({
  particles, bubbles, pops, steam,
  temp: 25, mode: 'none', phase: 'liquid', clock: 0, substanceId: 'water'
})

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const drawScene = (ctx, state, utils) => {
  const w = utils.canvasWidth
  const h = utils.canvasHeight
  if (w < 60 || h < 60) return
  const g = getGeo(w, h)
  geo = g
  const s = substance.value
  const f = fractions.value
  const ph = phase.value

  // ===== 环境氛围 =====
  if (mode.value === 'heat') {
    const grad = ctx.createRadialGradient(g.cx, h, 20, g.cx, h, h * 0.75)
    grad.addColorStop(0, 'rgba(255,140,40,0.15)')
    grad.addColorStop(1, 'rgba(255,140,40,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  } else if (mode.value === 'cool') {
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, 'rgba(90,150,255,0.10)')
    grad.addColorStop(1, 'rgba(90,150,255,0.04)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  // ===== 冷冻室外框（画在烧杯后面） =====
  if (mode.value === 'cool') {
    const fx0 = g.bx0 - 38
    const fx1 = g.bx1 + 38
    const fy0 = 16
    const fy1 = h - 12
    ctx.fillStyle = 'rgba(120,180,255,0.07)'
    roundRectPath(ctx, fx0, fy0, fx1 - fx0, fy1 - fy0, 14)
    ctx.fill()
    ctx.setLineDash([7, 5])
    ctx.strokeStyle = 'rgba(90,160,255,0.5)'
    ctx.lineWidth = 2
    roundRectPath(ctx, fx0, fy0, fx1 - fx0, fy1 - fy0, 14)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    for (let i = 0; i < 16; i++) {
      const fx = fx0 + 6 + ((i * 53) % (fx1 - fx0 - 12))
      const fy = fy0 + 6 + ((i * 37) % (fy1 - fy0 - 12))
      ctx.beginPath()
      ctx.arc(fx, fy, 1.3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(90,160,255,0.9)'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('❄ 冷冻室', fx0 + 8, fy0 + 5)
  }

  // ===== 酒精灯（画在烧杯后面） =====
  if (mode.value === 'heat') {
    const lampY = g.by1 + 6
    const lx = g.cx
    ctx.fillStyle = 'rgba(200,160,60,0.32)'
    ctx.beginPath()
    ctx.ellipse(lx, lampY + 26, 34, 15, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(150,110,40,0.55)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,220,120,0.5)'
    ctx.beginPath()
    ctx.ellipse(lx, lampY + 27, 27, 8, 0, 0, Math.PI)
    ctx.fill()
    ctx.fillStyle = '#8a6d3b'
    ctx.fillRect(lx - 4, lampY + 6, 8, 9)
    const fl = 0.85 + Math.sin(simClock * 13) * 0.1 + Math.sin(simClock * 7.3) * 0.08
    ctx.save()
    ctx.translate(lx, lampY + 6)
    ctx.fillStyle = 'rgba(255,120,30,0.75)'
    ctx.beginPath()
    ctx.ellipse(0, -10 * fl, 9, 15 * fl, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,190,60,0.9)'
    ctx.beginPath()
    ctx.ellipse(0, -8 * fl, 5, 9 * fl, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,250,220,0.95)'
    ctx.beginPath()
    ctx.ellipse(0, -6 * fl, 2.2, 4.5 * fl, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // ===== 烧杯内部（裁剪） =====
  ctx.save()
  roundRectPath(ctx, g.bx0 + g.wall, g.by0, g.bw - g.wall * 2, g.bh, 5)
  ctx.clip()

  const waveY = g.surfaceY + Math.sin(simClock * 2.4) * 1.2

  // 液态填充
  if (f.fl > 0.02) {
    const grad = ctx.createLinearGradient(0, waveY, 0, g.liqBottom)
    grad.addColorStop(0, s.liquidLight)
    grad.addColorStop(1, s.liquid)
    ctx.globalAlpha = 0.3 + 0.35 * Math.min(1, f.fl * 1.6)
    ctx.fillStyle = grad
    ctx.fillRect(g.liqLeft, waveY, g.liqRight - g.liqLeft, g.liqBottom - waveY)
    ctx.globalAlpha = 1
  }
  // 固态填充（底部）
  if (f.fs > 0.02) {
    const solidTop = g.liqBottom - (g.liqBottom - waveY) * f.fs
    const grad = ctx.createLinearGradient(0, solidTop, 0, g.liqBottom)
    grad.addColorStop(0, s.solid)
    grad.addColorStop(1, s.solidDeep)
    ctx.fillStyle = grad
    ctx.fillRect(g.liqLeft, solidTop, g.liqRight - g.liqLeft, g.liqBottom - solidTop)
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 1
    for (let yy = solidTop + 9; yy < g.liqBottom; yy += 9) {
      ctx.beginPath()
      ctx.moveTo(g.liqLeft + 4, yy)
      ctx.lineTo(g.liqRight - 4, yy)
      ctx.stroke()
    }
  }
  // 液面线
  if (f.fl > 0.02 && f.fg < 0.6) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(g.liqLeft, waveY)
    ctx.lineTo(g.liqRight, waveY)
    ctx.stroke()
  }

  // 气泡
  for (const b of bubbles) {
    ctx.globalAlpha = 0.75
    ctx.strokeStyle = s.bubble
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  // 气泡破裂涟漪
  for (const p of pops) {
    ctx.globalAlpha = Math.max(0, p.life) * 0.7
    ctx.strokeStyle = s.bubble
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // 三态粒子
  const nSolid = Math.round(f.fs * N)
  const nLiquid = Math.round(f.fl * N)
  for (let i = 0; i < N; i++) {
    const p = particles[i]
    let col = s.particleLiquid
    let alpha = 0.95
    if (i < nSolid) col = s.particleSolid
    else if (i >= nSolid + nLiquid) { col = s.particleGas; alpha = 0.55 }
    ctx.globalAlpha = alpha
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()

  // ===== 烧杯玻璃轮廓 =====
  ctx.strokeStyle = 'rgba(70,110,150,0.75)'
  ctx.lineWidth = 3
  roundRectPath(ctx, g.bx0, g.by0, g.bw, g.bh, 7)
  ctx.stroke()
  // 玻璃高光
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(g.bx0 + 7, g.by0 + 10)
  ctx.lineTo(g.bx0 + 7, g.by1 - 12)
  ctx.stroke()
  // 刻度线
  ctx.strokeStyle = 'rgba(70,110,150,0.4)'
  ctx.lineWidth = 1
  for (const mk of [0.25, 0.5, 0.75, 1]) {
    const yy = g.by0 + g.bh * mk
    ctx.beginPath()
    ctx.moveTo(g.bx1 - 11, yy)
    ctx.lineTo(g.bx1 - 2, yy)
    ctx.stroke()
  }
  // 烧杯底部平台（加热时被酒精灯替代）
  if (mode.value !== 'heat') {
    ctx.fillStyle = 'rgba(120,120,130,0.3)'
    ctx.fillRect(g.cx - g.bw * 0.72, g.by1 + 2, g.bw * 1.44, 5)
  }

  // ===== 蒸汽（烧杯外） =====
  for (const st of steam) {
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, st.life * 0.35)})`
    ctx.beginPath()
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2)
    ctx.fill()
  }

  // ===== 悬挂温度计 =====
  drawThermometer(ctx, g)

  // ===== 画布信息（右上角） =====
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.font = 'bold 21px sans-serif'
  ctx.fillStyle = phaseInfo.value.color
  ctx.fillText(`${tempDisplay.value}℃`, w - 14, 12)
  ctx.font = '12px sans-serif'
  ctx.fillStyle = 'rgba(30,40,60,0.75)'
  ctx.fillText(`${s.name} · ${phaseInfo.value.name}`, w - 14, 40)
}

// 温度计：悬挂于烧杯上方，玻璃泡浸没在液体中，刻度自适应
function drawThermometer(ctx, g) {
  const T = temp.value
  const tubeX = g.cx
  const topY = 24
  const bulbY = g.surfaceY + 14
  const win = 70
  let lo = Math.max(-110, Math.floor((T - win) / 10) * 10)
  let hi = Math.min(810, lo + win * 2)
  lo = Math.max(-110, hi - win * 2)

  // 悬挂线
  ctx.strokeStyle = 'rgba(60,80,110,0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(tubeX, 8)
  ctx.lineTo(tubeX, topY)
  ctx.stroke()

  // 管身
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  roundRectPath(ctx, tubeX - 7, topY, 14, bulbY - topY + 10, 7)
  ctx.fill()
  ctx.strokeStyle = 'rgba(60,80,110,0.8)'
  ctx.lineWidth = 1.6
  ctx.stroke()

  // 刻度（自适应窗口）
  const scaleTop = topY + 14
  const scaleBot = bulbY - 12
  const yOf = (t) => scaleBot - ((t - lo) / (hi - lo)) * (scaleBot - scaleTop)
  ctx.font = '9px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let t = lo; t <= hi; t += 10) {
    const yy = yOf(t)
    const major = t % 50 === 0
    ctx.strokeStyle = 'rgba(60,80,110,0.55)'
    ctx.lineWidth = major ? 1.4 : 1
    ctx.beginPath()
    ctx.moveTo(tubeX - 7, yy)
    ctx.lineTo(tubeX - 7 - (major ? 8 : 4), yy)
    ctx.stroke()
    if (major) {
      ctx.fillStyle = 'rgba(60,80,110,0.85)'
      ctx.fillText(String(t), tubeX - 20, yy)
    }
  }

  // 汞柱
  const my = yOf(T)
  ctx.fillStyle = '#e0453c'
  roundRectPath(ctx, tubeX - 3, my, 6, bulbY - my + 8, 3)
  ctx.fill()

  // 玻璃泡
  ctx.fillStyle = '#e0453c'
  ctx.beginPath()
  ctx.arc(tubeX, bulbY + 8, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(60,80,110,0.7)'
  ctx.lineWidth = 1.2
  ctx.stroke()
}

// ==========================================
// 主循环
// ==========================================

let rafId = null
let lastTs = 0

function loop(ts) {
  rafId = requestAnimationFrame(loop)
  const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016
  lastTs = ts

  if (animState.value === 'running') {
    simClock += dt
    simTime.value += dt
    stepTemp(dt)
    recordEvents()
    pushCurve()
  } else if (animState.value === 'idle') {
    simClock += dt
  }

  if (animState.value !== 'paused') {
    updateParticles(dt)
    updateBubbles(dt)
    updateSteam(dt)
  }

  // 同步到画布 state（触发重绘）
  sim.temp = temp.value
  sim.mode = mode.value
  sim.phase = phase.value
  sim.clock = simClock
  sim.substanceId = substanceId.value

  drawCurve()
}

onMounted(() => {
  rafId = requestAnimationFrame(loop)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
})
</script>

<style lang="scss" scoped>
.phase-change-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 控制面板 ========== */
.pc-control {
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

.substance-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sub-btn {
  padding: 5px 12px;
  font-size: 13px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: $color-accent;
    color: $color-accent;
  }

  &.active {
    background: rgba(245, 166, 35, 0.18);
    border-color: $color-accent;
    color: $color-accent;
    font-weight: 600;
  }
}

.sub-info {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
}

.mode-grid {
  display: flex;
  gap: 6px;
}

.mode-btn {
  flex: 1;
  padding: 7px 4px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.2s;

  &.heat.active {
    background: rgba(255, 120, 30, 0.22);
    border-color: #ff8c42;
    color: #ffb27d;
    font-weight: 600;
  }

  &.cool.active {
    background: rgba(90, 160, 255, 0.22);
    border-color: #5aa0ff;
    color: #8fc0ff;
    font-weight: 600;
  }

  &.stop.active {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
  }
}

.mode-tip {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.5);
}

.power-slider {
  width: 100%;
  accent-color: $color-accent;
}

.power-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;

  .power-now {
    color: $color-accent;
    font-weight: 600;
  }
}

.control-tip {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.45);
}

/* ========== 数据面板 ========== */
.pc-data {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.temp-big {
  font-size: 36px;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;

  .unit {
    font-size: 16px;
    font-weight: normal;
    color: rgba(255, 255, 255, 0.55);
    margin-left: 3px;
  }
}

.phase-badge {
  display: inline-block;
  margin-top: 6px;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px;
  border: 1px solid;
  background: rgba(255, 255, 255, 0.06);
}

.mode-line {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.curve-canvas {
  display: block;
  width: 100%;
  height: 170px;
  background: #fff;
  border-radius: 6px;
  margin-top: 6px;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 180px;
  overflow-y: auto;
}

.event-item {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  padding: 4px 8px;
  line-height: 1.5;
}

.event-empty {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
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
