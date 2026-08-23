<template>
  <div class="he-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="sim.animState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：机型 / 模式 / 节奏控制 -->
      <template #control>
        <div class="he-control">
          <div class="ctrl-group">
            <div class="group-label">🛢 机型对比</div>
            <div class="btn-row">
              <button class="type-btn" :class="{ active: sim.engineType === 'gasoline' }" @click="switchEngine('gasoline')">
                ⛽ 汽油机
              </button>
              <button class="type-btn" :class="{ active: sim.engineType === 'diesel' }" @click="switchEngine('diesel')">
                🚚 柴油机
              </button>
            </div>
            <p class="sub-info">{{ engineTypeText }}</p>
          </div>

          <div class="ctrl-group">
            <div class="group-label">🎛 教学节奏</div>
            <div class="btn-row">
              <button class="mode-btn" :class="{ active: sim.mode === 'step' }" @click="switchMode('step')">
                👣 单步教学
              </button>
              <button class="mode-btn" :class="{ active: sim.mode === 'auto' }" @click="switchMode('auto')">
                🔄 自动运转
              </button>
            </div>
            <p class="sub-info">{{ sim.mode === 'step' ? '一次走一个冲程，逐步观察' : '连续运转，观察完整循环' }}</p>
          </div>

          <template v-if="sim.mode === 'step'">
            <div class="ctrl-group">
              <div class="group-label">👣 四冲程：吸 → 压 → 做 → 排</div>
              <button class="action-btn primary" :disabled="stepRunning" @click="nextStep">
                {{ stepRunning ? '⏳ 冲程播放中…' : '下一步冲程 ▶' }}
              </button>
              <p class="sub-info">当前：{{ phaseInfo.name }}（第 {{ sim.theta % 720 === 0 ? 1 : Math.floor(sim.theta / 180) + 1 }} 冲程）</p>
            </div>
          </template>

          <template v-else>
            <div class="ctrl-group">
              <div class="group-label">⚙️ 转速（慢速观察细节）</div>
              <input type="range" min="0.5" max="2" step="0.1" v-model.number="sim.speed" class="speed-slider" />
              <div class="speed-val">{{ sim.speed.toFixed(1) }}x</div>
              <p class="sub-info">一个完整循环 = 曲轴转 2 圈 = 做功 1 次</p>
            </div>
          </template>

          <p class="control-tip">💡 提示：压缩冲程机械能→内能（温度升高）；做功冲程内能→机械能（燃气膨胀推动活塞）。压缩与排气冲程靠飞轮惯性完成，只有做功冲程对外做功。</p>
        </div>
      </template>

      <!-- 中间：气缸剖面画布 -->
      <template #canvas>
        <div class="canvas-wrap">
          <ExperimentCanvas
            ref="canvasRef"
            :draw="drawScene"
            :state="sim"
            :scale="1"
            @resize="handleCanvasResize"
          />
          <!-- 汽油机 vs 柴油机对比卡片 -->
          <div class="compare-card">
            <div class="cc-title">⚖️ 汽油机 vs 柴油机</div>
            <div class="cc-row"><span class="cc-k">点火方式</span><span class="cc-v">火花塞点燃 / 压缩自燃</span></div>
            <div class="cc-row"><span class="cc-k">燃料</span><span class="cc-v">汽油 / 柴油</span></div>
            <div class="cc-row"><span class="cc-k">压缩比</span><span class="cc-v">较小 ≈8:1 / 较大 ≈16:1</span></div>
            <div class="cc-row"><span class="cc-k">吸气成分</span><span class="cc-v">空气+汽油混合气 / 纯空气</span></div>
          </div>
        </div>
      </template>

      <!-- 右侧：实时数据 -->
      <template #data>
        <div class="he-data">
          <div class="data-group phase-card" :class="'ph-' + sim.phase">
            <div class="phase-icon">{{ phaseInfo.icon }}</div>
            <div class="phase-name">{{ phaseInfo.name }}冲程</div>
            <div class="phase-desc">{{ phaseInfo.desc }}</div>
            <div class="phase-energy">{{ phaseInfo.energy }}</div>
            <div class="progress">
              <div class="bar" :style="{ width: strokePct + '%' }"></div>
            </div>
            <div class="phase-order">冲程 {{ phaseIndex }}/4 · 循环 #{{ cycleDisplay }}</div>
          </div>

          <div class="data-group">
            <div class="group-title">⚙️ 曲轴与活塞</div>
            <div class="stat-line">曲轴转角：{{ thetaDisplay }}° <span class="dim">(0~720° / 循环)</span></div>
            <div class="stat-line">活塞位置：{{ pistonPct }}% <span class="dim">(0% 上止点 / 100% 下止点)</span></div>
            <div class="stat-line">活塞运动：{{ pistonDirText }}</div>
          </div>

          <div class="data-group">
            <div class="group-title">🌡 缸内状态</div>
            <div class="stat-line">缸内温度：{{ sim.temp.toFixed(0) }}℃</div>
            <div class="stat-line">粒子数量：{{ particles.length }} <span class="dim">({{ sim.engineType === 'diesel' ? '空气 + 喷入柴油' : '空气+汽油混合气' }})</span></div>
            <div class="stat-line">气门：{{ valveText }}</div>
            <div class="stat-line">运转时间：{{ sim.simTime.toFixed(1) }} s</div>
          </div>

          <div class="data-group">
            <div class="group-title">🔁 循环统计</div>
            <div class="stat-line">完成循环：{{ sim.cycleCount }} 次</div>
            <div class="stat-line">对外做功：{{ sim.workCount }} 次</div>
            <p class="sub-tip">每 4 个冲程（曲轴 2 圈）做功 1 次</p>
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
              <li v-for="(f, i) in config.theory.formulas" :key="i">
                <strong>{{ f.name }}：</strong>{{ f.expr }}（{{ f.desc }}）
              </li>
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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import ExperimentLayout from '@/layouts/ExperimentLayout.vue'
import ExperimentCanvas from '@/components/ExperimentCanvas.vue'
import { heatEngineConfig } from '@/config/experiments/heat/heatEngine.js'
import { applyThermalMotion, bounceInBox, thermalIntensity, pistonPhase, pistonPos, strokeProgress, valveState } from '@/utils/physics/physicsUtils.js'

