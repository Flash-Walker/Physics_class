<template>
  <div class="mm-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="animState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：场景切换 + 场景专属控制 -->
      <template #control>
        <div class="mm-control">
          <div class="ctrl-group">
            <div class="group-label">🎛 实验场景</div>
            <div class="scene-grid">
              <button class="scene-btn" :class="{ active: scene === 'gas' }" @click="switchScene('gas')">
                💨 气体扩散
              </button>
              <button class="scene-btn" :class="{ active: scene === 'liquid' }" @click="switchScene('liquid')">
                💧 液体对比
              </button>
            </div>
            <p class="sub-info">{{ scene === 'gas' ? '二氧化氮 + 空气（教材经典演示）' : '墨水在冷 / 热水中的扩散对比' }}</p>
          </div>

          <template v-if="scene === 'gas'">
            <div class="ctrl-group">
              <div class="group-label">🪟 隔板</div>
              <button class="action-btn" :disabled="plateOpen" @click="openPlate">
                {{ plateOpen ? '✅ 隔板已抽出' : '抽出隔板' }}
              </button>
              <p class="sub-info">{{ plateOpen ? '已抽出：NO₂ 与空气自发混合（扩散）' : '隔板将上瓶空气与下瓶 NO₂ 隔开' }}</p>
            </div>
            <div class="ctrl-group">
              <div class="group-label">🔥 酒精灯</div>
              <button class="action-btn heat" :class="{ on: heaterOn }" @click="heaterOn = !heaterOn">
                {{ heaterOn ? '🔥 熄灭酒精灯' : '点燃酒精灯' }}
              </button>
              <p class="sub-info">加热可升温至 100℃：温度越高，分子运动越剧烈</p>
            </div>
          </template>

          <template v-else>
            <div class="ctrl-group">
              <div class="group-label">🌡 热水温度（右杯）</div>
              <input type="range" min="20" max="90" step="1" v-model.number="hotTemp" class="hot-slider" />
              <div class="slider-labels">
                <span>20℃</span>
                <span class="now">{{ hotTemp }}℃</span>
                <span>90℃</span>
              </div>
              <p class="sub-info">左杯冷水固定 20℃；拖动滑块调节右杯热水温度</p>
            </div>
            <div class="ctrl-group">
              <div class="group-label">🖋 墨水</div>
              <button class="action-btn" :disabled="inkDropped" @click="dropInk">
                {{ inkDropped ? '✅ 已滴入墨水' : '两杯同时滴入墨水' }}
              </button>
              <p class="sub-info">{{ inkDropped ? '观察：热水杯中墨水扩散明显更快' : '点击后两杯同时滴入一滴墨水（同屏对照）' }}</p>
            </div>
          </template>

          <p class="control-tip">💡 提示：分子永不停息地做无规则运动（热运动）；温度越高运动越剧烈、扩散越快。粒子在待开始状态也会持续运动。</p>
        </div>
      </template>

      <!-- 中间：场景画布 -->
      <template #canvas>
        <ExperimentCanvas
          ref="canvasRef"
          :draw="drawScene"
          :state="sim"
          :scale="1"
          @resize="handleCanvasResize"
        />
      </template>

      <!-- 右侧：实时数据 -->
      <template #data>
        <div class="mm-data">
          <template v-if="scene === 'gas'">
            <div class="data-group">
              <div class="group-title">🫧 扩散程度（混合度）</div>
              <div class="mix-big">{{ mixPercent }}<span class="unit">%</span></div>
              <div class="progress">
                <div class="bar" :style="{ width: mixPercent + '%' }"></div>
              </div>
              <div class="mix-state">{{ mixStateText }}</div>
            </div>
            <div class="data-group">
              <div class="group-title">🌡 温度与状态</div>
              <div class="stat-line">温度：{{ temp.toFixed(0) }}℃</div>
              <div class="stat-line">{{ heaterOn ? '🔥 酒精灯加热中' : '酒精灯熄灭' }}</div>
              <div class="stat-line">粒子平均速率：{{ spdVal.toFixed(0) }} px/s</div>
              <div class="stat-line">扩散时间：{{ simTime.toFixed(1) }} s</div>
            </div>
          </template>

          <template v-else>
            <div class="data-group">
              <div class="group-title">💧 墨水扩散度对比</div>
              <div class="cup-bars">
                <div class="cup-bar-item">
                  <div class="cup-label">❄ 冷水 20℃</div>
                  <div class="bar-track">
                    <div class="bar cold" :style="{ width: leftPercent + '%' }"></div>
                  </div>
                  <div class="cup-val">{{ leftPercent }}%</div>
                </div>
                <div class="cup-bar-item">
                  <div class="cup-label">🔥 热水 {{ hotTemp }}℃</div>
                  <div class="bar-track">
                    <div class="bar hot" :style="{ width: rightPercent + '%' }"></div>
                  </div>
                  <div class="cup-val">{{ rightPercent }}%</div>
                </div>
              </div>
              <p class="cup-tip">{{ inkDropped ? '同屏对照：热水杯扩散明显更快' : '滴入墨水后开始统计' }}</p>
            </div>
            <div class="data-group">
              <div class="group-title">🌡 温度与速率</div>
              <div class="stat-line">左杯冷水：20℃（固定）</div>
              <div class="stat-line">右杯热水：{{ hotTemp }}℃（滑块可调）</div>
              <div class="stat-line">平均速率：左 {{ leftSpd.toFixed(0) }} / 右 {{ rightSpd.toFixed(0) }} px/s</div>
              <div class="stat-line">扩散时间：{{ simTime.toFixed(1) }} s</div>
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
import { molecularMotionConfig } from '@/config/experiments/heat/molecularMotion.js'
import { applyThermalMotion, bounceInBox, thermalIntensity, mixingDegree, avgSpeed } from '@/utils/physics/physicsUtils.js'

