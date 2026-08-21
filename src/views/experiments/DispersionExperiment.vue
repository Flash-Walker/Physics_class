<template>
  <div class="dispersion-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="runState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：参数控制 -->
      <template #control>
        <div class="disp-control">
          <p class="control-tip">🌈 白光射入三棱镜，被分解成七色光<br />（不同色光在玻璃中折射率不同 → 偏折不同）</p>

          <!-- 入射角滑块 -->
          <div class="control-group">
            <div class="group-label">入射角 i（白光与棱镜左面法线的夹角）</div>
            <input type="range" class="u-slider" min="35" max="65" step="0.5" v-model.number="incidentAngle" />
            <div class="u-value">入射角 i = <b>{{ incidentAngle.toFixed(1) }}</b>° <span class="dir-tip">{{ Math.abs(incidentAngle - 49.5) < 0.5 ? '最小偏折角（经典实验）' : '' }}</span></div>
          </div>

          <!-- 显示选项 -->
          <div class="control-group">
            <div class="group-label">显示选项</div>
            <label class="switch-row">
              <input type="checkbox" v-model="showLabels" />
              <span>色光名称标签</span>
            </label>
            <label class="switch-row">
              <input type="checkbox" v-model="showPrismRays" />
              <span>棱镜内七色光路</span>
            </label>
          </div>

          <div v-if="totalReflect" class="total-reflect-tip">
            ⚠️ 入射角过大：紫光（可能含靛/蓝光）在棱镜右面发生<b>全反射</b>，无法出射。<br />
            把入射角调小到 50° 以内试试。
          </div>

          <p class="control-hint">💡 点「开始」播放动画：白光射入棱镜 → 棱镜内开始分色 → 出射后七色展开。<br />※ 两个界面都按斯涅耳定律 n₁sin i = n₂sin r 计算，出射角 e 随入射角 i 实时变化（见右侧数据栏）。<br />※ 七色真实角度差仅约 1°，为便于观察，出射角度已按比例放大显示（顺序不变：红偏折最小、紫最大）</p>
        </div>
      </template>

      <!-- 中间：画布 -->
      <template #canvas>
        <ExperimentCanvas
          :draw="drawScene"
          :state="canvasState"
          @resize="handleCanvasResize"
        />
      </template>

      <!-- 右侧：实时数据 -->
      <template #data>
        <div class="disp-data">
          <div class="data-group">
            <div class="group-title">🌈 七色光谱</div>
            <div class="spectrum-bar"></div>
            <div class="spectrum-table">
              <div v-for="c in COLORS" :key="c.name" class="spectrum-row">
                <span class="color-dot" :style="{ background: c.color }"></span>
                <span class="color-name">{{ c.name }}</span>
                <span class="color-wave">{{ c.wave }}</span>
                <span class="color-n">n={{ c.n.toFixed(3) }}</span>
                <span class="color-v">{{ (3 / c.n).toFixed(3) }}</span>
              </div>
            </div>
            <div class="spectrum-legend">
              <span class="color-dot"></span>
              <span class="color-name"></span>
              <span>波长 λ（nm）</span>
              <span>折射率 n</span>
              <span>速度 v（×10⁸ m/s）</span>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">📐 实时角度（斯涅耳定律）</div>
            <div class="angle-table">
              <div class="angle-row">
                <span>入射角 i（左面法线）</span>
                <b>{{ incidentAngle.toFixed(1) }}°</b>
              </div>
              <div class="angle-row">
                <span>左面折射角 r（红光）</span>
                <b>{{ entryR.toFixed(1) }}°</b>
              </div>
              <div class="angle-row">
                <span>右面出射角 e（红光）</span>
                <b>{{ redTrace ? redTrace.eOut.toFixed(1) : '—' }}°</b>
              </div>
              <div class="angle-row">
                <span>偏向角 δ = i + e − 60°</span>
                <b>{{ deviation !== null ? deviation.toFixed(1) : '—' }}°</b>
              </div>
              <div class="angle-row">
                <span>验证 n₁sin i = n₂sin r</span>
                <b>{{ snellCheck }}</b>
              </div>
            </div>
            <p class="angle-note">两个界面均按斯涅耳定律逐色计算：i 从 35°→65° 时，e 从约 68°→37° 大幅变化；δ 变化较小（38°~45°）是三棱镜的真实特性。仅当 i ≈ 49.5°（最小偏折角）时棱镜内光路对称，出现 i = e。</p>
          </div>

          <div class="data-group">
            <div class="group-title">为什么七色会分开？</div>
            <div class="point-list">
              <div class="point-item">① 白光不是单色光，由红→紫七种色光混合而成</div>
              <div class="point-item">② 玻璃对不同色光的折射率不同：红光 n 最小、紫光 n 最大</div>
              <div class="point-item">③ n = c / v：紫光在玻璃中速度最慢，偏折最厉害</div>
              <div class="point-item">④ 红光偏折最小（在上），紫光偏折最大（在下）</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">色散的应用</div>
            <div class="app-list">
              <div class="app-item">🌧 彩虹：雨后水滴把阳光色散成七色</div>
              <div class="app-item">🔭 光谱分析：通过光谱研究物质成分</div>
              <div class="app-item">📀 光盘/肥皂泡：薄膜干涉产生彩色</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">验证结论</div>
            <div class="nature-box real">
              <div class="nature-main">✅ 紫光偏折最大，红光偏折最小</div>
              <div class="nature-sub">偏折角顺序：红 &lt; 橙 &lt; 黄 &lt; 绿 &lt; 蓝 &lt; 靛 &lt; 紫</div>
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
              <li v-for="(fItem, i) in config.theory.formulas" :key="i">{{ fItem }}</li>
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
import { dispersionConfig } from '@/config/experiments/optics/dispersion.js'
import { OpticsEngine } from '@/utils/physics/PhysicsEngine.js'
import { refractionAngle, raySegmentIntersection, degToRad, radToDeg } from '@/utils/physics/physicsUtils.js'