const config = heatEngineConfig

// ==========================================
// 运行状态
// ==========================================
const particles = reactive([])
const sim = reactive({
  particles,
  engineType: 'gasoline', // gasoline | diesel
  mode: 'step',           // step | auto
  speed: 1,               // 0.5 ~ 2.0
  animState: 'idle',      // idle | running | paused
  theta: 0,               // 曲轴转角 0~720
  phase: 'intake',
  temp: 27,
  spark: 0,               // 火花强度 0~1
  inject: 0,              // 喷油强度 0~1
  cycleCount: 0,
  workCount: 0,
  simTime: 0,
  clock: 0
})

const stepRunning = ref(false)
const stepTarget = ref(0)
let prevPhase = 'intake'

// 粒子规模：空气 48 + 柴油喷入 12（比 20 更饱满，性能无压力）
const N_AIR = 48
const N_FUEL = 12
const T_MIN = 20
const T_MAX = 1500

// 温度 → 目标速率：27℃≈31px/s，1500℃≈120px/s（做功冲程爆速）
const speedForTemp = (T) => 30 + thermalIntensity(T, T_MIN, T_MAX) * 90

// ==========================================
// 冲程信息表（吸压做排）
// ==========================================
const PHASE_INFO = {
  intake:  { icon: '🌬', name: '吸气', desc: '进气门开、排气门关，活塞下行吸入混合气', energy: '无能量转化' },
  compress:{ icon: '🗜', name: '压缩', desc: '两门关闭，活塞上行压缩混合气，温度升高', energy: '机械能 → 内能' },
  power:   { icon: '💥', name: '做功', desc: '点火/压燃，燃气膨胀推动活塞下行对外做功', energy: '内能 → 机械能' },
  exhaust: { icon: '💨', name: '排气', desc: '排气门开、进气门关，活塞上行排出废气', energy: '无能量转化' }
}

const phaseInfo = computed(() => PHASE_INFO[sim.phase])
const phaseIndex = computed(() => ['intake', 'compress', 'power', 'exhaust'].indexOf(sim.phase) + 1)
const strokePct = computed(() => Math.round(strokeProgress(sim.theta) * 100))
const thetaDisplay = computed(() => Math.round(sim.theta))
const pistonPct = computed(() => Math.round(pistonPos(sim.theta) * 100))
const cycleDisplay = computed(() => sim.cycleCount + 1)