const config = molecularMotionConfig

// ==========================================
// 场景与运行状态
// ==========================================

const scene = ref('gas') // gas / liquid
const animState = ref('idle') // idle / running / paused
const simTime = ref(0)

// ---- 场景1：气体扩散 ----
const plateOpen = ref(false)
const heaterOn = ref(false)
const temp = ref(20)
const T_MIN = 20
const T_MAX = 100
const HEAT_RATE = 6 // ℃/s

// ---- 场景2：液体扩散对比 ----
const hotTemp = ref(60)
const inkDropped = ref(false)

// ---- 统计值 ----
const mixVal = ref(0)
const leftMix = ref(0)
const rightMix = ref(0)
const spdVal = ref(0)
const leftSpd = ref(0)
const rightSpd = ref(0)

const mixPercent = computed(() => Math.round(mixVal.value * 100))
const leftPercent = computed(() => Math.round(leftMix.value * 100))
const rightPercent = computed(() => Math.round(rightMix.value * 100))

const mixStateText = computed(() => {
  const m = mixVal.value
  if (m < 0.2) return '尚未混合'
  if (m < 0.45) return '扩散中…'
  if (m < 0.75) return '扩散进行中，趋于均匀'
  return '已基本混合均匀'
})

// ==========================================
// 粒子系统
// ==========================================

const particles = reactive([])
const sim = reactive({
  particles, scene: 'gas', plateOpen: false, heaterOn: false,
  temp: 20, hotTemp: 60, inkDropped: false, clock: 0
})

let geo = null
let simClock = 0
let lastTs = 0
let rafId = null

// 温度 → 目标速率（px/s）：20℃≈30，100℃≈90
const speedForTemp = (T) => 30 + thermalIntensity(T, T_MIN, T_MAX) * 60

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// ---------- 场景1 几何：上下双瓶 ----------
function getGasGeo(w, h) {
  const bw = Math.min(w * 0.46, 250)
  const bh = Math.min(h * 0.34, 180)
  const cx = w / 2
  const midY = h * 0.52
  const wall = 6
  return {
    w, h, cx, bw, bh, wall, midY,
    x0: cx - bw / 2 + wall,
    x1: cx + bw / 2 - wall,
    yTop: midY - bh + wall,
    yBot: midY + bh - wall
  }
}