const config = dispersionConfig

// ========== 七色光参数（玻璃折射率） ==========
const COLORS = [
  { name: '红', color: '#ff4d4f', wave: '620~750', n: 1.514 },
  { name: '橙', color: '#ff8c42', wave: '590~620', n: 1.518 },
  { name: '黄', color: '#ffd21f', wave: '570~590', n: 1.521 },
  { name: '绿', color: '#3ddc55', wave: '500~570', n: 1.525 },
  { name: '蓝', color: '#3d9bff', wave: '450~500', n: 1.528 },
  { name: '靛', color: '#5b5bff', wave: '430~450', n: 1.530 },
  { name: '紫', color: '#b44dff', wave: '380~430', n: 1.531 }
]

// ========== 交互状态 ==========
const incidentAngle = ref(49.5)     // 白光入射角（与左面法线夹角），最小偏折角 ≈49.5°
const showLabels = ref(false)       // 色光名称标签
const showPrismRays = ref(true)     // 棱镜内七色光路
const runState = ref('idle')
const rayProgress = ref([])

// ========== 光学引擎：动画时钟 ==========
const engine = new OpticsEngine()
engine.addRay({ id: 'ray-clk', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.3, delay: 0 })
engine.onUpdate = (state) => {
  rayProgress.value = state.rays
  runState.value = state.state
}
engine.reset()

watch(incidentAngle, () => {
  const wasRunning = engine.state === 'running'
  engine.reset()
  if (wasRunning) engine.start()
})

// ========== 按钮事件 ==========
const handleStart = () => engine.start()
const handlePause = () => engine.pause()
const handleReset = () => engine.reset()

// ========== 画布几何 ==========
const canvasW = ref(640)
const canvasH = ref(420)
const handleCanvasResize = ({ width, height }) => {
  canvasW.value = width
  canvasH.value = height
}

const cx = computed(() => canvasW.value / 2)
const cy = computed(() => canvasH.value / 2)

// 等边三棱镜（顶点朝上）：A 左下、B 上顶点、C 右下
const PRISM = {
  A: () => ({ x: cx.value - 80, y: cy.value + 69.3 }),
  B: () => ({ x: cx.value, y: cy.value - 69.3 }),
  C: () => ({ x: cx.value + 80, y: cy.value + 69.3 })
}

// 棱镜内法线：左面 AB 指向棱镜内（右下）、右面 BC 指向棱镜内（左下）
const nAB = { x: 0.866, y: 0.5 }
const nBC = { x: -0.866, y: 0.5 }