const pistonDirText = computed(() => {
  const p = pistonPos(sim.theta)
  const dir = sim.phase === 'intake' || sim.phase === 'power' ? '下行 ⬇' : '上行 ⬆'
  return dir
})

const valveText = computed(() => {
  const v = valveState(sim.phase)
  if (v.intakeOpen) return '进气门开 · 排气门关'
  if (v.exhaustOpen) return '进气门关 · 排气门开'
  return '两门均关闭'
})

const engineTypeText = computed(() =>
  sim.engineType === 'gasoline' ? '火花塞点燃 · 吸入空气与汽油的混合气' : '喷油嘴压燃 · 吸入纯空气，压缩末喷入柴油'
)

// ==========================================
// 画布几何
// ==========================================
const canvasW = ref(0)
const canvasH = ref(0)
let geo = null

function handleCanvasResize(ev) {
  const isObj = typeof ev === 'object' && ev !== null
  const w = isObj ? ev.width : ev
  const h = isObj ? ev.height : ev
  canvasW.value = w
  canvasH.value = h
  geo = getGeo(w, h)
}

function getGeo(w, h) {
  if (w < 60 || h < 60) return null
  const cx = w * 0.40
  const cylW = Math.min(w * 0.32, 250)
  const wall = 6
  const headY = h * 0.18        // 缸盖下沿
  const headTop = h * 0.05      // 缸盖顶部
  const tdcY = h * 0.44         // 上止点活塞顶
  const bdcY = h * 0.70         // 下止点活塞顶
  const flyCY = h * 0.87
  const flyR = Math.min(h * 0.10, 58)
  return {
    w, h, cx, cylW, wall, headY, headTop, tdcY, bdcY, flyCY, flyR,
    x0: cx - cylW / 2,
    x1: cx + cylW / 2,
    strokeLen: bdcY - tdcY,
    valveLift: 13
  }
}

function pistonTopY(g, theta) {
  return g.tdcY + pistonPos(theta) * g.strokeLen
}

function cylinderBounds(g, theta) {
  const py = pistonTopY(g, theta)
  return { x0: g.x0 + g.wall + 2, x1: g.x1 - g.wall - 2, y0: g.headY + 8, y1: py - 4 }
}

// ==========================================
// 粒子系统
// ==========================================
function spawnParticle(g, kind) {
  const size = 2.2 + Math.random() * 0.9
  particles.push(reactive({
    kind,
    x: g.x0 + g.wall + 4 + size + Math.random() * (g.cylW - g.wall * 2 - 8 - size * 2),
    y: g.headY + 10 + Math.random() * 8,
    vx: (Math.random() - 0.5) * 40,
    vy: 40 + Math.random() * 50, // 进气向下
    size
  }))
}

function updateParticles(dt) {
  const g = geo
  if (!g) return
  const ph = sim.phase
  if (ph === 'intake') {
    // 吸气：粒子逐渐涌入（约 0.9s 充满，匹配冲程 1s 时长）
    if (particles.length < N_AIR) {
      const n = Math.min(N_AIR - particles.length, Math.ceil(N_AIR * dt * 1.2) + 1)
      for (let i = 0; i < n; i++) spawnParticle(g, 'air')
    }
  } else if (ph === 'exhaust') {
    // 排气：粒子逐渐排出（约 0.8s 排空），并向上飘向排气门
    const n = Math.min(particles.length, Math.ceil(60 * dt))
    for (let i = 0; i < n; i++) particles.splice(Math.floor(Math.random() * particles.length), 1)
    for (const p of particles) p.vy -= 60 * dt
  } else if (ph === 'compress' && sim.engineType === 'diesel' && strokeProgress(sim.theta) > 0.82) {
    // 柴油机：压缩末喷入柴油（压燃准备，0.18s 窗口内补满）
    const fuelCount = particles.filter(p => p.kind === 'fuel').length
    if (fuelCount < N_FUEL) {
      sim.inject = 1
      const n = Math.min(N_FUEL - fuelCount, Math.ceil(70 * dt) + 1)
      for (let i = 0; i < n; i++) spawnParticle(g, 'fuel')
    }
  }
}

