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
const G_CONST = 10

// ========== 结构预设（6 种绕法） ==========
const PRESETS = [
  { id: 'fix1',    name: '单个定滑轮', n: 1, pull: 'down', desc: '不省力，只改变方向' },
  { id: 'mov1',    name: '单个动滑轮', n: 2, pull: 'up',   desc: '省一半力，向上拉' },
  { id: '1f1m2', name: '一定一动',   n: 2, pull: 'down', desc: '向下拉' },
  { id: '1f1m3', name: '一定一动',   n: 3, pull: 'up',   desc: '向上拉' },
  { id: '2f2m4', name: '二定二动',   n: 4, pull: 'down', desc: '向下拉' },
  { id: '2f2m5', name: '二定二动',   n: 5, pull: 'up',   desc: '向上拉' }
]

// ========== 参数 ==========
const presetId = ref('1f1m2')
const m = ref(1.0)
const mPulley = ref(0)
const etaFric = ref(100)
const vPull = ref(4)

const currentPreset = computed(() => PRESETS.find(p => p.id === presetId.value))
const n = computed(() => currentPreset.value.n)
const G = computed(() => Math.round(m.value * G_CONST))
const Gd = computed(() => mPulley.value / 100)
const F = computed(() => (G.value + Gd.value) / (n.value * (etaFric.value / 100)))
const pullText = computed(() => (currentPreset.value.pull === 'up' ? '向上' : '向下'))
const pullArrow = computed(() => (currentPreset.value.pull === 'up' ? '↑' : '↓'))

const selectPreset = (id) => {
  if (presetId.value === id) return
  presetId.value = id
  hCm.value = 0
}

// ========== 提升动画（速度驱动） ==========
const LIFT_H = 20
const animState = ref('idle')
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
  if (hCm.value >= LIFT_H - 0.01) hCm.value = 0
  animState.value = 'running'
  startLoop()
}
const handlePause = () => {
  if (animState.value !== 'running') return
  animState.value = 'paused'
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
}
const handleReset = () => {
  presetId.value = '1f1m2'
  m.value = 1.0
  mPulley.value = 0
  etaFric.value = 100
  vPull.value = 4
  hCm.value = 0
  animState.value = 'idle'
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
}

// ========== 数据计算 ==========
const s = computed(() => n.value * hCm.value)
const Wuseful = computed(() => (G.value * hCm.value) / 100)
const Wtotal = computed(() => (F.value * s.value) / 100)
const eta = computed(() => {
  const nF = n.value * F.value
  return nF > 0 ? Math.round((G.value / nF) * 100) : 100
})

// ========== 画布 ==========
const canvasWidth = ref(600)
const handleCanvasResize = ({ width }) => { canvasWidth.value = width }

const canvasState = computed(() => ({
  preset: presetId.value,
  h: hCm.value,
  G: G.value,
  F: F.value,
  n: n.value,
  pull: currentPreset.value.pull
}))

// ==================== 几何常量 ====================
const GEOM = {
  beamY: 34,
  fixY: 110,
  movY0: 250,
  loadY0: 302,
  pxPerCm: 6,
  // 单滑轮半径
  rFixSingle: 20,
  rMovSingle: 16,
  // 双定滑轮（上大下小，8字形外切）
  rFixBig: 22, rFixSmall: 16,
  fixGap: 19,   // 圆心距一半 = (22+16)/2
  // 双动滑轮（上小下大，8字形外切）
  rMovSmall: 14, rMovBig: 18,
  movGap: 16,   // 圆心距一半 = (14+18)/2
  hookLen: 12,
  ropeToLoad: 6
}

const INK = '#1a1a1a'

const PRESET_LABEL = {
  fix1:    { top: '定滑轮',   bottom: '一定' },
  mov1:    { top: '动滑轮',   bottom: '一动' },
  '1f1m2': { top: '一定一动', bottom: '一定一动' },
  '1f1m3': { top: '一定一动', bottom: '一定一动' },
  '2f2m4': { top: '二定二动', bottom: '二定二动' },
  '2f2m5': { top: '二定二动', bottom: '二定二动' }
}