// 向量旋转（弧度制，数学正方向）
const rotRad = (v, rad) => ({
  x: v.x * Math.cos(rad) - v.y * Math.sin(rad),
  y: v.x * Math.sin(rad) + v.y * Math.cos(rad)
})

// 折射方向追迹：输入入射方向与界面法线（指向入射侧），输出折射方向（角度制）
const refractDir = (dir, normal, n1, n2) => {
  // 法线取与 dir 同侧（点积 > 0）
  let n = normal
  if (dir.x * n.x + dir.y * n.y < 0) n = { x: -n.x, y: -n.y }
  const cosI = Math.max(-1, Math.min(1, dir.x * n.x + dir.y * n.y))
  const iDeg = radToDeg(Math.acos(cosI))
  const rDeg = refractionAngle(n1, n2, iDeg)
  if (rDeg === null) return null // 全反射
  const aDir = Math.atan2(dir.y, dir.x)
  const aN = Math.atan2(n.y, n.x)
  // 从 dir 到法线的有向角（归一化到 (-180°, 180°]）
  let dAngle = ((aN - aDir + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  const sign = dAngle >= 0 ? 1 : -1
  const delta = sign * degToRad(iDeg - rDeg)
  return rotRad(dir, delta)
}

// 两向量夹角（度，0~180）
const angleBetween = (a, b) => {
  const cos = Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y) || 1)))
  return radToDeg(Math.acos(cos))
}

// ========== 光束与追迹 ==========
// 白光方向：法线 nAB 向入射侧旋转 -i（入射角 i）
const beamDir = computed(() => rotRad(nAB, -degToRad(incidentAngle.value)))
// 入射点：左面 AB 中点
const PIn = computed(() => ({ x: cx.value - 40, y: cy.value }))
// 光源位置
const P0 = computed(() => ({ x: PIn.value.x - beamDir.value.x * 140, y: PIn.value.y - beamDir.value.y * 140 }))

// 七色光追迹结果
const traces = computed(() => {
  const A = PRISM.A()
  const B = PRISM.B()
  const C = PRISM.C()
  // 第一遍：逐色追迹（求入射点 / 出射点 / 出射方向）
  const raw = COLORS.map((c) => {
    // ① 左面折射
    const dPrism = refractDir(beamDir.value, nAB, 1, c.n)
    if (!dPrism) return { ...c, ok: false }
    // ② 与右面 BC 求交（出射点）
    const angleDeg = radToDeg(Math.atan2(dPrism.y, dPrism.x))
    const hit = raySegmentIntersection(PIn.value.x, PIn.value.y, angleDeg, B, C)
    if (!hit) return { ...c, ok: false }
    const POut = { x: hit.x, y: hit.y }
    // ③ 右面出射（i₂ 相对右面外法线计算，即真实入射角；eOut = 出射角 e）
    const nBCout = { x: -nBC.x, y: -nBC.y }
    const i2 = angleBetween(dPrism, nBCout)
    const dOut = refractDir(dPrism, nBC, c.n, 1)
    if (!dOut) return { ...c, ok: false, dPrism, POut }
    return { ...c, ok: true, dPrism, POut, dOut, i2, eOut: refractionAngle(c.n, 1, i2) }
  })
  const oks = raw.filter(t => t.ok)
  if (!oks.length) return raw
  // 第二遍：色散增强（七色真实角度差仅约 1°，画布上挤成一团看不清；
  // 以红光出射方向为基准，把红→紫的总分离角放大到固定目标值，
  // 顺序与相对大小保持不变，仅作可视化增强）
  const rawAngles = oks.map(t => Math.atan2(t.dOut.y, t.dOut.x))
  const redAngle = rawAngles[0]
  const span = Math.max(...rawAngles) - Math.min(...rawAngles)
  const targetSpan = degToRad(7.5)
  const dFactor = Math.max(1, Math.min(12, targetSpan / Math.max(span, 1e-6)))
  return raw.map((t) => {
    if (!t.ok) return t
    const a = Math.atan2(t.dOut.y, t.dOut.x)
    const dOut = rotRad(oks[0].dOut, (a - redAngle) * dFactor)
    // 出射长度自适应（保证末端在画布内）
    const ang = Math.atan2(dOut.y, dOut.x)
    let L = 300
    L = Math.min(L, (canvasH.value - t.POut.y - 30) / Math.max(Math.sin(ang), 0.15))
    if (Math.cos(ang) > 0.01) L = Math.min(L, (canvasW.value - 30 - t.POut.x) / Math.cos(ang))
    else if (Math.cos(ang) < -0.01) L = Math.min(L, (t.POut.x - 30) / -Math.cos(ang))
    L = Math.max(L, 60)
    const end = { x: t.POut.x + dOut.x * L, y: t.POut.y + dOut.y * L }
    return { ...t, dOut, end, outLen: L, dFactor }
  })
})

