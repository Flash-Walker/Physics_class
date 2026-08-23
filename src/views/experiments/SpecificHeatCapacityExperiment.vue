<template>
  <div class="shc-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="sim.animState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：场景切换 + 实验控制 -->
      <template #control>
        <div class="shc-control">
          <div class="ctrl-group">
            <div class="group-label">🎛 实验场景</div>
            <div class="scene-grid">
              <button class="scene-btn" :class="{ active: sim.scene === 'heat' }" @click="switchScene('heat')">
                🔥 对比加热
              </button>
              <button class="scene-btn" :class="{ active: sim.scene === 'life' }" @click="switchScene('life')">
                🌊 生活应用
              </button>
            </div>
            <p class="sub-info">{{ sim.scene === 'heat' ? '等质量水与不同物质，同火力酒精灯同时加热' : '白天太阳加热 / 夜晚自然散热：昼夜温差对比' }}</p>
          </div>

          <!-- 场景1：对比加热控制 -->
          <template v-if="sim.scene === 'heat'">
            <div class="ctrl-group">
              <div class="group-label">🧪 右杯物质</div>
              <div class="mat-grid">
                <button v-for="m in MAT_LIST" :key="m.id" class="mat-btn" :class="{ active: sim.rightMat === m.id }" @click="setRightMat(m.id)">
                  {{ m.label }}
                </button>
              </div>
              <p class="sub-info">左杯固定为水（比热容 4.2×10³ J/(kg·℃)）</p>
            </div>
            <div class="ctrl-group">
              <div class="group-label">⚖️ 液体质量：{{ sim.massG }} g</div>
              <input type="range" class="shc-slider" min="10" max="1000" step="10" :value="sim.massG" @input="setMass(Number($event.target.value))" />
              <div class="slider-labels"><span>10g</span><span>1000g</span></div>
            </div>
            <div class="ctrl-group">
              <div class="group-label">🔥 火力（功率 {{ powerW }} W）</div>
              <input type="range" class="shc-slider" min="1" max="10" step="1" :value="sim.firePower" @input="setFire(Number($event.target.value))" />
              <div class="slider-labels"><span>小火 50W</span><span>大火 500W</span></div>
            </div>
            <div class="ctrl-group">
              <div class="group-label">🔌 能量传输效率：{{ sim.eta }}%</div>
              <input type="range" class="shc-slider" min="1" max="100" step="1" :value="sim.eta" @input="setEta(Number($event.target.value))" />
              <div class="slider-labels"><span>1%</span><span>100%</span></div>
              <p class="sub-info">效率越低，热量散失越多，升温越慢（默认 10% 贴近真实）</p>
            </div>
            <div class="ctrl-group">
              <button class="action-btn heat" :class="{ on: sim.heatOn }" @click="sim.heatOn = !sim.heatOn">
                {{ sim.heatOn ? '🔥 熄灭酒精灯（撤火冷却）' : '点燃酒精灯' }}
              </button>
              <p class="control-tip">① 点燃酒精灯 → ② 点「开始」计时加热 → ③ 对比两杯升温快慢；加热中可随时撤火观察冷却</p>
            </div>
          </template>

          <!-- 场景2：生活应用控制 -->
          <template v-else>
            <div class="ctrl-group">
              <div class="group-label">🌗 昼夜切换（手动）</div>
              <div class="scene-grid">
                <button class="scene-btn" :class="{ active: sim.dayNight === 'day' }" @click="setDayNight('day')">☀ 白天</button>
                <button class="scene-btn" :class="{ active: sim.dayNight === 'night' }" @click="setDayNight('night')">🌙 夜晚</button>
              </div>
              <p class="sub-info">白天太阳加热，夜晚自然散热——观察谁的温度波动大</p>
            </div>
            <div class="ctrl-group">
              <div class="group-label">🔄 自动演示（3 个昼夜周期）</div>
              <button class="action-btn" :disabled="sim.autoCycle" @click="startAutoCycle">
                {{ sim.autoCycle ? '⏳ 演示进行中…' : '▶ 开始自动演示' }}
              </button>
              <p class="control-tip">演示结束自动暂停，对比水与砂石的昼夜温差</p>
            </div>
            <div class="ctrl-group">
              <div class="group-label">🧪 右杯物质</div>
              <div class="mat-grid">
                <button v-for="m in MAT_LIST" :key="m.id" class="mat-btn" :class="{ active: sim.rightMat === m.id }" @click="setRightMat(m.id)">
                  {{ m.label }}
                </button>
              </div>
              <p class="sub-info">默认砂石（比热容小）：模拟沿海 vs 沙漠</p>
            </div>
            <div class="ctrl-group">
              <div class="group-label">⚖️ 液体质量：{{ sim.massG }} g</div>
              <input type="range" class="shc-slider" min="10" max="1000" step="10" :value="sim.massG" @input="setMass(Number($event.target.value))" />
              <div class="slider-labels"><span>10g</span><span>1000g</span></div>
            </div>
            <div class="ctrl-group">
              <div class="group-label">☀ 太阳辐射功率：2000 W（固定）· 🔌 效率 {{ sim.eta }}%</div>
              <input type="range" class="shc-slider" min="1" max="100" step="1" :value="sim.eta" @input="setEta(Number($event.target.value))" />
              <div class="slider-labels"><span>效率 1%</span><span>效率 100%</span></div>
            </div>
          </template>
        </div>
      </template>

      <!-- 中部：画布 -->
      <template #canvas>
        <ExperimentCanvas ref="canvasRef" :draw="drawScene" :state="sim" @resize="handleCanvasResize" />
      </template>

      <!-- 右侧：数据面板 -->
      <template #data>
        <div class="shc-data">
          <!-- 场景1 数据 -->
          <template v-if="sim.scene === 'heat'">
            <div class="data-group">
              <div class="group-title">⏱ 加热进程</div>
              <div class="stat-line">模拟时间：{{ sim.simTime.toFixed(0) }} s（×60 加速）</div>
              <div class="stat-line">加热功率：{{ powerW }} W · 效率 {{ sim.eta }}%</div>
              <div class="stat-line">实际吸收热量：Q = {{ sim.heatQ.toFixed(0) }} J（两杯相同）</div>
            </div>
            <div class="data-group">
              <div class="group-title">💧 左杯 · 水</div>
              <div class="stat-line">温度：{{ sim.tempL.toFixed(1) }} ℃（Δ{{ dtL.toFixed(1) }} ℃）</div>
              <div class="stat-line">反算比热容：{{ cMeasL !== null ? Math.round(cMeasL) + ' J/(kg·℃)' : '--' }}</div>
              <div class="stat-line">标准值：4200 J/(kg·℃)</div>
            </div>
            <div class="data-group">
              <div class="group-title">🧪 右杯 · {{ rightName }}</div>
              <div class="stat-line">温度：{{ sim.tempR.toFixed(1) }} ℃（Δ{{ dtR.toFixed(1) }} ℃）</div>
              <div class="stat-line">反算比热容：{{ cMeasR !== null ? Math.round(cMeasR) + ' J/(kg·℃)' : '--' }}</div>
              <div class="stat-line">标准值：{{ cStd }} J/(kg·℃)</div>
            </div>
            <div class="data-group">
              <div class="group-title">📊 实验结论</div>
              <p class="conclusion-text">{{ conclusionText }}</p>
            </div>
          </template>

          <!-- 场景2 数据 -->
          <template v-else>
            <div class="data-group">
              <div class="group-title">🌗 昼夜循环</div>
              <div class="stat-line">当前：{{ sim.dayNight === 'day' ? '☀ 白天（加热）' : '🌙 夜晚（散热）' }}</div>
              <div class="stat-line">完成周期：{{ sim.cycleCount }} {{ sim.autoCycle ? '/ 3' : '' }}</div>
              <div class="stat-line">模拟时间：{{ sim.simTime.toFixed(0) }} s（×60 加速）</div>
            </div>
            <div class="data-group" v-if="lifeLast">
              <div class="group-title">🌡 最近一个周期的温差</div>
              <div class="stat-line">💧 水：白天 {{ lifeLast.dayPeakL.toFixed(1) }}℃ → 夜晚 {{ lifeLast.nightLowL.toFixed(1) }}℃</div>
              <div class="stat-line">　温差：{{ (lifeLast.dayPeakL - lifeLast.nightLowL).toFixed(1) }} ℃</div>
              <div class="stat-line">🧪 {{ rightName }}：白天 {{ lifeLast.dayPeakR.toFixed(1) }}℃ → 夜晚 {{ lifeLast.nightLowR.toFixed(1) }}℃</div>
              <div class="stat-line">　温差：{{ (lifeLast.dayPeakR - lifeLast.nightLowR).toFixed(1) }} ℃</div>
            </div>
            <div class="data-group">
              <div class="group-title">📊 实验结论</div>
              <p class="conclusion-text">{{ lifeConclusionText }}</p>
            </div>
          </template>
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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import ExperimentLayout from '@/layouts/ExperimentLayout.vue'
import ExperimentCanvas from '@/components/ExperimentCanvas.vue'
import { specificHeatCapacityConfig } from '@/config/experiments/heat/specificHeatCapacity.js'
import { applyThermalMotion, bounceInBox, thermalIntensity, tempRise, heatAbsorbed, specificHeatFromData, coolStep } from '@/utils/physics/physicsUtils.js'