// ==================== 绕绳序列 ====================
const WRAP_ORDER = {
  fix1:    ['D0'],
  mov1:    ['M0'],
  '1f1m2': ['M0', 'D0'],
  '1f1m3': ['D0', 'M0'],
  '2f2m4': ['M0', 'D1', 'M1', 'D0'],
  '2f2m5': ['D0', 'M0', 'D1', 'M1']
}
// sides[i] = 第i个滑轮进入侧；sides[末] = 自由端侧
const CONNECT_SIDES = {
  fix1:    ['left', 'right'],
  mov1:    ['left', 'right'],
  '1f1m2': ['right', 'left', 'right'],
  '1f1m3': ['left', 'right', 'left'],
  '2f2m4': ['right', 'left', 'right', 'left', 'right'],
  '2f2m5': ['left', 'right', 'left', 'right', 'left']
}

// ==================== 滑轮布局 ====================
function getPulleyLayout(id, cx, fixY, movY) {
  const G = GEOM
  if (id === 'fix1') return { D: [{ cx, cy: fixY, r: G.rFixSingle, support: true }], M: [] }
  if (id === 'mov1') return { D: [], M: [{ cx, cy: movY, r: G.rMovSingle }] }
  if (id === '1f1m2' || id === '1f1m3') {
    return {
      D: [{ cx, cy: fixY, r: G.rFixSingle, support: true }],
      M: [{ cx, cy: movY, r: G.rMovSingle }]
    }
  }
  return {
    D: [
      { cx, cy: fixY - G.fixGap, r: G.rFixBig, support: true },
      { cx, cy: fixY + G.fixGap, r: G.rFixSmall }
    ],
    M: [
      { cx, cy: movY - G.movGap, r: G.rMovSmall },
      { cx, cy: movY + G.movGap, r: G.rMovBig }
    ]
  }
}

function getBottomMovRadius(id) {
  const G = GEOM
  if (id === 'mov1' || id === '1f1m2' || id === '1f1m3') return G.rMovSingle
  if (id === '2f2m4' || id === '2f2m5') return G.rMovBig
  return 0
}

// ==================== 绳子路径（最左/最右点 + 标准半圆，无缠住） ====================
function buildRopePath(id, cx, fixY, movY, anchor, pullX, pullY) {
  const layout = getPulleyLayout(id, cx, fixY, movY)
  const order = WRAP_ORDER[id] || []
  const sides = CONNECT_SIDES[id] || []
  const path = [{ type: 'move', x: anchor.x, y: anchor.y }]

  for (let i = 0; i < order.length; i++) {
    const key = order[i]
    const type = key[0]
    const idx = parseInt(key[1])
    const p = layout[type][idx]
    const wrap = type === 'D' ? 'top' : 'bottom'
    const enterSide = sides[i]
    const exitSide = sides[i + 1]

    // 入切点：严格最左/最右点
    const enterX = enterSide === 'left' ? p.cx - p.r : p.cx + p.r
    path.push({ type: 'line', x: enterX, y: p.cy })

    // 标准半圆弧
    const startAngle = enterSide === 'left' ? Math.PI : 0
    const endAngle = exitSide === 'left' ? Math.PI : 0
    // 定滑轮绕顶部，动滑轮绕底部
    const ccw = (wrap === 'top') ? (enterSide === 'right') : (enterSide === 'left')
    path.push({ type: 'arc', cx: p.cx, cy: p.cy, r: p.r, start: startAngle, end: endAngle, ccw })
  }
  path.push({ type: 'line', x: pullX, y: pullY })
  return path
}