// 是否有色光发生全反射（无法出射）
const totalReflect = computed(() => traces.value.some(t => !t.ok))

// 红光追迹（出射方向未经增强，是真实方向；画布标注与数据面板都用它）
const redTrace = computed(() => traces.value.find(t => t.name === '红' && t.ok) || null)
// 红光在左面的折射角 r（斯涅耳定律）
const entryR = computed(() => refractionAngle(1, COLORS[0].n, incidentAngle.value))
// 偏向角 δ = i + e − A（A = 60°，等边三棱镜；红光）
const deviation = computed(() => (redTrace.value ? incidentAngle.value + redTrace.value.eOut - 60 : null))
// 斯涅耳验证：n₁sin i 与 n₂sin r（左面，红光）
const snellCheck = computed(() => {
  if (!redTrace.value) return '—'
  const lhs = Math.sin(degToRad(incidentAngle.value))
  const rhs = COLORS[0].n * Math.sin(degToRad(entryR.value))
  return `${lhs.toFixed(3)} ≈ ${rhs.toFixed(3)} ✓`
})

// 棱镜内光路平均长度（动画分段用）
const avgPrismLen = computed(() => {
  const oks = traces.value.filter(t => t.ok && t.POut)
  if (!oks.length) return 100
  return oks.reduce((s, t) => s + Math.hypot(t.POut.x - PIn.value.x, t.POut.y - PIn.value.y), 0) / oks.length
})

// ========== 动画进度（三段接力：白光 → 棱镜内 → 出射） ==========
const clkProgress = computed(() => {
  const r = rayProgress.value.find(x => x.id === 'ray-clk')
  return r ? r.progress : 0
})
const pAll = computed(() => (engine.state === 'idle' ? 1 : clkProgress.value))

const lenIn = computed(() => Math.hypot(PIn.value.x - P0.value.x, PIn.value.y - P0.value.y))
// 出射段平均长度（各色自适应不同，动画分段用平均值）
const avgOutLen = computed(() => {
  const oks = traces.value.filter(t => t.ok && t.outLen)
  if (!oks.length) return 200
  return oks.reduce((s, t) => s + t.outLen, 0) / oks.length
})
const remain = computed(() => (lenIn.value + avgPrismLen.value + avgOutLen.value) * pAll.value)
const pIn = computed(() => Math.min(1, remain.value / lenIn.value))
const pPrism = computed(() => Math.max(0, Math.min(1, (remain.value - lenIn.value) / avgPrismLen.value)))
const pOut = computed(() => Math.max(0, Math.min(1, (remain.value - lenIn.value - avgPrismLen.value) / avgOutLen.value)))

// 出射七色微错开（红先紫后，增强层次感）
const pOutColor = (idx) => {
  const delay = idx * 0.06
  return Math.max(0, Math.min(1, (pOut.value - delay) / (1 - 6 * 0.06)))
}

// ========== 画布状态 ==========
const canvasState = computed(() => ({
  incidentAngle: incidentAngle.value,
  showLabels: showLabels.value,
  showPrismRays: showPrismRays.value,
  cx: cx.value,
  cy: cy.value,
  P0: P0.value,
  PIn: PIn.value,
  beamDir: beamDir.value,
  traces: traces.value,
  totalReflect: totalReflect.value,
  pIn: pIn.value,
  pPrism: pPrism.value,
  pOutColor0: pOutColor(0),
  engineState: engine.state
}))

// ========== 绘制函数 ==========
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