const config = specificHeatCapacityConfig

// ==========================================
// 物质参数表（比热容标准值 J/(kg·℃)）
// ==========================================
const MATERIALS = {
  water:    { name: '水',     c: 4200, color: '#4aa3ff', particle: '#9fd0ff' },
  oil:      { name: '食用油', c: 2000, color: '#f5b83d', particle: '#ffd98c' },
  sand:     { name: '砂石',   c: 920,  color: '#b08d57', particle: '#d4b68a' },
  kerosene: { name: '煤油',   c: 2100, color: '#ff8c42', particle: '#ffc08a' },
  alcohol:  { name: '酒精',   c: 2400, color: '#b388ff', particle: '#dcc8ff' }
}
const MAT_LIST = [
  { id: 'oil', label: '食用油' },
  { id: 'sand', label: '砂石' },
  { id: 'kerosene', label: '煤油' },
  { id: 'alcohol', label: '酒精' }
]

// ==========================================
// 物理参数
// ==========================================
const SIM_ACCEL = 60        // 模拟时间加速：1 真实秒 = 1 模拟分钟
const T0 = 20               // 室温 / 初始温度 ℃
const T_MAX = 95            // 温度上限（水接近沸点，统一上限保证公平）
const LOSS_COEFF = 2      // 散热系数 W/℃（牛顿冷却）
const SUN_POWER = 2000          // 场景2 太阳辐射功率 W（固定，替代酒精灯）
const DAY_LEN = 25          // 白天时长（模拟秒）
const NIGHT_LEN = 30        // 夜晚时长（模拟秒）
const AUTO_CYCLES = 3       // 自动演示周期数
const SAMPLE_GAP = 2        // 曲线采样间隔（模拟秒）