// ==================== 主绘制函数（适配 ExperimentCanvas 签名） ====================
const drawScene = (ctx, state, utils) => {
  const w = utils.canvasWidth
  const h = utils.canvasHeight
  const cx = w / 2
  const G = GEOM
  const preset = PRESETS.find(p => p.id === state.preset)
  const hPx = state.h * G.pxPerCm
  const movY = G.movY0 - hPx

  // 白底
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)

  // 顶部标签
  ctx.fillStyle = INK
  ctx.font = '600 16px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(PRESET_LABEL[preset.id].top, cx, G.beamY - 7)

  // 横梁
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, G.beamY)
  ctx.lineTo(w, G.beamY)
  ctx.stroke()

  // 滑轮布局
  const layout = getPulleyLayout(preset.id, cx, G.fixY, movY)

  // 重物位置（动态挂在动滑轮挂钩上）
  const botR = getBottomMovRadius(preset.id)
  const loadX = preset.id === 'fix1' ? cx - G.rFixSingle : cx
  const loadTop = preset.id === 'fix1'
    ? G.loadY0 - hPx
    : movY + botR + G.hookLen + G.ropeToLoad

  // 自由端位置（按 n 倍关系联动）
  const order = WRAP_ORDER[preset.id] || []
  const sides = CONNECT_SIDES[preset.id] || []
  const lastKey = order[order.length - 1]
  const lastType = lastKey ? lastKey[0] : 'D'
  const lastIdx = lastKey ? parseInt(lastKey[1]) : 0
  const lastP = layout[lastType][lastIdx]
  const lastSide = sides[sides.length - 1]
  const pullX = lastSide === 'left' ? lastP.cx - lastP.r : lastP.cx + lastP.r
  const baseOffset = 65
  const pullY0 = state.pull === 'down' ? lastP.cy + baseOffset : lastP.cy - baseOffset
  const pullY = state.pull === 'down'
    ? Math.max(lastP.cy + 10, Math.min(h - 40, pullY0 + state.n * hPx))
    : Math.max(G.beamY + 20, Math.min(lastP.cy - 10, pullY0 - state.n * hPx))

  // 固定端
  let anchor
  if (preset.id === 'fix1') {
	anchor = { x: cx - G.rFixSingle, y: loadTop }
  } else if (preset.id === 'mov1') {
	anchor = { x: cx - G.rMovSingle, y: G.beamY + 8 }
  } else if (preset.id === '1f1m2') {
	anchor = { x: cx, y: G.fixY }
  } else if (preset.id === '2f2m4') {
	anchor = { x: cx, y: G.fixY + G.fixGap }   // 靠下的定滑轮圆心
  } else if (preset.id === '1f1m3') {
	anchor = { x: cx, y: movY }
  } else {
	anchor = { x: cx, y: movY - G.movGap }     // 靠上的动滑轮圆心
  }


  // 刻度尺
  drawRuler(ctx, state.h, loadX)

  // 绳子路径
  const ropePath = buildRopePath(preset.id, cx, G.fixY, movY, anchor, pullX, pullY)

  // 先画绳子（被滑轮遮挡部分自然覆盖）
  drawRope(ctx, ropePath)

  // 定滑轮组
  layout.D.forEach((p, i) => drawPulley(ctx, p, 'fixed', layout.D.length, i))
  // 动滑轮组
  layout.M.forEach((p, i) => drawPulley(ctx, p, 'moving', layout.M.length, i))

  // 固定端锚点
  drawAnchor(ctx, anchor, preset.id, G)

  // 吊架（动滑轮轴 → 重物）
  if (preset.id !== 'fix1' && botR > 0) {
    const hangerTop = layout.M.length > 1 ? movY + G.movGap + G.rMovBig : movY + G.rMovSingle
    ctx.strokeStyle = INK
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, hangerTop)
    ctx.lineTo(cx, loadTop - G.ropeToLoad)
    ctx.stroke()
  }

  // 重物
  drawLoad(ctx, loadX, loadTop, state.G)

  // 自由端拉力（沿绳方向）
  const dirY = state.pull === 'down' ? 1 : -1
  drawPullForce(ctx, pullX, pullY, 0, dirY, state.F)

  // 底部标签
  ctx.fillStyle = INK
  ctx.font = '600 16px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(PRESET_LABEL[preset.id].bottom, cx, h - 14)
}