const drawScene = (ctx, state, utils) => {
  const { cx, cy, PIn } = state
  const A = { x: cx - 80, y: cy + 69.3 }
  const B = { x: cx, y: cy - 69.3 }
  const C = { x: cx + 80, y: cy + 69.3 }

  // ① 三棱镜（半透明填充 + 描边）
  ctx.save()
  ctx.fillStyle = 'rgba(120, 170, 220, 0.16)'
  ctx.strokeStyle = '#4a7fb5'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(A.x, A.y)
  ctx.lineTo(B.x, B.y)
  ctx.lineTo(C.x, C.y)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // 棱镜标签
  ctx.fillStyle = '#4a7fb5'
  ctx.font = '12px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.fillText('三棱镜（玻璃）', cx, cy + 95)
  ctx.restore()

  // ② 入射白光束（白 4px + 灰描边，从光源到入射点，按进度生长）
  if (state.pIn > 0) {
    const ex = state.P0.x + (PIn.x - state.P0.x) * state.pIn
    const ey = state.P0.y + (PIn.y - state.P0.y) * state.pIn
    ctx.save()
    ctx.lineCap = 'round'
    // 描边
    ctx.strokeStyle = 'rgba(90, 90, 100, 0.55)'
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(state.P0.x, state.P0.y)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    // 白光
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(state.P0.x, state.P0.y)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    ctx.restore()
  }

  // ③ 棱镜内七色光路（从 P_in 到各自出射点，按进度生长）
  if (state.showPrismRays) {
    state.traces.forEach((t) => {
      if (!t.ok || !t.POut || state.pPrism <= 0) return
      const ex = PIn.x + (t.POut.x - PIn.x) * state.pPrism
      const ey = PIn.y + (t.POut.y - PIn.y) * state.pPrism
      ctx.save()
      ctx.strokeStyle = t.color
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(PIn.x, PIn.y)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      ctx.restore()
    })
  }

  // ④ 出射七色光（加粗光带 + 末端色点，微错开 + 方向箭头）
  state.traces.forEach((t, idx) => {
    if (!t.ok || !t.dOut) return
    const p = pOutColor(idx)
    if (p <= 0) return
    const ex = t.POut.x + t.dOut.x * t.outLen * p
    const ey = t.POut.y + t.dOut.y * t.outLen * p
    ctx.save()
    ctx.strokeStyle = t.color
    ctx.fillStyle = t.color
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(t.POut.x, t.POut.y)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    // 方向箭头（中点）
    const mx = t.POut.x + t.dOut.x * t.outLen * 0.5
    const my = t.POut.y + t.dOut.y * t.outLen * 0.5
    if (p >= 0.5) {
      const size = 7
      ctx.beginPath()
      ctx.moveTo(mx + t.dOut.x * size, my + t.dOut.y * size)
      ctx.lineTo(mx - t.dOut.y * size * 0.5, my + t.dOut.x * size * 0.5)
      ctx.lineTo(mx + t.dOut.y * size * 0.5, my - t.dOut.x * size * 0.5)
      ctx.closePath()
      ctx.fill()
    }
    // 末端色点（光斑，随光线生长移动）
    ctx.beginPath()
    ctx.arc(ex, ey, 4.5, 0, Math.PI * 2)
    ctx.fill()
    // 色名标签（末端）
    if (state.showLabels) {
      ctx.font = '12px "Microsoft YaHei"'
      ctx.textAlign = 'center'
      ctx.fillText(t.name, ex + t.dOut.x * 16, ey + t.dOut.y * 16)
    }
    ctx.restore()
  })

  // ⑤ 入射角标注（入射光线 ↔ 左面法线之间的真实夹角 i）
  if (state.incidentAngle > 0 && state.pIn >= 1) {
    const a0 = Math.atan2(state.beamDir.y, state.beamDir.x) // 入射光线方向（指向棱镜）
    const aN = Math.atan2(nAB.y, nAB.x) // 左面法线（指向棱镜内）
    const mid = (a0 + aN) / 2
    ctx.save()
    ctx.strokeStyle = '#e8b339'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(PIn.x, PIn.y, 30, a0, aN, false)
    ctx.stroke()
    ctx.fillStyle = '#e8b339'
    ctx.font = 'bold 12px "Microsoft YaHei"'
    ctx.textAlign = 'center'
    ctx.fillText(`i = ${state.incidentAngle.toFixed(1)}°`, PIn.x + Math.cos(mid) * 46, PIn.y + Math.sin(mid) * 46 + 5)
    ctx.restore()
  }

  // ⑤b 出射角标注（红光出射光线 ↔ 右面外法线；红光方向未经增强，即真实出射角 e）
  const redT = state.traces.find(t => t.name === '红' && t.ok)
  if (redT && state.pOutColor0 >= 1) {
    const aN = Math.atan2(-nBC.y, -nBC.x) // 右面外法线（指向棱镜外）
    const a1 = Math.atan2(redT.dOut.y, redT.dOut.x)
    const mid = (aN + a1) / 2
    ctx.save()
    ctx.strokeStyle = '#3d9bff'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(redT.POut.x, redT.POut.y, 30, aN, a1, false)
    ctx.stroke()
    ctx.fillStyle = '#3d9bff'
    ctx.font = 'bold 12px "Microsoft YaHei"'
    ctx.textAlign = 'center'
    ctx.fillText(`e = ${redT.eOut.toFixed(1)}°`, redT.POut.x + Math.cos(mid) * 50, redT.POut.y + Math.sin(mid) * 50 + 5)
    ctx.restore()
  }

  // ⑥ 全反射提示（画布右上角）
  if (state.totalReflect) {
    ctx.save()
    ctx.fillStyle = 'rgba(230, 80, 60, 0.9)'
    ctx.font = '12px "Microsoft YaHei"'
    ctx.textAlign = 'right'
    ctx.fillText('⚠ 部分色光发生全反射，无法出射', utils.canvasWidth - 16, 26)
    ctx.restore()
  }

  // ⑦ 说明：色散角度已放大（画布左下角）
  ctx.save()
  ctx.fillStyle = 'rgba(140, 140, 150, 0.75)'
  ctx.font = '11px "Microsoft YaHei"'
  ctx.textAlign = 'left'
  ctx.fillText('※ 为便于观察，七色出射角度已按比例放大显示', 16, utils.canvasHeight - 14)
  ctx.restore()
}