// ==========================================
// 运行状态（唯一数据源 sim，传给画布触发重绘）
// ==========================================
const sim = reactive({
  scene: 'heat',            // heat 对比加热 / life 生活应用
  animState: 'idle',        // idle / running / paused
  simTime: 0,               // 模拟时间（s）
  massG: 200,               // 液体质量（g）
  firePower: 6,             // 火力 1~10 → 功率 = ×50W
  eta: 10,                  // 能量传输效率 %
  rightMat: 'oil',          // 右杯物质
  tempL: 20, tempR: 20,     // 两杯温度 ℃
  heatOn: false,            // 酒精灯点燃（场景1）
  heatQ: 0,                 // 累计实际吸收热量 Q = ηPt（J）
  dayNight: 'day',          // 场景2 当前时段
  autoCycle: false,         // 自动昼夜演示中
  cycleT: 0,                // 当前时段已持续（模拟秒）
  cycleCount: 0,            // 已完成周期数
  cycleStats: [],           // [{dayPeakL, dayPeakR, nightLowL, nightLowR}]
  peakL: 20, peakR: 20,     // 当前白天峰值
  curve: [],                // [{t, tl, tr, n}] 温度-时间曲线
  lastSampleT: 0,
  clock: 0                  // 全局时钟（火焰/粒子动画）
})

const particles = reactive([])
const canvasW = ref(0)
const canvasH = ref(0)
let geo = null
let lastTs = 0
let rafId = null