// ---------- 绳子 ----------
function drawRope(ctx, path) {
  if (!path || path.length < 2) return
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (const seg of path) {
    if (seg.type === 'move') ctx.moveTo(seg.x, seg.y)
    else if (seg.type === 'line') ctx.lineTo(seg.x, seg.y)
    else if (seg.type === 'arc') ctx.arc(seg.cx, seg.cy, seg.r, seg.start, seg.end, seg.ccw)
  }
  ctx.stroke()
  ctx.restore()
}

// ---------- 滑轮（圆形 + 8字形双轮，线稿风格） ----------
function drawPulley(ctx, p, kind, total, index) {
  const { cx, cy, r } = p
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // 定滑轮支撑线（仅最上方那个）
  if (kind === 'fixed' && p.support) {
    ctx.beginPath()
    ctx.moveTo(cx, GEOM.beamY)
    ctx.lineTo(cx, cy - r)
    ctx.stroke()
  }

  // 轮圈（圆形）
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  // 内圈（轮辐暗示）
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2)
  ctx.stroke()

  // 轴毂
  ctx.beginPath()
  ctx.arc(cx, cy, 3, 0, Math.PI * 2)
  ctx.stroke()

  // 动滑轮挂钩（仅最下方那个）
  if (kind === 'moving' && index === total - 1) {
    ctx.beginPath()
    ctx.moveTo(cx, cy + r)
    ctx.lineTo(cx, cy + r + GEOM.hookLen - 3)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy + r + GEOM.hookLen, 4, 0.15, Math.PI * 1.3)
    ctx.stroke()
  }

  ctx.restore()
}