function moveParticles(dt) {
  const g = geo
  if (!g) return
  const b = cylinderBounds(g, sim.theta)
  const spd = speedForTemp(sim.temp)
  for (const p of particles) {
    applyThermalMotion(p, dt, spd, 2.2)
    bounceInBox(p, b.x0, b.y0, b.x1, b.y1, 0.65)
  }
}

function boostParticles(factor) {
  for (const p of particles) {
    p.vx *= factor
    p.vy *= factor
  }
}

// ==========================================
// 温度 / 冲程切换 / 特效
// ==========================================
function updateTemp() {
  const k = strokeProgress(sim.theta)
  if (sim.phase === 'intake') {
    sim.temp = 27
  } else if (sim.phase === 'compress') {
    const maxT = sim.engineType === 'diesel' ? 330 : 200 // 柴油压缩比大，可达压燃温度
    sim.temp = 27 + (maxT - 27) * k
  } else if (sim.phase === 'power') {
    sim.temp = 1500 - (1500 - 600) * k // 点火瞬间 1500℃，膨胀降温
  } else {
    sim.temp = 600 - (600 - 150) * k   // 排气降温
  }
}

function checkPhaseChange() {
  const cur = pistonPhase(sim.theta)
  if (cur !== prevPhase) {
    onPhaseChange(prevPhase, cur)
    prevPhase = cur
    sim.phase = cur
  }
}

function onPhaseChange(from, to) {
  if (to === 'power') {
    if (sim.engineType === 'gasoline') sim.spark = 1
    boostParticles(2.2) // 爆炸脉冲
    sim.workCount++
  }
  if (to === 'intake') {
    sim.cycleCount++
    particles.length = 0 // 废气排净，新循环从零开始吸气
  }
}

function updateFX(dt) {
  sim.spark = Math.max(0, sim.spark - dt * 3)
  sim.inject = Math.max(0, sim.inject - dt * 3)
}

// ==========================================
// 主循环（RAF）
// ==========================================
let rafId = null
let lastTs = 0

function loop(ts) {
  const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0.016)
  lastTs = ts

  const advancing = sim.animState === 'running' || stepRunning.value
  if (advancing) {
    const dTheta = 180 * sim.speed * dt // 每冲程 1s @1x
    sim.theta += dTheta
    if (stepRunning.value && sim.theta >= stepTarget.value) {
      sim.theta = stepTarget.value % 720
      stepRunning.value = false
    }
    sim.theta %= 720
    if (sim.animState === 'running') sim.simTime += dt
  }

  checkPhaseChange()
  updateTemp()
  if (advancing) updateParticles(dt) // 粒子增删只在冲程播放时进行（idle 时分子仍做热运动）
  updateFX(dt)
  moveParticles(dt)
  sim.clock += dt
  rafId = requestAnimationFrame(loop)
}

// ==========================================
// 控制事件
// ==========================================
const dbg = (tag) => console.log(`[DBG2] ${tag} theta=${sim.theta.toFixed(1)} work=${sim.workCount} cyc=${sim.cycleCount} mode=${sim.mode} A=${sim.animState} step=${stepRunning.value} stepT=${stepTarget.value}`)

function handleStart() {
  dbg('handleStart')
  if (sim.mode === 'step') {
    // 单步模式：开始按钮 = 播放下一步冲程
    nextStep()
    return
  }
  if (sim.animState !== 'running') {
    sim.animState = 'running'
  }
}

function handlePause() {
  dbg('handlePause')
  if (sim.mode === 'auto') {
    sim.animState = 'paused'
  }
  stepRunning.value = false
}

function handleReset() {
  dbg('handleReset')
  resetAll()
}

function resetAll() {
  sim.theta = 0
  sim.phase = 'intake'
  prevPhase = 'intake'
  sim.temp = 27
  sim.spark = 0
  sim.inject = 0
  sim.cycleCount = 0
  sim.workCount = 0
  sim.simTime = 0
  sim.animState = 'idle'
  particles.length = 0
  stepRunning.value = false
  stepTarget.value = 0
}

function nextStep() {
  dbg('nextStep')
  if (sim.mode !== 'step' || stepRunning.value) return
  stepTarget.value = (Math.floor(sim.theta / 180) + 1) * 180
  stepRunning.value = true
}