// ==========================================
// 计算属性
// ==========================================
const powerW = computed(() => sim.firePower * 50)
const rightName = computed(() => MATERIALS[sim.rightMat].name)
const cStd = computed(() => MATERIALS[sim.rightMat].c)
const dtL = computed(() => sim.tempL - T0)
const dtR = computed(() => sim.tempR - T0)
const cMeasL = computed(() => (sim.heatQ > 0 && dtL.value > 0.5) ? specificHeatFromData(sim.heatQ, sim.massG / 1000, dtL.value) : null)
const cMeasR = computed(() => (sim.heatQ > 0 && dtR.value > 0.5) ? specificHeatFromData(sim.heatQ, sim.massG / 1000, dtR.value) : null)
const lifeLast = computed(() => sim.cycleStats.length ? sim.cycleStats[sim.cycleStats.length - 1] : null)

const conclusionText = computed(() => {
  if (sim.heatQ <= 0) return '点燃酒精灯并点「开始」，观察两杯升温快慢'
  if (dtR.value <= 0.5) return '加热中，等待右杯升温…'
  if (dtL.value < dtR.value) {
    return `相同热量下：水升温慢（Δ${dtL.value.toFixed(1)}℃ < Δ${dtR.value.toFixed(1)}℃）→ 水的吸热能力更强，比热容更大`
  }
  return `水升温 Δ${dtL.value.toFixed(1)}℃、${rightName.value} 升温 Δ${dtR.value.toFixed(1)}℃`
})

const lifeConclusionText = computed(() => {
  if (!lifeLast.value) return '点「开始」并运行至少一个昼夜周期，对比温差'
  const rL = lifeLast.value.dayPeakL - lifeLast.value.nightLowL
  const rR = lifeLast.value.dayPeakR - lifeLast.value.nightLowR
  if (rL < rR) {
    return `水的昼夜温差 ${rL.toFixed(1)}℃ < ${rightName.value}的 ${rR.toFixed(1)}℃ → 水的比热容大，温度变化平缓（沿海地区昼夜温差小；沙漠砂石比热容小，昼夜温差大）`
  }
  return `水温差 ${rL.toFixed(1)}℃、${rightName.value}温差 ${rR.toFixed(1)}℃`
})

// ==========================================
// 几何布局
// ==========================================
function getGeo(w, h) {
  const topH = h * 0.55
  const cupW = w * 0.20
  const cupH = topH * 0.60
  const cupTop = topH * 0.20
  const mk = (cx) => ({ cx, x: cx - cupW / 2, y: cupTop, w: cupW, h: cupH })
  return {
    topH,
    curve: { x0: 58, y0: topH + 26, x1: w - 18, y1: h - 34 },
    left: mk(w * 0.28),
    right: mk(w * 0.72),
    lampL: { cx: w * 0.28, y: cupTop + cupH + 44 },
    lampR: { cx: w * 0.72, y: cupTop + cupH + 44 }
  }
}

// 液体区域（液面高度随质量变化）
function liquidRect(cup) {
  const liquidH = cup.h * (0.22 + 0.68 * sim.massG / 1000)
  return {
    x0: cup.x + 8,
    y0: cup.y + cup.h - liquidH + 4,
    x1: cup.x + cup.w - 8,
    y1: cup.y + cup.h - 6
  }
}

// ==========================================
// 粒子系统（视觉：液体热对流）
// ==========================================
function initParticles() {
  particles.splice(0)
  if (!geo) return
  for (const cup of ['L', 'R']) {
    const c = cup === 'L' ? geo.left : geo.right
    const b = liquidRect(c)
    for (let i = 0; i < 30; i++) {
      particles.push(reactive({
        cup,
        x: b.x0 + Math.random() * (b.x1 - b.x0),
        y: b.y0 + Math.random() * (b.y1 - b.y0),
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        r: 2.2 + Math.random() * 1.8
      }))
    }
  }
}

function updateParticles(dt) {
  if (!geo || particles.length === 0) return
  for (const p of particles) {
    const cup = p.cup === 'L' ? geo.left : geo.right
    const T = p.cup === 'L' ? sim.tempL : sim.tempR
    const spd = 10 + thermalIntensity(T, T0 - 5, T_MAX) * 50
    applyThermalMotion(p, dt, spd, 3)
    const b = liquidRect(cup)
    bounceInBox(p, b.x0, b.y0, b.x1, b.y1, 0.7)
  }
}

// ==========================================
// 物理推进
// ==========================================
function coolBoth(dtSim) {
  const massKg = sim.massG / 1000
  sim.tempL = coolStep(sim.tempL, T0, LOSS_COEFF, massKg, MATERIALS.water.c, dtSim)
  const cr = MATERIALS[sim.rightMat].c
  sim.tempR = coolStep(sim.tempR, T0, LOSS_COEFF, massKg, cr, dtSim)
}