// ---------- 固定端锚点 ----------
function drawAnchor(ctx, anchor, id, G) {
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  if (id === 'mov1') {
    ctx.beginPath()
    ctx.moveTo(anchor.x, G.beamY)
    ctx.lineTo(anchor.x, anchor.y - 4)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(anchor.x, anchor.y, 3, 0, Math.PI * 2)
    ctx.stroke()
  } else if (id !== 'fix1') {
    // 系在滑轮轴心：小结
    ctx.beginPath()
    ctx.arc(anchor.x, anchor.y, 3, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

// ---------- 重物 ----------
function drawLoad(ctx, x, topY, weight) {
  const w = 76
  const hgt = 46
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.lineCap = 'round'

  // 吊绳
  ctx.beginPath()
  ctx.moveTo(x, topY - GEOM.ropeToLoad)
  ctx.lineTo(x, topY)
  ctx.stroke()

  // 顶边虚线
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
  ctx.fillText(`G=${weight}N`, x, topY + hgt / 2)
  ctx.restore()
}

// ---------- 自由端拉力（沿绳方向，简洁拳头+箭头，无折线） ----------
function drawPullForce(ctx, x, y, dirX, dirY, force) {
  ctx.save()
  ctx.translate(x, y)
  const angle = Math.atan2(dirY, dirX)
  ctx.rotate(angle)

  ctx.strokeStyle = INK
  ctx.fillStyle = INK
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // 手：圆角矩形，沿 x 轴正方向（旋转后 = 绳方向）
  const handW = 13   // 垂直于绳的宽度
  const handL = 16   // 沿绳方向的长度
  ctx.beginPath()
  ctx.moveTo(0, -handW / 2 + 3)
  ctx.lineTo(0, handW / 2 - 3)
  ctx.quadraticCurveTo(0, handW / 2, 3, handW / 2)
  ctx.lineTo(handL - 3, handW / 2)
  ctx.quadraticCurveTo(handL, handW / 2, handL, handW / 2 - 3)
  ctx.lineTo(handL, -handW / 2 + 3)
  ctx.quadraticCurveTo(handL, -handW / 2, handL - 3, -handW / 2)
  ctx.lineTo(3, -handW / 2)
  ctx.quadraticCurveTo(0, -handW / 2, 0, -handW / 2 + 3)
  ctx.closePath()
  ctx.stroke()

  // 箭头：从拳头末端沿 x 轴正方向伸出
  const arrowStart = handL + 2
  const arrowLen = 20
  ctx.beginPath()
  ctx.moveTo(arrowStart, 0)
  ctx.lineTo(arrowStart + arrowLen, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(arrowStart + arrowLen, 0)
  ctx.lineTo(arrowStart + arrowLen - 7, -6)
  ctx.lineTo(arrowStart + arrowLen - 7, 6)
  ctx.closePath()
  ctx.fill()

  // F 标签（转回水平书写）
  ctx.rotate(-angle)
  const endX = x + Math.cos(angle) * (arrowStart + arrowLen)
  const endY = y + Math.sin(angle) * (arrowStart + arrowLen)
  ctx.font = '600 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`F=${force.toFixed(2)}N`, endX + 8, endY)

  ctx.restore()
}



// ---------- 刻度尺 ----------
function drawRuler(ctx, hCmVal, loadX) {
  const G = GEOM
  const x0 = 46
  const yBot = G.loadY0 + 14
  const yTop = yBot - 20 * G.pxPerCm
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, yTop)
  ctx.lineTo(x0, yBot)
  ctx.stroke()
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let c = 0; c <= 20; c += 2) {
    const y = yBot - c * G.pxPerCm
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x0 - 6, y)
    ctx.stroke()
    ctx.fillText(String(c), x0 - 9, y)
  }
  // 当前高度指示线
  const hy = yBot - hCmVal * G.pxPerCm
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x0, hy)
  ctx.lineTo(loadX - 34, hy)
  ctx.stroke()
  ctx.fillStyle = INK
  ctx.font = '600 11px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`h=${hCmVal.toFixed(1)}cm`, x0 + 6, hy - 6)
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
  .preset-name { font-size: 12px; }
  .preset-n { font-size: 11px; color: rgba(255,255,255,0.55); }
  &:hover:not(.active) { border-color: rgba(245,166,35,0.5); }
  &.active {
    border-color: $color-accent;
    background: rgba(245,166,35,0.15);
    .preset-n { color: $color-accent; font-weight: 600; }
  }
}
.preset-desc {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255,255,255,0.55);
  text-align: center;
}
.slider-row {
  margin-bottom: 10px;
  &:last-child { margin-bottom: 0; }
}
.slider-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: rgba(255,255,255,0.85);
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
  color: rgba(255,255,255,0.5);
  margin-top: 2px;
}
.control-tip {
  font-size: 12px;
  color: rgba(255,255,255,0.65);
  line-height: 1.6;
  margin: 0;
}
.pulley-data {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.data-group {
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 12px;
}
.group-title {
  font-size: 14px;
  font-weight: 500;
  color: $color-accent;
  margin-bottom: 10px;
}
.formula-box {
  background: rgba(245,166,35,0.08);
  border: 1px solid rgba(245,166,35,0.35);
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
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(255,255,255,0.08);
  &.half { flex: 1; }
  &.perfect {
    border-color: $color-success;
    background: rgba(82,196,26,0.1);
    .card-value { color: $color-success; }
  }
}
.card-label {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
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
    color: rgba(255,255,255,0.5);
    margin-left: 4px;
  }
  &.pull-dir { color: $color-accent; }
  .pull-arrow { font-size: 16px; }
}
.formula-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.detail-line {
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  line-height: 1.5;
  word-break: break-all;
}
.theory-content {
  line-height: 1.8;
  font-size: 14px;
  color: $color-text-dark;
  h4 { margin: 12px 0 6px; color: $color-primary; font-size: 15px; }
  ul { margin: 0; padding-left: 20px; }
  .notes { margin-top: 12px; color: #999; font-size: 13px; }
}
</style>