// ========== 生命周期 ==========
onUnmounted(() => {
  engine.destroy()
})
</script>

<style lang="scss" scoped>
.dispersion-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 控制面板 ========== */
.disp-control {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-tip {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
  margin: 0;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.u-slider {
  width: 100%;
  accent-color: $color-accent;
}

.u-value {
  font-size: 14px;
  color: #fff;

  b {
    color: $color-accent;
    font-size: 18px;
  }

  .dir-tip {
    margin-left: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
  }
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;

  input {
    accent-color: $color-accent;
  }
}

.total-reflect-tip {
  font-size: 12px;
  color: #ff7a5c;
  line-height: 1.6;
  background: rgba(230, 80, 60, 0.1);
  border: 1px solid rgba(230, 80, 60, 0.35);
  border-radius: 6px;
  padding: 8px 10px;
}

.control-hint {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 10px;
  line-height: 1.6;
}

/* ========== 数据面板 ========== */
.disp-data {
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

.spectrum-bar {
  height: 14px;
  border-radius: 7px;
  background: linear-gradient(90deg, #ff4d4f, #ff8c42, #ffd21f, #3ddc55, #3d9bff, #5b5bff, #b44dff);
  margin-bottom: 10px;
}

.spectrum-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spectrum-row,
.spectrum-legend {
  display: grid;
  grid-template-columns: 12px 24px 1fr 64px 64px;
  gap: 8px;
  align-items: center;
}

.spectrum-row {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.color-name {
  color: rgba(255, 255, 255, 0.85);
}

.color-wave {
  color: rgba(255, 255, 255, 0.55);
}

.color-n {
  text-align: right;
  color: $color-accent;
}

.color-v {
  text-align: right;
  color: #fff;
}

.spectrum-legend {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 4px;

  .color-dot {
    visibility: hidden;
  }

  span:nth-child(4),
  span:nth-child(5) {
    text-align: right;
  }
}

/* 实时角度表 */
.angle-table {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.angle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);

  b {
    color: $color-accent;
    font-size: 13px;
    white-space: nowrap;
  }
}

.angle-note {
  margin: 8px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.6;
}

.point-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.point-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 7px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.app-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.app-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
}

.nature-box {
  border-radius: 6px;
  padding: 10px 12px;
  text-align: center;
  border: 1px solid rgba(82, 196, 26, 0.5);
  background: rgba(82, 196, 26, 0.1);
}

.nature-main {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.nature-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
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