function stepPhysics(dtSim) {
  const massKg = sim.massG / 1000
  const P = powerW.value
  const eta = sim.eta / 100

  if (sim.scene === 'heat') {
    if (sim.heatOn) {
      const Q = heatAbsorbed(P, dtSim, eta)
      sim.heatQ += Q
      sim.tempL = Math.min(T_MAX, sim.tempL + tempRise(Q, massKg, MATERIALS.water.c))
      const cr = MATERIALS[sim.rightMat].c
      sim.tempR = Math.min(T_MAX, sim.tempR + tempRise(Q, massKg, cr))
      if (sim.tempL >= T_MAX && sim.tempR >= T_MAX) sim.heatOn = false
    } else {
      coolBoth(dtSim)
    }
  } else {
    // 生活应用：白天太阳加热 / 夜晚自然冷却
    if (sim.dayNight === 'day') {
      const Q = heatAbsorbed(SUN_POWER, dtSim, eta)
      sim.heatQ += Q
      sim.tempL = Math.min(T_MAX, sim.tempL + tempRise(Q, massKg, MATERIALS.water.c))
      const cr = MATERIALS[sim.rightMat].c
      sim.tempR = Math.min(T_MAX, sim.tempR + tempRise(Q, massKg, cr))
      sim.peakL = Math.max(sim.peakL, sim.tempL)
      sim.peakR = Math.max(sim.peakR, sim.tempR)
    } else {
      coolBoth(dtSim)
    }
  }
}

// 自动昼夜调度
function stepAutoCycle(dtSim) {
  if (!sim.autoCycle || sim.animState !== 'running') return
  sim.cycleT += dtSim
  if (sim.dayNight === 'day' && sim.cycleT >= DAY_LEN) {
    sim.dayNight = 'night'
    sim.cycleT = 0
  } else if (sim.dayNight === 'night' && sim.cycleT >= NIGHT_LEN) {
    finishNight()
    sim.dayNight = 'day'
    sim.cycleT = 0
    if (sim.cycleCount >= AUTO_CYCLES) {
      sim.autoCycle = false
      sim.animState = 'paused'
    }
  }
}

// 夜晚结束：记录本周期峰值/谷值
function finishNight() {
  sim.cycleCount++
  sim.cycleStats.push({
    dayPeakL: sim.peakL,
    dayPeakR: sim.peakR,
    nightLowL: sim.tempL,
    nightLowR: sim.tempR
  })
  sim.peakL = sim.tempL
  sim.peakR = sim.tempR
}

// ==========================================
// 主循环
// ==========================================
function loop(ts) {
  rafId = requestAnimationFrame(loop)
  const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016
  lastTs = ts

  if (sim.animState !== 'paused') {
    sim.clock += dt
    if (sim.animState === 'running') {
      const dtSim = dt * SIM_ACCEL
      sim.simTime += dtSim
      stepPhysics(dtSim)
      stepAutoCycle(dtSim)
      if (sim.simTime - sim.lastSampleT >= SAMPLE_GAP) {
        sim.curve.push({ t: sim.simTime, tl: sim.tempL, tr: sim.tempR, n: sim.scene === 'life' ? sim.dayNight : 'heat' })
        if (sim.curve.length > 900) sim.curve.shift()
        sim.lastSampleT = sim.simTime
      }
    }
    updateParticles(dt)
  }
}

// ==========================================
// 控制事件
// ==========================================
const handleStart = () => { sim.animState = 'running' }
const handlePause = () => { sim.animState = 'paused' }

function resetSim() {
  sim.animState = 'idle'
  sim.simTime = 0
  sim.heatQ = 0
  sim.tempL = T0
  sim.tempR = T0
  sim.heatOn = false
  sim.curve = []
  sim.lastSampleT = 0
  sim.autoCycle = false
  sim.cycleT = 0
  sim.cycleCount = 0
  sim.cycleStats = []
  sim.dayNight = 'day'
  sim.peakL = T0
  sim.peakR = T0
  initParticles()
}
const handleReset = () => { resetSim() }

function switchScene(s) {
  if (s === sim.scene) return
  resetSim()
  sim.scene = s
  if (s === 'life') sim.rightMat = 'sand'
}
function setRightMat(m) { resetSim(); sim.rightMat = m }
function setMass(v) { resetSim(); sim.massG = v }
function setFire(v) { resetSim(); sim.firePower = v }
function setEta(v) { resetSim(); sim.eta = v }