// 隔板状态决定粒子边界：抽板前各自瓶内，抽板后全区域
function gasBounds(p, g) {
  if (plateOpen.value) return { x0: g.x0, y0: g.yTop, x1: g.x1, y1: g.yBot }
  if (p.kind === 'air') return { x0: g.x0, y0: g.yTop, x1: g.x1, y1: g.midY }
  return { x0: g.x0, y0: g.midY, x1: g.x1, y1: g.yBot }
}

function initGasParticles() {
  const g = getGasGeo(canvasW.value, canvasH.value)
  if (canvasW.value < 60 || canvasH.value < 60) return
  geo = g
  particles.length = 0
  const mk = (kind, x0, y0, x1, y1, count) => {
    for (let i = 0; i < count; i++) {
      const size = 2.2 + Math.random() * 0.9
      particles.push(reactive({
        kind,
        x: x0 + size + Math.random() * (x1 - x0 - size * 2),
        y: y0 + size + Math.random() * (y1 - y0 - size * 2),
        vx: 0, vy: 0, size
      }))
    }
  }
  mk('air', g.x0, g.yTop, g.x1, g.midY, 160) // 上瓶：空气
  mk('no2', g.x0, g.midY, g.x1, g.yBot, 160) // 下瓶：二氧化氮
}

function updateGasParticles(dt) {
  const g = geo
  if (!g || !particles.length) return
  const spd = speedForTemp(temp.value)
  for (const p of particles) {
    applyThermalMotion(p, dt, spd, 2.8)
    const b = gasBounds(p, g)
    bounceInBox(p, b.x0, b.y0, b.x1, b.y1, 0.7)
  }
}

// ---------- 场景2 几何：左右两杯 ----------
function getLiquidGeo(w, h) {
  const cw = Math.min(w * 0.34, 200)
  const ch = Math.min(h * 0.48, 250)
  const wall = 5
  const bottomY = h * 0.84
  const topY = bottomY - ch
  const mkCup = (cx) => ({
    cx,
    x0: cx - cw / 2 + wall,
    x1: cx + cw / 2 - wall,
    yTop: topY + 14, // 水面
    yBot: bottomY - wall, // 杯底
    mouthY: topY // 杯口
  })
  return { w, h, cw, ch, wall, bottomY, topY, left: mkCup(w * 0.28), right: mkCup(w * 0.72) }
}

function initLiquidParticles() {
  const g = getLiquidGeo(canvasW.value, canvasH.value)
  if (canvasW.value < 60 || canvasH.value < 60) return
  geo = g
  particles.length = 0
  for (const cup of [g.left, g.right]) {
    const cupName = cup === g.left ? 'left' : 'right'
    // 水分子（浅色，均匀分布）
    for (let i = 0; i < 70; i++) {
      const size = 2 + Math.random() * 0.7
      particles.push(reactive({
        cup: cupName, kind: 'water',
        x: cup.x0 + size + Math.random() * (cup.x1 - cup.x0 - size * 2),
        y: cup.yTop + size + Math.random() * (cup.yBot - cup.yTop - size * 2),
        vx: 0, vy: 0, size
      }))
    }
    // 墨水粒子（深蓝，初始聚成小团悬在杯口上方）
    for (let i = 0; i < 26; i++) {
      const size = 2.6 + Math.random() * 0.8
      particles.push(reactive({
        cup: cupName, kind: 'ink',
        x: cup.cx + (Math.random() - 0.5) * 13,
        y: cup.mouthY - 14 + (Math.random() - 0.5) * 9,
        vx: 0, vy: 0, size,
        drop: 'pending' // pending → falling → diffusing
      }))
    }
  }
}