function switchEngine(type) {
  dbg('switchEngine '+type)
  if (sim.engineType === type) return
  sim.engineType = type
  resetAll()
}

function switchMode(mode) {
  dbg('switchMode '+mode)
  if (sim.mode === mode) return
  sim.mode = mode
  stepRunning.value = false
  sim.animState = 'idle'
}

// ==========================================
// 绘制
// ==========================================
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawScene(ctx, s) {
  const g = geo
  if (!g) return
  const { w, h, cx } = g
  ctx.clearRect(0, 0, w, h)

  // ---- 背景 ----
  ctx.fillStyle = '#f6f8fc'
  ctx.fillRect(0, 0, w, h)

  const py = pistonTopY(g, s.theta)
  const valves = valveState(s.phase)
  const hot = thermalIntensity(s.temp, T_MIN, T_MAX)

  // ---- 飞轮 / 曲轴 ----
  const flyCX = cx
  const flyCY = g.flyCY
  const ang = -s.theta * Math.PI / 180
  const pinX = flyCX + Math.cos(ang) * g.flyR * 0.55
  const pinY = flyCY + Math.sin(ang) * g.flyR * 0.55

  ctx.fillStyle = '#374151'
  ctx.beginPath()
  ctx.arc(flyCX, flyCY, g.flyR, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(flyCX, flyCY, g.flyR, 0, Math.PI * 2)
  ctx.stroke()
  // 辐条
  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    const a = ang + i * Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(flyCX, flyCY)
    ctx.lineTo(flyCX + Math.cos(a) * g.flyR * 0.9, flyCY + Math.sin(a) * g.flyR * 0.9)
    ctx.stroke()
  }
  // 曲轴销
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.arc(pinX, pinY, 5, 0, Math.PI * 2)
  ctx.fill()
  // 飞轮轴心
  ctx.fillStyle = '#d1d5db'
  ctx.beginPath()
  ctx.arc(flyCX, flyCY, 6, 0, Math.PI * 2)
  ctx.fill()

  // ---- 连杆 ----
  const pistonBottomY = py + 18
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(cx, pistonBottomY)
  ctx.lineTo(pinX, pinY)
  ctx.stroke()

  // ---- 缸体 ----
  // 缸壁
  ctx.fillStyle = '#9ca3af'
  ctx.fillRect(g.x0 - g.wall, g.headY - 6, g.wall, py - g.headY + 24)
  ctx.fillRect(g.x1, g.headY - 6, g.wall, py - g.headY + 24)
  // 缸盖
  ctx.fillStyle = '#6b7280'
  ctx.fillRect(g.x0 - g.wall, g.headTop, g.cylW + g.wall * 2, g.headY - g.headTop + 6)
  // 缸内底色
  ctx.fillStyle = hot > 0.35 ? `rgba(255, ${Math.round(230 - hot * 120)}, ${Math.round(220 - hot * 180)}, 0.35)` : 'rgba(230, 240, 255, 0.5)'
  ctx.fillRect(g.x0, g.headY, g.cylW, py - g.headY)

  // ---- 进气道 / 排气道 ----
  const inX = cx - g.cylW * 0.24
  const exX = cx + g.cylW * 0.24
  const ductW = 16
  const ductH = 18
  ctx.fillStyle = '#cbd5e1'
  ctx.fillRect(inX - ductW / 2, g.headTop - ductH, ductW, ductH + 4)
  ctx.fillRect(exX - ductW / 2, g.headTop - ductH, ductW, ductH + 4)
  // 气流箭头
  ctx.fillStyle = '#3b82f6'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  if (valves.intakeOpen) {
    ctx.fillText('↓', inX, g.headTop - ductH - 3)
  }
  if (valves.exhaustOpen) {
    ctx.fillStyle = '#ef4444'
    ctx.fillText('↑', exX, g.headTop - ductH - 3)
  }

  // ---- 气门 ----
  const drawValve = (vx, open) => {
    const lift = open ? g.valveLift : 0
    const stemY = g.headTop - ductH + (open ? -lift : 0)
    const discY = g.headY + 3 - (open ? lift : 0)
    ctx.strokeStyle = '#4b5563'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(vx, stemY)
    ctx.lineTo(vx, discY)
    ctx.stroke()
    ctx.fillStyle = open ? '#22c55e' : '#ef4444'
    roundRectPath(ctx, vx - 7, discY, 14, 6, 2)
    ctx.fill()
  }
  drawValve(inX, valves.intakeOpen)
  drawValve(exX, valves.exhaustOpen)

  // ---- 火花塞（汽油机）/ 喷油嘴（柴油机） ----
  if (s.engineType === 'gasoline') {
    // 火花塞：陶瓷体 + 电极
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(cx - 4, g.headTop + 2, 8, g.headY - g.headTop - 8)
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(cx - 1.5, g.headY - 8, 3, 10)
    ctx.fillStyle = '#64748b'
    ctx.fillRect(cx - 6, g.headY - 2, 12, 3)
  } else {
    // 喷油嘴
    ctx.fillStyle = '#334155'
    ctx.fillRect(cx - 5, g.headTop + 2, 10, g.headY - g.headTop - 6)
    ctx.beginPath()
    ctx.moveTo(cx - 4, g.headY - 2)
    ctx.lineTo(cx + 4, g.headY - 2)
    ctx.lineTo(cx, g.headY + 5)
    ctx.closePath()
    ctx.fill()
  }

  // ---- 缸内粒子 ----
  for (const p of particles) {
    const base = p.kind === 'fuel' ? [150, 92, 45] : [150, 195, 240]
    const r = Math.round(base[0] + (255 - base[0]) * hot * 0.75)
    const gg = Math.round(base[1] - base[1] * hot * 0.55)
    const b = Math.round(base[2] - base[2] * hot * 0.8)
    ctx.fillStyle = `rgb(${r}, ${gg}, ${b})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }

  // ---- 火花效果（汽油机点火） ----
  if (s.spark > 0 && s.engineType === 'gasoline' && isFinite(cx) && isFinite(s.spark)) {
    const sr = 10 + s.spark * 14
    const grad = ctx.createRadialGradient(cx, g.headY + 4, 1, cx, g.headY + 4, sr)
    grad.addColorStop(0, `rgba(255, 235, 120, ${0.95 * s.spark})`)
    grad.addColorStop(1, 'rgba(255, 180, 40, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, g.headY + 4, sr, 0, Math.PI * 2)
    ctx.fill()
    // 放射线
    ctx.strokeStyle = `rgba(255, 220, 80, ${0.9 * s.spark})`
    ctx.lineWidth = 2
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + sim.clock * 4
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * 6, g.headY + 4 + Math.sin(a) * 6)
      ctx.lineTo(cx + Math.cos(a) * (10 + s.spark * 16), g.headY + 4 + Math.sin(a) * (10 + s.spark * 16))
      ctx.stroke()
    }
  }

  // ---- 喷油效果（柴油机压缩末） ----
  if (s.inject > 0 && s.engineType === 'diesel') {
    ctx.fillStyle = `rgba(139, 90, 43, ${0.85 * s.inject})`
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 2 + (Math.random() - 0.5) * 1.2
      const rr = 4 + Math.random() * 16 * s.inject
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * rr * 0.4, g.headY + 2 + Math.sin(a) * rr, 2 + Math.random() * 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ---- 活塞 ----
  ctx.fillStyle = '#475569'
  roundRectPath(ctx, cx - g.cylW / 2 + 2, py, g.cylW - 4, 18, 3)
  ctx.fill()
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 1
  ctx.stroke()
  // 活塞环
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx - g.cylW / 2 + 6, py + 5)
  ctx.lineTo(cx + g.cylW / 2 - 6, py + 5)
  ctx.moveTo(cx - g.cylW / 2 + 6, py + 9)
  ctx.lineTo(cx + g.cylW / 2 - 6, py + 9)
  ctx.stroke()

  // ---- 冲程标签（缸体右侧） ----
  const info = PHASE_INFO[s.phase]
  const lx = g.x1 + 26
  ctx.textAlign = 'left'
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 20px sans-serif'
  ctx.fillText(`${info.icon} ${info.name}冲程`, lx, g.headY + 20)
  ctx.font = '13px sans-serif'
  ctx.fillStyle = '#4b5563'
  ctx.fillText(`活塞${s.phase === 'intake' || s.phase === 'power' ? '下行 ⬇' : '上行 ⬆'}`, lx, g.headY + 44)
  ctx.fillText(valveText.value, lx, g.headY + 64)
  ctx.fillStyle = hot > 0.5 ? '#dc2626' : '#2563eb'
  ctx.fillText(`缸温 ${s.temp.toFixed(0)}℃`, lx, g.headY + 84)
  ctx.fillStyle = '#6b7280'
  ctx.font = '12px sans-serif'
  ctx.fillText(`循环 ${sim.cycleCount + 1} · 做功 ${sim.workCount} 次`, lx, g.headY + 104)
}

// ==========================================
// 生命周期
// ==========================================
onMounted(() => {
  rafId = requestAnimationFrame(loop)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped lang="scss">
.he-experiment {
  width: 100%;
}

.he-control {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ctrl-group {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
}

.group-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}

.btn-row {
  display: flex;
  gap: 8px;
}

.type-btn, .mode-btn {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1.5px solid #cbd5e1;
  background: #fff;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &.active {
    background: #2563eb;
    border-color: #2563eb;
    color: #fff;
  }

  &:hover:not(.active) {
    border-color: #2563eb;
    color: #2563eb;
  }
}

.action-btn {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: #e2e8f0;
  color: #334155;

  &.primary {
    background: #2563eb;
    color: #fff;

    &:hover:not(:disabled) {
      background: #1d4ed8;
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.sub-info {
  margin: 8px 0 0;
  font-size: 12px;
  color: #64748b;
}

.speed-slider {
  width: 100%;
  accent-color: #2563eb;
}

.speed-val {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
  margin-top: 2px;
}

.control-tip {
  font-size: 12px;
  color: #64748b;
  background: #eff6ff;
  border-radius: 8px;
  padding: 8px 10px;
  line-height: 1.5;
}

// ---- 画布 + 对比卡片 ----
.canvas-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

.compare-card {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 11px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  z-index: 5;
  min-width: 190px;

  .cc-title {
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 5px;
    font-size: 12px;
  }

  .cc-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 2px 0;
    color: #475569;

    .cc-k {
      color: #64748b;
      flex-shrink: 0;
    }
  }
}

// ---- 数据面板 ----
.he-data {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.data-group {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}

.stat-line {
  font-size: 13px;
  color: #475569;
  padding: 2.5px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.dim {
  color: #94a3b8;
  font-size: 11px;
}

.sub-tip {
  font-size: 11px;
  color: #94a3b8;
  margin: 6px 0 0;
}

// 当前冲程大卡
.phase-card {
  text-align: center;
  padding: 14px 12px;
  border-left: 4px solid #2563eb;
  transition: border-color 0.3s;

  &.ph-intake { border-left-color: #3b82f6; }
  &.ph-compress { border-left-color: #f59e0b; }
  &.ph-power { border-left-color: #ef4444; }
  &.ph-exhaust { border-left-color: #64748b; }

  .phase-icon {
    font-size: 28px;
  }

  .phase-name {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 4px 0;
  }

  .phase-desc {
    font-size: 12px;
    color: #64748b;
    line-height: 1.4;
  }

  .phase-energy {
    display: inline-block;
    margin-top: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #2563eb;
    background: #eff6ff;
    border-radius: 20px;
    padding: 3px 12px;
  }

  .progress {
    height: 6px;
    background: #e2e8f0;
    border-radius: 3px;
    margin-top: 10px;
    overflow: hidden;

    .bar {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #ef4444);
      transition: width 0.1s linear;
    }
  }

  .phase-order {
    margin-top: 6px;
    font-size: 11px;
    color: #94a3b8;
  }
}

// ---- 理论 ----
.theory-content {
  p {
    font-size: 13px;
    line-height: 1.7;
    color: #475569;
    margin: 0 0 8px;
  }

  h4 {
    font-size: 14px;
    color: #1e293b;
    margin: 0 0 6px;
  }

  .formula-block, .keypoint-block {
    background: #f8fafc;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
  }

  ul {
    margin: 0;
    padding-left: 18px;
  }

  li {
    font-size: 13px;
    color: #475569;
    line-height: 1.7;
  }

  .notes {
    font-size: 12px;
    color: #94a3b8;
  }
}
</style>