function setDayNight(n) {
  if (sim.scene !== 'life' || n === sim.dayNight) return
  if (sim.dayNight === 'night' && n === 'day') finishNight()
  sim.dayNight = n
}

function startAutoCycle() {
  resetSim()
  sim.autoCycle = true
  sim.animState = 'running'
}

function handleCanvasResize({ width, height }) {
  canvasW.value = width
  canvasH.value = height
  geo = getGeo(width, height)
  if (particles.length === 0) initParticles()
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

function drawCup(ctx, cup, mat, temp) {
  const m = MATERIALS[mat]
  const liquidH = cup.h * (0.22 + 0.68 * sim.massG / 1000)
  const liqTop = cup.y + cup.h - liquidH

  // 杯壁
  ctx.fillStyle = 'rgba(210,228,242,0.4)'
  roundRectPath(ctx, cup.x, cup.y, cup.w, cup.h, 6)
  ctx.fill()
  ctx.strokeStyle = 'rgba(110,145,175,0.85)'
  ctx.lineWidth = 2
  roundRectPath(ctx, cup.x, cup.y, cup.w, cup.h, 6)
  ctx.stroke()

  // 液体 + 粒子
  ctx.save()
  roundRectPath(ctx, cup.x + 3, liqTop, cup.w - 6, liquidH - 3, 4)
  ctx.clip()
  ctx.fillStyle = m.color + 'cc'
  ctx.fillRect(cup.x + 3, liqTop, cup.w - 6, liquidH - 3)
  for (const p of particles) {
    if (p.cup !== (mat === 'water' ? 'L' : 'R')) continue
    ctx.fillStyle = m.particle
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // 液面线
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cup.x + 4, liqTop)
  ctx.lineTo(cup.x + cup.w - 4, liqTop)
  ctx.stroke()

  // 温度计
  drawThermo(ctx, cup, temp)

  // 温度大字
  ctx.fillStyle = '#2c3e50'
  ctx.font = 'bold 21px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(temp.toFixed(1) + '℃', cup.cx, cup.y - 8)

  // 物质标签
  ctx.fillStyle = '#777'
  ctx.font = '13px sans-serif'
  ctx.fillText((mat === 'water' ? '💧 水' : '🧪 ' + m.name) + `（${m.c / 1000}×10³）`, cup.cx, cup.y + cup.h + 16)
}

function drawThermo(ctx, cup, temp) {
  const tx = cup.x + cup.w - 17
  const th = cup.h * 0.72
  const ty = cup.y + cup.h - th - 6
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  roundRectPath(ctx, tx - 7, ty, 14, th, 7)
  ctx.fill()
  ctx.strokeStyle = 'rgba(100,100,100,0.5)'
  ctx.lineWidth = 1
  roundRectPath(ctx, tx - 7, ty, 14, th, 7)
  ctx.stroke()
  const frac = Math.min(1, Math.max(0, (temp - (T0 - 5)) / (T_MAX - (T0 - 5))))
  const hgt = Math.max(3, th * frac)
  ctx.fillStyle = '#e74c3c'
  roundRectPath(ctx, tx - 4, ty + th - hgt, 8, hgt, 4)
  ctx.fill()
  ctx.fillStyle = '#999'
  ctx.font = '9px sans-serif'
  ctx.textAlign = 'left'
  for (const t of [20, 40, 60, 80]) {
    const y = ty + th - th * ((t - (T0 - 5)) / (T_MAX - (T0 - 5)))
    ctx.fillText(t, tx + 10, y + 3)
  }
}

function drawLamp(ctx, lamp, on, fire) {
  const cx = lamp.cx
  const baseY = lamp.y
  // 灯体
  ctx.fillStyle = '#d8b26a'
  ctx.beginPath()
  ctx.moveTo(cx - 22, baseY)
  ctx.lineTo(cx - 16, baseY - 26)
  ctx.lineTo(cx + 16, baseY - 26)
  ctx.lineTo(cx + 22, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#a08040'
  ctx.lineWidth = 1
  ctx.stroke()
  // 灯芯
  ctx.strokeStyle = '#555'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, baseY - 26)
  ctx.lineTo(cx, baseY - 32)
  ctx.stroke()

  if (on) {
    const fl = 0.85 + Math.sin(sim.clock * 13) * 0.1 + Math.sin(sim.clock * 7.3) * 0.08
    const fh = (10 + fire * 3.2) * fl
    const fw = 8 + fire * 1.2
    const fy = baseY - 32
    // 光晕
    const grad = ctx.createRadialGradient(cx, fy - fh * 0.4, 4, cx, fy - fh * 0.4, fh * 1.6)
    grad.addColorStop(0, 'rgba(255,180,60,0.35)')
    grad.addColorStop(1, 'rgba(255,180,60,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, fy - fh * 0.4, fh * 1.6, 0, Math.PI * 2)
    ctx.fill()
    // 外焰
    ctx.fillStyle = '#ff9d2e'
    ctx.beginPath()
    ctx.moveTo(cx, fy - fh)
    ctx.quadraticCurveTo(cx + fw, fy - fh * 0.45, cx + fw * 0.6, fy + 2)
    ctx.quadraticCurveTo(cx, fy + 6, cx - fw * 0.6, fy + 2)
    ctx.quadraticCurveTo(cx - fw, fy - fh * 0.45, cx, fy - fh)
    ctx.closePath()
    ctx.fill()
    // 内焰
    ctx.fillStyle = '#ffe9a8'
    ctx.beginPath()
    ctx.moveTo(cx, fy - fh * 0.6)
    ctx.quadraticCurveTo(cx + fw * 0.4, fy - fh * 0.25, cx + fw * 0.25, fy + 2)
    ctx.quadraticCurveTo(cx, fy + 5, cx - fw * 0.25, fy + 2)
    ctx.quadraticCurveTo(cx - fw * 0.4, fy - fh * 0.25, cx, fy - fh * 0.6)
    ctx.closePath()
    ctx.fill()
  }
  // 功率标注
  ctx.fillStyle = '#999'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(powerW.value + 'W', cx, baseY + 14)
}

function drawSky(ctx, w, topH) {
  const day = sim.dayNight === 'day'
  const grad = ctx.createLinearGradient(0, 0, 0, topH)
  if (day) {
    grad.addColorStop(0, 'rgba(255,214,120,0.55)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
  } else {
    grad.addColorStop(0, 'rgba(40,60,110,0.55)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
  }
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, topH)
  const cx = w * 0.5
  const cy = 30
  if (day) {
    ctx.fillStyle = '#ffd93b'
    ctx.beginPath()
    ctx.arc(cx, cy, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,200,50,0.6)'
    ctx.lineWidth = 3
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22)
      ctx.lineTo(cx + Math.cos(a) * 31, cy + Math.sin(a) * 31)
      ctx.stroke()
    }
    ctx.fillStyle = '#2c3e50'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('☀ 白天（太阳加热）', cx, cy + 42)
  } else {
    ctx.fillStyle = '#e8ecf2'
    ctx.beginPath()
    ctx.arc(cx, cy, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#c8d2e0'
    ctx.beginPath()
    ctx.arc(cx - 5, cy - 3, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2c3e50'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🌙 夜晚（自然散热）', cx, cy + 42)
  }
}

function drawCurve(ctx, cg, w) {
  const { x0, y0, x1, y1 } = cg
  const tMax = Math.max(60, sim.simTime * 1.15)
  const T_MIN = T0 - 5
  const T_MAX_C = 100
  const X = (t) => x0 + (t / tMax) * (x1 - x0)
  const Y = (T) => y1 - ((T - T_MIN) / (T_MAX_C - T_MIN)) * (y1 - y0)

  ctx.fillStyle = '#888'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('温度 - 时间曲线（模拟时间）', x0, y0 - 10)

  // 场景2：昼夜色带
  if (sim.scene === 'life' && sim.curve.length > 1) {
    for (let i = 0; i < sim.curve.length - 1; i++) {
      const a = sim.curve[i]
      const b = sim.curve[i + 1]
      if (a.n === b.n && a.n !== 'heat') {
        ctx.fillStyle = a.n === 'day' ? 'rgba(255,214,120,0.20)' : 'rgba(70,100,170,0.16)'
        ctx.fillRect(X(a.t), y0, Math.max(1, X(b.t) - X(a.t)), y1 - y0)
      }
    }
  }

  // 网格 + 刻度
  ctx.strokeStyle = 'rgba(0,0,0,0.07)'
  ctx.lineWidth = 1
  for (let T = 20; T <= 100; T += 10) {
    ctx.beginPath()
    ctx.moveTo(x0, Y(T))
    ctx.lineTo(x1, Y(T))
    ctx.stroke()
    ctx.fillStyle = '#999'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(T + '°', x0 - 5, Y(T) + 3)
  }
  for (let t = 0; t <= tMax; t += 30) {
    ctx.beginPath()
    ctx.moveTo(X(t), y0)
    ctx.lineTo(X(t), y1)
    ctx.stroke()
    ctx.fillStyle = '#999'
    ctx.textAlign = 'center'
    ctx.fillText(t + 's', X(t), y1 + 14)
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x0, y1)
  ctx.lineTo(x1, y1)
  ctx.stroke()

  // 双线
  const lines = [
    ['tl', '#3b82f6'],
    ['tr', MATERIALS[sim.rightMat].color]
  ]
  for (const [key, color] of lines) {
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.beginPath()
    let started = false
    for (const pt of sim.curve) {
      const px = X(pt.t)
      const py = Y(pt[key])
      if (!started) {
        ctx.moveTo(px, py)
        started = true
      } else {
        ctx.lineTo(px, py)
      }
    }
    ctx.stroke()
  }

  // 图例
  ctx.font = '11px sans-serif'
  ctx.fillStyle = '#3b82f6'
  ctx.fillRect(x0 + 4, y0 + 4, 14, 3)
  ctx.fillStyle = '#555'
  ctx.textAlign = 'left'
  ctx.fillText('水', x0 + 22, y0 + 8)
  ctx.fillStyle = MATERIALS[sim.rightMat].color
  ctx.fillRect(x0 + 48, y0 + 4, 14, 3)
  ctx.fillStyle = '#555'
  ctx.fillText(MATERIALS[sim.rightMat].name, x0 + 66, y0 + 8)
}

function drawScene(ctx, state, utils) {
  const w = utils.canvasWidth
  const h = utils.canvasHeight
  if (w < 60 || h < 60) return
  const g = geo || getGeo(w, h)

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fafbfc'
  ctx.fillRect(0, 0, w, h)

  if (sim.scene === 'life') drawSky(ctx, w, g.topH)

  // 分隔线
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(10, g.topH)
  ctx.lineTo(w - 10, g.topH)
  ctx.stroke()

  drawCup(ctx, g.left, 'water', sim.tempL)
  drawCup(ctx, g.right, sim.rightMat, sim.tempR)

  if (sim.scene === 'heat') {
    drawLamp(ctx, g.lampL, sim.heatOn, sim.firePower)
    drawLamp(ctx, g.lampR, sim.heatOn, sim.firePower)
  }

  drawCurve(ctx, g.curve, w)
}

// ==========================================
// 生命周期
// ==========================================
onMounted(() => {
  rafId = requestAnimationFrame(loop)
})
onUnmounted(() => {
  cancelAnimationFrame(rafId)
})
</script>

<style lang="scss" scoped>
.shc-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 控制面板 ========== */
.shc-control {
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

.scene-grid {
  display: flex;
  gap: 6px;
}

.scene-btn {
  flex: 1;
  padding: 8px 4px;
  font-size: 13px;
  border-radius: 6px;
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

.mat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.mat-btn {
  padding: 7px 4px;
  font-size: 12px;
  border-radius: 6px;
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

.action-btn {
  width: 100%;
  padding: 9px 12px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(24, 144, 255, 0.16);
  color: #8fc0ff;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(24, 144, 255, 0.3);
    border-color: #4a9bff;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &.heat.on {
    background: rgba(255, 120, 30, 0.22);
    border-color: #ff8c42;
    color: #ffb27d;
  }
}

.shc-slider {
  width: 100%;
  accent-color: $color-accent;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.sub-info {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
}

.control-tip {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.45);
}

/* ========== 数据面板 ========== */
.shc-data {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.data-group {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
}

.group-title {
  font-size: 13px;
  font-weight: 500;
  color: $color-accent;
  margin-bottom: 8px;
}

.stat-line {
  font-size: 12px;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.85);
}

.conclusion-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.8;
  color: #ffd98c;
  background: rgba(245, 166, 35, 0.1);
  border: 1px solid rgba(245, 166, 35, 0.25);
  border-radius: 6px;
  padding: 8px 10px;
}
</style>