function updateLiquidParticles(dt) {
  const g = geo
  if (!g) return
  const spdLeft = speedForTemp(20)
  const spdRight = speedForTemp(hotTemp.value)
  for (const p of particles) {
    const cup = p.cup === 'left' ? g.left : g.right
    const spd = p.cup === 'left' ? spdLeft : spdRight
    if (p.kind === 'water') {
      applyThermalMotion(p, dt, spd, 2.6)
      bounceInBox(p, cup.x0, cup.yTop, cup.x1, cup.yBot, 0.6)
    } else {
      if (p.drop === 'pending') {
        if (inkDropped.value) p.drop = 'falling'
        // 悬停抖动
        p.x = cup.cx + (Math.random() - 0.5) * 2
        p.y = cup.mouthY - 14 + (Math.random() - 0.5) * 2
        p.vx = 0
        p.vy = 0
      } else if (p.drop === 'falling') {
        // 墨水滴入水中
        p.vy = 150
        p.vx = (Math.random() - 0.5) * 24
        p.y += p.vy * dt
        p.x += p.vx * dt
        if (p.y >= cup.yTop + 3) {
          p.drop = 'diffusing'
          p.y = cup.yTop + 3
          p.vx = (Math.random() - 0.5) * spd
          p.vy = (Math.random() - 0.5) * spd
        }
      } else {
        // 在水中热运动扩散
        applyThermalMotion(p, dt, spd, 3)
        bounceInBox(p, cup.x0, cup.yTop, cup.x1, cup.yBot, 0.6)
      }
    }
  }
}

// ==========================================
// 控制操作
// ==========================================

const openPlate = () => { plateOpen.value = true }
const dropInk = () => { inkDropped.value = true }

function resetSim() {
  simTime.value = 0
  plateOpen.value = false
  heaterOn.value = false
  temp.value = 20
  hotTemp.value = 60
  inkDropped.value = false
  mixVal.value = 0
  leftMix.value = 0
  rightMix.value = 0
  spdVal.value = 0
  leftSpd.value = 0
  rightSpd.value = 0
  if (scene.value === 'gas') initGasParticles()
  else initLiquidParticles()
}

function switchScene(s) {
  if (s === scene.value) return
  scene.value = s
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
// 画布
// ==========================================

const canvasW = ref(0)
const canvasH = ref(0)

const handleCanvasResize = ({ width, height }) => {
  canvasW.value = width
  canvasH.value = height
  if (scene.value === 'gas') initGasParticles()
  else initLiquidParticles()
}

// ---------- 绘制：场景1 气体扩散 ----------
function drawGasScene(ctx, g) {
  const w = g.w
  const h = g.h
  const st = sim

  // 加热氛围光晕
  if (st.heaterOn) {
    const grad = ctx.createRadialGradient(g.cx, h, 20, g.cx, h, h * 0.8)
    grad.addColorStop(0, 'rgba(255,140,40,0.16)')
    grad.addColorStop(1, 'rgba(255,140,40,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  // ===== 双瓶玻璃（先画背板） =====
  const bx0 = g.cx - g.bw / 2
  const bx1 = g.cx + g.bw / 2

  // 上瓶（顶部封口、底部开口）
  ctx.fillStyle = 'rgba(230,240,248,0.35)'
  roundRectPath(ctx, bx0, g.yTop - g.wall, g.bw, g.bh + g.wall, 10)
  ctx.fill()
  ctx.strokeStyle = 'rgba(70,110,150,0.7)'
  ctx.lineWidth = 2.5
  roundRectPath(ctx, bx0, g.yTop - g.wall, g.bw, g.bh + g.wall, 10)
  ctx.stroke()

  // 下瓶（顶部开口、底部封口）
  ctx.fillStyle = 'rgba(240,232,226,0.35)'
  roundRectPath(ctx, bx0, g.midY, g.bw, g.bh, 10)
  ctx.fill()
  ctx.strokeStyle = 'rgba(70,110,150,0.7)'
  roundRectPath(ctx, bx0, g.midY, g.bw, g.bh, 10)
  ctx.stroke()

  // 玻璃高光
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(bx0 + 7, g.yTop)
  ctx.lineTo(bx0 + 7, g.yBot)
  ctx.stroke()

  // ===== 隔板 =====
  if (!st.plateOpen) {
    // 瓶口对接处的隔板
    ctx.fillStyle = 'rgba(80,100,120,0.9)'
    roundRectPath(ctx, bx0 - 3, g.midY - 3.5, g.bw + 6, 7, 2)
    ctx.fill()
    // 拉手
    ctx.fillStyle = 'rgba(80,100,120,0.9)'
    roundRectPath(ctx, bx1 + 3, g.midY - 2.5, 12, 5, 2)
    ctx.fill()
  } else {
    // 已抽出的隔板：画在右侧
    ctx.save()
    ctx.globalAlpha = 0.75
    ctx.fillStyle = 'rgba(80,100,120,0.9)'
    roundRectPath(ctx, bx1 + 16, g.midY - 3.5, g.bw * 0.55, 7, 2)
    ctx.fill()
    ctx.font = '10px sans-serif'
    ctx.fillStyle = 'rgba(80,100,120,0.85)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('← 隔板已抽出', bx1 + 16, g.midY - 12)
    ctx.restore()
  }

  // ===== 瓶内粒子 =====
  // 裁剪到双瓶内部
  ctx.save()
  roundRectPath(ctx, bx0 + 3, g.yTop - 2, g.bw - 6, g.bh * 2 + 4, 8)
  ctx.clip()
  for (const p of particles) {
    if (p.kind === 'air') {
      ctx.globalAlpha = 0.75
      ctx.fillStyle = '#a9c4d8'
    } else {
      ctx.globalAlpha = 0.92
      ctx.fillStyle = '#c25a33'
    }
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()

  // ===== 瓶标签 =====
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(50,80,110,0.9)'
  ctx.fillText('空气', g.cx, g.yTop - 14)
  ctx.fillStyle = 'rgba(160,70,40,0.95)'
  ctx.fillText('二氧化氮 NO₂', g.cx, g.yBot + 14)

  // ===== 酒精灯 =====
  if (st.heaterOn || true) {
    const lampY = g.yBot + 34
    const lx = g.cx
    // 底座
    ctx.fillStyle = 'rgba(200,160,60,0.3)'
    ctx.beginPath()
    ctx.ellipse(lx, lampY + 8, 26, 11, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(150,110,40,0.5)'
    ctx.lineWidth = 1.4
    ctx.stroke()
    // 灯芯
    ctx.fillStyle = '#8a6d3b'
    ctx.fillRect(lx - 3, lampY - 2, 6, 7)
    if (st.heaterOn) {
      // 火焰（跳动动画）
      const fl = 0.85 + Math.sin(simClock * 13) * 0.1 + Math.sin(simClock * 7.3) * 0.08
      ctx.save()
      ctx.translate(lx, lampY - 2)
      ctx.fillStyle = 'rgba(255,120,30,0.75)'
      ctx.beginPath()
      ctx.ellipse(0, -9 * fl, 8, 13 * fl, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,190,60,0.9)'
      ctx.beginPath()
      ctx.ellipse(0, -7 * fl, 4.4, 8 * fl, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,250,220,0.95)'
      ctx.beginPath()
      ctx.ellipse(0, -5 * fl, 2, 4 * fl, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    } else {
      ctx.fillStyle = 'rgba(160,140,110,0.7)'
      ctx.fillRect(lx - 1.5, lampY - 4, 3, 4)
    }
  }

  // ===== 画布信息（右上角） =====
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.font = 'bold 20px sans-serif'
  ctx.fillStyle = st.heaterOn ? '#e0453c' : 'rgba(30,40,60,0.8)'
  ctx.fillText(`${st.temp.toFixed(0)}℃`, w - 14, 12)
  ctx.font = '12px sans-serif'
  ctx.fillStyle = 'rgba(30,40,60,0.7)'
  ctx.fillText(st.heaterOn ? '🔥 酒精灯加热中' : '酒精灯熄灭', w - 14, 38)

  // 混合度（瓶上方居中）
  ctx.textAlign = 'center'
  ctx.font = 'bold 13px sans-serif'
  ctx.fillStyle = 'rgba(30,40,60,0.75)'
  ctx.fillText(`混合度 ${mixPercent.value}%`, g.cx, 18)

  // 图例（左下角）
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.font = '10px sans-serif'
  ctx.fillStyle = 'rgba(30,40,60,0.45)'
  ctx.fillText('● 浅灰蓝=空气分子 · 红棕=二氧化氮分子 · 粒子运动快慢反映温度', 10, h - 8)
}

// ---------- 绘制：场景2 液体扩散对比 ----------
function drawLiquidScene(ctx, g) {
  const w = g.w
  const h = g.h
  const st = sim

  const drawCup = (cup, cupName) => {
    const isLeft = cupName === 'left'
    const cupTemp = isLeft ? 20 : st.hotTemp
    const waterColor = isLeft ? 'rgba(110,175,245,0.4)' : 'rgba(240,150,85,0.42)'
    const waterDeep = isLeft ? 'rgba(90,155,230,0.55)' : 'rgba(230,130,65,0.55)'

    // 水填充
    ctx.save()
    roundRectPath(ctx, cup.x0 - 2, cup.yTop, cup.x1 - cup.x0 + 4, cup.yBot - cup.yTop, 6)
    ctx.clip()
    const grad = ctx.createLinearGradient(0, cup.yTop, 0, cup.yBot)
    grad.addColorStop(0, waterColor)
    grad.addColorStop(1, waterDeep)
    ctx.fillStyle = grad
    ctx.fillRect(cup.x0 - 2, cup.yTop, cup.x1 - cup.x0 + 4, cup.yBot - cup.yTop)

    // 水粒子 + 墨水粒子
    for (const p of particles) {
      if (p.cup !== cupName) continue
      if (p.kind === 'water') {
        ctx.globalAlpha = 0.4
        ctx.fillStyle = isLeft ? 'rgba(120,180,240,0.9)' : 'rgba(245,175,110,0.9)'
      } else {
        if (p.drop === 'pending') continue // 悬停的墨水团在杯外画
        ctx.globalAlpha = 0.95
        ctx.fillStyle = '#1b3f8f'
      }
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.restore()

    // 水面线
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(cup.x0, cup.yTop)
    ctx.lineTo(cup.x1, cup.yTop)
    ctx.stroke()

    // 杯玻璃轮廓（U 形）
    ctx.strokeStyle = 'rgba(70,110,150,0.75)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cup.x0 - 2, cup.mouthY)
    ctx.lineTo(cup.x0 - 2, cup.yBot + 4)
    ctx.quadraticCurveTo(cup.x0 - 2, cup.yBot + 8, cup.x0 + 3, cup.yBot + 8)
    ctx.lineTo(cup.x1 - 3, cup.yBot + 8)
    ctx.quadraticCurveTo(cup.x1 + 2, cup.yBot + 8, cup.x1 + 2, cup.yBot + 4)
    ctx.lineTo(cup.x1 + 2, cup.mouthY)
    ctx.stroke()
    // 杯口沿
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(cup.x0 - 5, cup.mouthY)
    ctx.lineTo(cup.x0 - 2, cup.mouthY)
    ctx.moveTo(cup.x1 + 2, cup.mouthY)
    ctx.lineTo(cup.x1 + 5, cup.mouthY)
    ctx.stroke()

    // 悬停/滴落中的墨水团（杯口上方）
    const pendingInks = particles.filter((p) => p.cup === cupName && p.kind === 'ink' && p.drop === 'pending')
    if (pendingInks.length) {
      ctx.fillStyle = 'rgba(27,63,143,0.85)'
      ctx.beginPath()
      ctx.ellipse(cup.cx, cup.mouthY - 13, 11, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('墨水', cup.cx, cup.mouthY - 13)
    }

    // 杯标签
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isLeft ? 'rgba(60,120,200,0.95)' : 'rgba(210,105,45,0.95)'
    ctx.fillText(`${isLeft ? '❄ 冷水' : '🔥 热水'} ${cupTemp}℃`, cup.cx, cup.mouthY - 26)
  }

  drawCup(g.left, 'left')
  drawCup(g.right, 'right')

  // 图例（左下角）
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.font = '10px sans-serif'
  ctx.fillStyle = 'rgba(30,40,60,0.45)'
  ctx.fillText('● 深蓝=墨水 · 浅色=水分子 · 同屏对比冷 / 热水扩散速度', 10, h - 8)
}

// ---------- 总绘制入口 ----------
const drawScene = (ctx, state, utils) => {
  const w = utils.canvasWidth
  const h = utils.canvasHeight
  if (w < 60 || h < 60) return
  if (state.scene === 'gas') {
    drawGasScene(ctx, getGasGeo(w, h))
  } else {
    drawLiquidScene(ctx, getLiquidGeo(w, h))
  }
}

// ==========================================
// 主循环
// ==========================================

function loop(ts) {
  rafId = requestAnimationFrame(loop)
  const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016
  lastTs = ts

  if (animState.value !== 'paused') {
    simClock += dt
    if (animState.value === 'running') {
      simTime.value += dt
      // 场景1：酒精灯加热升温
      if (scene.value === 'gas' && heaterOn.value && temp.value < T_MAX) {
        temp.value = Math.min(T_MAX, temp.value + HEAT_RATE * dt)
      }
    }

    if (scene.value === 'gas') {
      updateGasParticles(dt)
      const g = geo
      if (g) {
        // 指数平滑：抑制稀疏粒子的瞬时统计噪声，显示扩散趋势
        const target = mixingDegree(particles, (p) => p.kind === 'no2', { x0: g.x0, y0: g.yTop, x1: g.x1, y1: g.yBot }, 6)
        mixVal.value = mixVal.value + (target - mixVal.value) * 0.12
        spdVal.value = avgSpeed(particles)
      }
    } else {
      updateLiquidParticles(dt)
      const g = geo
      if (g) {
        const tl = mixingDegree(particles, (p) => p.kind === 'ink' && p.cup === 'left', { x0: g.left.x0, y0: g.left.yTop, x1: g.left.x1, y1: g.left.yBot }, 4)
        const tr = mixingDegree(particles, (p) => p.kind === 'ink' && p.cup === 'right', { x0: g.right.x0, y0: g.right.yTop, x1: g.right.x1, y1: g.right.yBot }, 4)
        leftMix.value = leftMix.value + (tl - leftMix.value) * 0.12
        rightMix.value = rightMix.value + (tr - rightMix.value) * 0.12
        leftSpd.value = avgSpeed(particles, (p) => p.cup === 'left')
        rightSpd.value = avgSpeed(particles, (p) => p.cup === 'right')
      }
    }
  }

  // 同步到画布 state（触发重绘）
  sim.scene = scene.value
  sim.plateOpen = plateOpen.value
  sim.heaterOn = heaterOn.value
  sim.temp = temp.value
  sim.hotTemp = hotTemp.value
  sim.inkDropped = inkDropped.value
  sim.clock = simClock
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
.mm-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 控制面板 ========== */
.mm-control {
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

.hot-slider {
  width: 100%;
  accent-color: $color-accent;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;

  .now {
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

.control-tip {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.45);
}

/* ========== 数据面板 ========== */
.mm-data {
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

.mix-big {
  font-size: 34px;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;

  .unit {
    font-size: 15px;
    font-weight: normal;
    color: rgba(255, 255, 255, 0.55);
    margin-left: 3px;
  }
}

.mix-state {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}

.progress {
  height: 10px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
  margin-top: 8px;

  .bar {
    height: 100%;
    border-radius: 5px;
    background: linear-gradient(90deg, #40a9ff, #36cfc9);
    transition: width 0.15s linear;
  }
}

.cup-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cup-bar-item {
  .cup-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 4px;
  }

  .bar-track {
    height: 12px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.12);
    overflow: hidden;

    .bar {
      height: 100%;
      border-radius: 6px;
      transition: width 0.15s linear;

      &.cold {
        background: linear-gradient(90deg, #4a9bff, #40a9ff);
      }

      &.hot {
        background: linear-gradient(90deg, #ff8c42, #ff4d4f);
      }
    }
  }

  .cup-val {
    margin-top: 3px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
  }
}

.cup-tip {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.5);
}

.stat-line {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.9;
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
