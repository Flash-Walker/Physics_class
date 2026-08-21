<template>
  <div class="echo-ranging-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="runState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：参数控制 -->
      <template #control>
        <div class="er-control">
          <p class="control-tip">📡 声音遇到障碍物会反射形成回声<br />s = vt/2：用回声测量距离</p>

          <!-- 场景切换 -->
          <div class="control-group">
            <div class="group-label">子场景</div>
            <div class="btn-row">
              <button
                v-for="sc in sceneList"
                :key="sc.id"
                class="style-btn"
                :class="{ active: scene === sc.id }"
                @click="switchScene(sc.id)"
              >
                {{ sc.icon }} {{ sc.name }}
              </button>
            </div>
            <p class="scene-tip">{{ currentScene.tip }}</p>
          </div>

          <!-- 山谷回声参数 -->
          <div v-if="scene === 'echo'" class="control-group">
            <div class="group-label">{{ currentScene.params.d.label }}</div>
            <input
              type="range"
              class="u-slider"
              :min="currentScene.params.d.min"
              :max="currentScene.params.d.max"
              :step="currentScene.params.d.step"
              v-model.number="echoDist"
              @input="onParamChange"
            />
            <div class="u-value">{{ echoDist }}<span class="u-unit">m</span></div>
          </div>

          <!-- 声呐参数 -->
          <div v-if="scene === 'sonar'" class="control-group">
            <div class="group-label">海底深度 d</div>
            <input type="range" class="u-slider" min="10" max="500" step="5" v-model.number="sonarDepth" @input="onParamChange" />
            <div class="u-value">{{ sonarDepth }}<span class="u-unit">m</span></div>

            <div class="group-label sub">介质（声速 v）</div>
            <div class="btn-row">
              <button
                v-for="sp in config.speeds"
                :key="sp.id"
                class="style-btn"
                :class="{ active: medium === sp.id }"
                @click="medium = sp.id"
              >
                {{ sp.icon }} {{ sp.name }} {{ sp.value }}
              </button>
            </div>

            <label class="switch-row">
              <input type="checkbox" v-model="fishOn" @change="onParamChange" />
              <span>🐟 鱼群探测层（多目标回波）</span>
            </label>
          </div>

          <!-- 倒车雷达参数 -->
          <div v-if="scene === 'radar'" class="control-group">
            <div class="group-label">车尾到障碍物的距离 d</div>
            <input type="range" class="u-slider" min="0.3" max="3" step="0.1" v-model.number="radarDist" @input="onParamChange" />
            <div class="u-value">{{ radarDist.toFixed(1) }}<span class="u-unit">m</span></div>
          </div>

          <!-- 发射 -->
          <div class="control-group">
            <button class="fire-btn" @click="fire" :disabled="busy">{{ currentScene.fireLabel }}</button>
          </div>

          <p class="control-hint">💡 拖动滑块修改参数后，再次点击发射重新测量。动画按真实传播时间等比放慢，便于观察声波的往返过程。</p>
        </div>
      </template>

      <!-- 中间：场景画布 -->
      <template #canvas>
        <div class="scope-wrap" ref="scopeWrap">
          <canvas ref="sceneCanvas"></canvas>
          <div v-if="sceneBadge" class="scope-badge" :class="{ done: doneFlag }">{{ sceneBadge }}</div>
          <div v-if="!anim.active && !doneFlag" class="scope-overlay">{{ currentScene.overlay }}</div>
        </div>
      </template>

      <!-- 右侧：实时数据 -->
      <template #data>
        <div class="er-data">
          <!-- 测量状态 -->
          <div class="data-group">
            <div class="group-title">⏱ 测量状态</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">当前进度</div>
                <div class="card-value" :class="{ live: busy }">{{ statusText }}</div>
              </div>
              <div v-if="busy" class="data-card">
                <div class="card-label">已用时间 t</div>
                <div class="card-value live">{{ fmtT(curT) }}</div>
              </div>
            </div>
          </div>

          <!-- 山谷回声数据 -->
          <div v-if="scene === 'echo'" class="data-group">
            <div class="group-title">🏔 回声判断</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">山壁距离 d</div>
                <div class="card-value small">{{ echoDist }} m</div>
              </div>
              <div class="data-card">
                <div class="card-label">声速 v（空气）</div>
                <div class="card-value small">340 m/s</div>
              </div>
              <div class="data-card">
                <div class="card-label">往返时间 t = 2d/v</div>
                <div class="card-value small">2 × {{ echoDist }} ÷ 340 = {{ fmtT(echoT) }}</div>
              </div>
              <div class="data-card">
                <div class="card-label">人耳能否区分</div>
                <div class="card-value small" :style="{ color: echoJudgement.ok ? '#52c41a' : '#f5a623' }">{{ echoJudgement.text }}</div>
              </div>
            </div>
            <div class="tone-tag">临界条件：间隔 ≥ 0.1 s（d ≥ 17 m）才能区分原声与回声</div>
          </div>

          <!-- 声呐数据 -->
          <div v-if="scene === 'sonar'" class="data-group">
            <div class="group-title">🚢 声呐测深计算</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">海底深度 d</div>
                <div class="card-value small">{{ sonarDepth }} m</div>
              </div>
              <div class="data-card">
                <div class="card-label">声速 v（{{ mediumName }}）</div>
                <div class="card-value small">{{ mediumSpeed }} m/s</div>
              </div>
              <div class="data-card">
                <div class="card-label">海底回波时间 t₁ = 2d/v</div>
                <div class="card-value small">2 × {{ sonarDepth }} ÷ {{ mediumSpeed }} = {{ fmtT(sonarT) }}</div>
              </div>
              <div class="data-card">
                <div class="card-label">计算深度 s = v·t₁/2</div>
                <div class="card-value small">{{ mediumSpeed }} × {{ sonarT.toFixed(3) }} ÷ 2 ≈ <b>{{ sonarDepth }} m</b></div>
              </div>
              <div v-if="fishOn" class="data-card">
                <div class="card-label">🐟 鱼群（深 {{ fishDepth }} m）回波 t₂</div>
                <div class="card-value small">2 × {{ fishDepth }} ÷ {{ mediumSpeed }} = {{ fmtT(fishT) }}</div>
              </div>
            </div>
            <div class="tone-tag">鱼群回波先到、海底回波后到，两道回波分别对应两个目标</div>
          </div>

          <!-- 倒车雷达数据 -->
          <div v-if="scene === 'radar'" class="data-group">
            <div class="group-title">🚗 倒车雷达</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">障碍物距离 d</div>
                <div class="card-value small">{{ radarDist.toFixed(1) }} m</div>
              </div>
              <div class="data-card">
                <div class="card-label">声速 v（空气）</div>
                <div class="card-value small">340 m/s</div>
              </div>
              <div class="data-card">
                <div class="card-label">往返时间 t = 2d/v</div>
                <div class="card-value small">{{ fmtT(radarT) }}（{{ (radarT * 1000).toFixed(1) }} ms）</div>
              </div>
              <div class="data-card">
                <div class="card-label">警示</div>
                <div class="card-value small" :style="{ color: radarWarn.color }">{{ radarWarn.text }}</div>
              </div>
            </div>
            <div class="tone-tag">真实倒车雷达每秒发射多次，距离越近回波越快、蜂鸣越急促</div>
          </div>

          <div class="data-group">
            <div class="group-title">💡 观察提示</div>
            <div class="point-list">
              <div class="point-item">青色实线环 = 去程声波，黄色虚线环 = 反射回来的回声</div>
              <div class="point-item">t 是声音"往返"总时间，算距离要除以 2</div>
              <div class="point-item">声速越大（海水 1500 &gt; 空气 340），同样距离回波越快</div>
              <div class="point-item">声呐用超声波：定向性好、水中传得远</div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ExperimentLayout from '@/layouts/ExperimentLayout.vue'
import { echoRangingConfig } from '@/config/experiments/acoustics/echo-ranging.js'

const config = echoRangingConfig
const sceneList = Object.values(config.scenes)
const scene = ref('echo')
const currentScene = computed(() => config.scenes[scene.value])

// 调试钩子（便于无头测试/排查，不影响功能）
if (typeof window !== 'undefined') {
  window.__erState = () => ({
    scene: scene.value,
    runState: runState.value,
    doneFlag: doneFlag.value,
    anim: anim
  })
}

// ========== 场景参数 ==========
const echoDist = ref(config.scenes.echo.params.d.def)       // 人到山壁距离 5~100 m
const sonarDepth = ref(config.scenes.sonar.params.depth.def) // 海底深度 10~500 m
const radarDist = ref(config.scenes.radar.params.dist.def)   // 车尾到障碍物 0.3~3 m
const medium = ref('sea')                                    // 介质：sea/fresh/air
const fishOn = ref(true)                                     // 鱼群探测层

const mediumSpeed = computed(() => {
  const sp = config.speeds.find((s) => s.id === medium.value)
  return sp ? sp.value : 1500
})
const mediumName = computed(() => {
  const sp = config.speeds.find((s) => s.id === medium.value)
  return sp ? sp.name : '海水'
})
const fishDepth = computed(() => Math.round(sonarDepth.value * 0.4))

// ========== 物理计算（理论值，始终显示） ==========
const echoT = computed(() => (2 * echoDist.value) / 340)
const sonarT = computed(() => (2 * sonarDepth.value) / mediumSpeed.value)
const fishT = computed(() => (2 * fishDepth.value) / mediumSpeed.value)
const radarT = computed(() => (2 * radarDist.value) / 340)

const echoJudgement = computed(() =>
  echoDist.value >= 17
    ? { ok: true, text: '✅ 能区分原声与回声' }
    : { ok: false, text: '⚠️ 不能区分：回声混在原声中' }
)

const radarWarn = computed(() => {
  const d = radarDist.value
  if (d < 1) return { color: '#ff4d4f', text: '🔴 危险！距离过近，请立即停车' }
  if (d < 2) return { color: '#f5a623', text: '🟠 注意！距离较近，请减速慢行' }
  return { color: '#52c41a', text: '🟢 距离安全' }
})

const fmtT = (s) => (s < 0.01 ? (s * 1000).toFixed(1) + ' ms' : s.toFixed(2) + ' s')

// ========== 动画状态机 ==========
// anim.waves: 每个 wave 是一次完整往返（去程 0~0.5 进度、回程 0.5~1 进度）
// wave = { maxDist, tRound, animDur, outColor, backColor }
const anim = {
  active: false,
  paused: false,
  t0: 0,       // 发射时刻（performance.now()）
  pauseAt: 0,  // 暂停时刻
  waves: [],
  totalDur: 0
}
const runState = ref('idle')   // idle / running / paused
const frozen = ref(false)      // 暂停冻结画面
const doneFlag = ref(false)    // 本轮测量是否已完成
const curT = ref(0)            // 动画进行中的实时时间读数

// busy 由响应式 runState 驱动（anim 是普通对象，直接依赖会导致 computed 缓存永不失效）
const busy = computed(() => runState.value !== 'idle')

// 各场景慢放系数：把真实传播时间放慢到便于观察的动画时长
const SLOW = { echo: 4, sonar: 4, radar: 300 }

const buildWaves = () => {
  const slow = SLOW[scene.value]
  const mk = (maxDist, tRound, outColor, backColor) => ({
    maxDist,
    tRound,
    animDur: Math.min(3, Math.max(1.0, tRound * slow)),
    outColor,
    backColor
  })
  if (scene.value === 'echo') {
    anim.waves = [mk(echoDist.value, echoT.value, '#00e5ff', '#ffd21f')]
  } else if (scene.value === 'sonar') {
    anim.waves = [mk(sonarDepth.value, sonarT.value, '#00e5ff', '#ffd21f')]
    if (fishOn.value) anim.waves.push(mk(fishDepth.value, fishT.value, '#00e5ff', '#7cf29c'))
  } else {
    anim.waves = [mk(radarDist.value, radarT.value, '#00e5ff', '#ffd21f')]
  }
  anim.totalDur = Math.max(...anim.waves.map((w) => w.animDur))
}

// ========== 蜂鸣（WebAudio 程序生成，无需音频文件） ==========
let beepTimers = []
const beep = (freq, dur = 0.06) => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    if (ctx.state === 'suspended') ctx.resume()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    o.connect(g)
    g.connect(ctx.destination)
    g.gain.setValueAtTime(0.22, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    o.start()
    o.stop(ctx.currentTime + dur)
  } catch (e) {
    /* 无音频设备时静默跳过 */
  }
}
const clearBeeps = () => {
  beepTimers.forEach(clearTimeout)
  beepTimers = []
}
const scheduleBeeps = () => {
  clearBeeps()
  // 每个 wave 的回波到达时刻（动画结束时刻）响一声
  for (const wv of anim.waves) {
    beepTimers.push(setTimeout(() => beep(720, 0.09), wv.animDur * 1000))
  }
}

// ========== 发射 / 控制 ==========
const fire = () => {
  if (busy.value) return
  clearBeeps()
  buildWaves()
  anim.t0 = performance.now()
  anim.paused = false
  anim.active = true
  doneFlag.value = false
  frozen.value = false
  runState.value = 'running'
  beep(1400, 0.05) // 发射提示音
  scheduleBeeps()
}

// 修改参数：若正在测量则按新参数立即重新发射
const onParamChange = () => {
  if (runState.value === 'running') {
    fire()
  }
}

const switchScene = (id) => {
  if (scene.value === id) return
  scene.value = id
  clearBeeps()
  anim.active = false
  anim.paused = false
  frozen.value = false
  doneFlag.value = false
  runState.value = 'idle'
}

const handleStart = () => {
  if (runState.value === 'paused') {
    // 恢复：补偿暂停期间流逝的时间
    anim.t0 += performance.now() - anim.pauseAt
    anim.paused = false
    frozen.value = false
    runState.value = 'running'
    scheduleBeeps()
  } else if (runState.value === 'idle') {
    fire()
  }
}

const handlePause = () => {
  if (!anim.active || anim.paused) return
  anim.paused = true
  anim.pauseAt = performance.now()
  frozen.value = true
  runState.value = 'paused'
  clearBeeps()
}

const handleReset = () => {
  clearBeeps()
  anim.active = false
  anim.paused = false
  frozen.value = false
  doneFlag.value = false
  curT.value = 0
  runState.value = 'idle'
}

const statusText = computed(() => {
  if (runState.value === 'running') return '📡 测量中…'
  if (runState.value === 'paused') return '⏸ 已暂停'
  if (doneFlag.value) return '✅ 测量完成'
  return '待发射'
})

const sceneBadge = computed(() => {
  if (runState.value === 'running') return scene.value === 'echo' ? '📣 声音传播中…' : '📡 测量中…'
  if (runState.value === 'paused') return '❄ 已冻结'
  if (doneFlag.value) return '✅ 测量完成'
  return ''
})

// ========== 画布 ==========
const scopeWrap = ref(null)
const sceneCanvas = ref(null)
let rafId = 0
let lastDataAt = 0

// 单帧更新：推进动画状态
const tickAnim = (now) => {
  if (!anim.active || anim.paused) return
  const elapsed = (now - anim.t0) / 1000
  if (elapsed >= anim.totalDur) {
    anim.active = false
    doneFlag.value = true
    runState.value = 'idle'
    curT.value = 0
    return
  }
  // 实时读数：按最远 wave 的进度映射回真实时间
  const main = anim.waves.reduce((a, b) => (b.maxDist > a.maxDist ? b : a))
  curT.value = Math.min(main.tRound, (elapsed / main.animDur) * main.tRound)
}

// 单个 wave 的进度（0~1）
const waveProgress = (wv, now) => {
  const elapsed = (now - anim.t0) / 1000
  return Math.min(1, Math.max(0, elapsed / wv.animDur))
}

const drawFrame = () => {
  rafId = requestAnimationFrame(drawFrame)
  if (frozen.value) return
  const cv = sceneCanvas.value
  if (!cv) return
  const ctx = cv.getContext('2d')
  const W = cv.width
  const H = cv.height
  if (W === 0 || H === 0) return

  const now = performance.now()
  tickAnim(now)

  // 背景 + 网格
  ctx.fillStyle = '#0b1220'
  ctx.fillRect(0, 0, W, H)
  drawGrid(ctx, W, H)

  if (scene.value === 'echo') drawEcho(ctx, W, H, now)
  else if (scene.value === 'sonar') drawSonar(ctx, W, H, now)
  else drawRadar(ctx, W, H, now)

  // 画布左上角实时时间读数
  if (busy.value) {
    ctx.fillStyle = 'rgba(0,229,255,0.9)'
    ctx.font = '13px Consolas, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('t = ' + fmtT(curT.value), 14, 26)
  }

  // 数据面板节流（约 10Hz）
  const ts = performance.now()
  if (ts - lastDataAt > 100) {
    lastDataAt = ts
    // curT 已由 tickAnim 更新（ref 响应式）
  }
}

const drawGrid = (ctx, W, H) => {
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 1
  const step = 40
  ctx.beginPath()
  for (let x = step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H) }
  for (let y = step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y) }
  ctx.stroke()
}

// 通用：绘制声波环（含去程/回程颜色与虚线切换）
const drawWaveRing = (ctx, cx, cy, rPx, wv, now) => {
  if (!anim.active) return
  const p = waveProgress(wv, now)
  if (p >= 1) return
  const out = p < 0.5
  const r = (out ? p * 2 : (1 - p) * 2) * rPx
  if (r < 1) return
  ctx.save()
  ctx.strokeStyle = out ? wv.outColor : wv.backColor
  ctx.lineWidth = 3
  ctx.setLineDash(out ? [] : [8, 6])
  ctx.shadowColor = out ? 'rgba(0,229,255,0.45)' : 'rgba(255,210,31,0.45)'
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

// ========== 场景 1：山谷回声 ==========
const drawEcho = (ctx, W, H, now) => {
  const groundY = H * 0.8
  const cx = W / 2
  const pxD = Math.min(W * 0.4, H * 0.58)
  const xL = cx - pxD
  const xR = cx + pxD
  const topY = H * 0.08

  // 山壁（反射面朝向中央）
  drawMountain(ctx, xL, topY, groundY, 1)   // 左侧山壁，反射面在右侧
  drawMountain(ctx, xR, topY, groundY, -1)  // 右侧山壁，反射面在左侧

  // 地面
  ctx.fillStyle = 'rgba(30,41,59,0.92)'
  ctx.fillRect(0, groundY, W, H - groundY)
  ctx.strokeStyle = 'rgba(148,163,184,0.4)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, groundY)
  ctx.lineTo(W, groundY)
  ctx.stroke()

  // 人
  ctx.font = '26px serif'
  ctx.textAlign = 'center'
  ctx.fillText('🧍', cx, groundY - 10)

  // 距离标尺（0 / d/2 / d）
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '11px "Microsoft YaHei", sans-serif'
  ctx.fillText('0', cx - 4, groundY + 22)
  ctx.fillText((echoDist.value / 2).toFixed(0) + 'm', cx - pxD / 2 - 14, groundY + 22)
  ctx.fillText(echoDist.value + 'm', xR - pxD - 12, groundY + 22)
  // 山壁标签
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '13px "Microsoft YaHei", sans-serif'
  ctx.fillText('山壁', xL - 26, topY + 26)
  ctx.fillText('山壁', xR + 10, topY + 26)

  // 声波环（圆心在人胸口高度）
  const waveY = groundY - 30
  for (const wv of anim.waves) {
    drawWaveRing(ctx, cx, waveY, pxD, wv, now)
  }

  // 顶部提示（临界距离说明）
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('空气声速 v = 340 m/s　|　人耳分辨阈值 0.1 s（临界 17 m）', 14, 24)
}

const drawMountain = (ctx, x, topY, groundY, dir) => {
  const w = 52
  const h = groundY - topY
  // 山体
  const grad = ctx.createLinearGradient(x, topY, x + dir * w, groundY)
  grad.addColorStop(0, '#475569')
  grad.addColorStop(1, '#1e293b')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(x, groundY)
  ctx.lineTo(x, topY + h * 0.35)
  ctx.lineTo(x + dir * w, topY)
  ctx.lineTo(x + dir * w, groundY)
  ctx.closePath()
  ctx.fill()
  // 反射面高亮
  ctx.strokeStyle = 'rgba(0,229,255,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, groundY)
  ctx.lineTo(x, topY + h * 0.35)
  ctx.stroke()
}

// ========== 场景 2：声呐测海深 ==========
const drawSonar = (ctx, W, H, now) => {
  const seaY = H * 0.26
  const cx = W / 2
  const avail = H - seaY - 52
  const pxDepth = Math.max(34, (sonarDepth.value / 500) * avail)
  const seaBottomY = seaY + pxDepth

  // 天空
  const sky = ctx.createLinearGradient(0, 0, 0, seaY)
  sky.addColorStop(0, '#0f172a')
  sky.addColorStop(1, '#1e3a5f')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, seaY + 2)

  // 水体
  const water = ctx.createLinearGradient(0, seaY, 0, seaBottomY)
  water.addColorStop(0, 'rgba(30,64,175,0.42)')
  water.addColorStop(1, 'rgba(12,28,80,0.62)')
  ctx.fillStyle = water
  ctx.fillRect(0, seaY + 2, W, pxDepth)

  // 海面波浪
  ctx.strokeStyle = 'rgba(125,211,252,0.65)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let x = 0; x <= W; x += 6) {
    const y = seaY + Math.sin(x * 0.03) * 3
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 海底（确定性起伏曲线）
  ctx.fillStyle = '#3b2f63'
  ctx.strokeStyle = 'rgba(148,163,184,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, seaBottomY + Math.sin(0) * 6)
  for (let x = 0; x <= W; x += 10) {
    const y = seaBottomY + Math.sin(x * 0.045) * 5 + Math.sin(x * 0.013 + 2) * 4
    ctx.lineTo(x, y)
  }
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // 深度标尺（海面 → 海底）
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(W - 52, seaY + 4)
  ctx.lineTo(W - 52, seaBottomY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('0', W - 58, seaY + 16)
  ctx.fillText(sonarDepth.value + ' m', W - 58, seaBottomY + 14)
  ctx.fillText('d = ' + sonarDepth.value + ' m', W - 58, (seaY + seaBottomY) / 2 + 4)

  // 鱼群层
  if (fishOn.value) {
    const fishY = seaY + pxDepth * 0.4
    ctx.font = '14px serif'
    ctx.textAlign = 'left'
    const fishXs = [cx - 110, cx - 60, cx + 20, cx + 80, cx + 130]
    fishXs.forEach((fx, i) => {
      ctx.fillText('🐟', fx, fishY + (i % 2 === 0 ? 0 : 12))
    })
    // 鱼群深度标注
    ctx.fillStyle = 'rgba(124,242,156,0.9)'
    ctx.font = '11px "Microsoft YaHei", sans-serif'
    ctx.fillText('鱼群 ' + fishDepth.value + ' m', cx - 40, fishY - 10)
  }

  // 船（海面上）
  drawBoat(ctx, cx, seaY)

  // 声波环（从船底换能器发出，向下传播 → 用半圆）
  const emitX = cx
  const emitY = seaY + 26
  for (const wv of anim.waves) {
    if (!anim.active) continue
    const p = waveProgress(wv, now)
    if (p >= 1) continue
    const out = p < 0.5
    const rPx = (wv.maxDist / sonarDepth.value) * pxDepth
    const r = (out ? p * 2 : (1 - p) * 2) * rPx
    if (r < 1) continue
    ctx.save()
    ctx.strokeStyle = out ? wv.outColor : wv.backColor
    ctx.lineWidth = 3
    ctx.setLineDash(out ? [] : [8, 6])
    ctx.shadowColor = out ? 'rgba(0,229,255,0.45)' : 'rgba(255,210,31,0.45)'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(emitX, emitY, r, 0, Math.PI) // 下半圆
    ctx.stroke()
    ctx.restore()
  }

  // 顶部信息
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('声速 v = ' + mediumSpeed.value + ' m/s（' + mediumName.value + '）　|　s = vt/2', 14, 24)
}

const drawBoat = (ctx, cx, seaY) => {
  // 船体
  ctx.fillStyle = '#64748b'
  ctx.beginPath()
  ctx.moveTo(cx - 46, seaY)
  ctx.lineTo(cx + 46, seaY)
  ctx.lineTo(cx + 32, seaY + 16)
  ctx.lineTo(cx - 32, seaY + 16)
  ctx.closePath()
  ctx.fill()
  // 船舱
  ctx.fillStyle = '#94a3b8'
  ctx.fillRect(cx - 20, seaY - 24, 40, 24)
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(cx - 14, seaY - 18, 12, 10)
  ctx.fillRect(cx + 2, seaY - 18, 12, 10)
  // 声呐换能器（船底凸起，青色）
  ctx.fillStyle = '#00e5ff'
  ctx.fillRect(cx - 5, seaY + 16, 10, 8)
  // 天线
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx + 30, seaY - 24)
  ctx.lineTo(cx + 30, seaY - 38)
  ctx.stroke()
}

// ========== 场景 3：倒车雷达 ==========
const drawRadar = (ctx, W, H, now) => {
  const groundY = H * 0.72
  const carX = W * 0.16
  const pxD = Math.max(100, (radarDist.value / 3) * W * 0.55)
  const obsX = carX + 108 + pxD

  // 地面
  ctx.fillStyle = 'rgba(30,41,59,0.92)'
  ctx.fillRect(0, groundY, W, H - groundY)
  ctx.strokeStyle = 'rgba(148,163,184,0.4)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, groundY)
  ctx.lineTo(W, groundY)
  ctx.stroke()

  // 车（尾部视角）
  drawCarTail(ctx, carX, groundY)

  // 障碍物（锥形桶）
  drawCone(ctx, obsX, groundY)

  // 距离标注箭头
  const arrowY = groundY - 76
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 4])
  ctx.beginPath()
  ctx.moveTo(carX + 100, arrowY)
  ctx.lineTo(obsX, arrowY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '13px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('d = ' + radarDist.value.toFixed(1) + ' m', (carX + 100 + obsX) / 2, arrowY - 8)

  // 声波环（从保险杠中点发出）
  const emitX = carX + 106
  const emitY = groundY - 10
  for (const wv of anim.waves) {
    drawWaveRing(ctx, emitX, emitY, pxD, wv, now)
  }

  // 警示灯（画布右上角）
  ctx.fillStyle = radarWarn.value.color
  ctx.beginPath()
  ctx.arc(W - 30, 30, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(radarWarn.value.text, W - 48, 34)

  // 顶部信息
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('空气声速 v = 340 m/s　|　t = 2d/v（毫秒级）', 14, 24)
}

const drawCarTail = (ctx, x, groundY) => {
  // 车身（尾部）
  ctx.fillStyle = '#64748b'
  ctx.fillRect(x, groundY - 54, 100, 46)
  // 后窗
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(x + 10, groundY - 48, 32, 24)
  // 尾灯
  ctx.fillStyle = '#ff4d4f'
  ctx.fillRect(x + 2, groundY - 48, 7, 18)
  ctx.fillRect(x + 91, groundY - 48, 7, 18)
  // 车牌
  ctx.fillStyle = '#e2e8f0'
  ctx.fillRect(x + 52, groundY - 34, 26, 12)
  // 保险杠
  ctx.fillStyle = '#94a3b8'
  ctx.fillRect(x + 100, groundY - 16, 8, 14)
  // 车轮
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(x + 6, groundY - 8, 26, 8)
  ctx.fillRect(x + 68, groundY - 8, 26, 8)
}

const drawCone = (ctx, x, groundY) => {
  // 锥形桶
  ctx.fillStyle = '#f5a623'
  ctx.beginPath()
  ctx.moveTo(x, groundY - 46)
  ctx.lineTo(x + 16, groundY - 12)
  ctx.lineTo(x - 16, groundY - 12)
  ctx.closePath()
  ctx.fill()
  // 白色反光条
  ctx.fillStyle = '#fff'
  ctx.fillRect(x - 9, groundY - 32, 18, 5)
  // 底座
  ctx.fillStyle = '#c2410c'
  ctx.fillRect(x - 22, groundY - 10, 44, 10)
  // 标签
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('障碍物', x, groundY - 56)
}

// ========== 画布尺寸自适应（含 DPR 高清） ==========
let resizeObs = null
const resizeCanvas = () => {
  const wrap = scopeWrap.value
  const cv = sceneCanvas.value
  if (!wrap || !cv) return
  const dpr = window.devicePixelRatio || 1
  const w = wrap.clientWidth
  const h = wrap.clientHeight
  if (w === 0 || h === 0) return
  cv.width = Math.round(w * dpr)
  cv.height = Math.round(h * dpr)
  cv.style.width = w + 'px'
  cv.style.height = h + 'px'
}

onMounted(() => {
  resizeCanvas()
  resizeObs = new ResizeObserver(resizeCanvas)
  if (scopeWrap.value) resizeObs.observe(scopeWrap.value)
  rafId = requestAnimationFrame(drawFrame)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  if (resizeObs) resizeObs.disconnect()
  clearBeeps()
})
</script>

<style lang="scss" scoped>
.echo-ranging-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 左栏控制 ========== */
.control-tip {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
  margin-bottom: 12px;
}

.control-group {
  margin-bottom: 14px;
}

.control-group.sub {
  margin-top: 10px;
  padding-left: 10px;
  border-left: 2px solid rgba(255, 255, 255, 0.12);
}

.group-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 8px;
}

.btn-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.style-btn {
  flex: 1;
  padding: 7px 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;

  &:hover {
    border-color: $color-tech-blue;
  }

  &.active {
    background: $color-tech-blue;
    border-color: $color-tech-blue;
    color: #fff;
  }
}

.scene-tip {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
}

.u-slider {
  width: 100%;
  accent-color: $color-tech-blue;
  cursor: pointer;
}

.u-value {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;

  b {
    color: $color-accent;
  }
}

.u-unit {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-left: 2px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  margin-top: 12px;

  input {
    accent-color: $color-tech-blue;
    cursor: pointer;
  }
}

.fire-btn {
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, $color-tech-blue, #0a4a8f);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  font-family: inherit;
  letter-spacing: 1px;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(24, 144, 255, 0.35);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.control-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  margin-top: 10px;
}

/* ========== 场景画布 ========== */
.scope-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 380px;
  border-radius: 10px;
  overflow: hidden;
  background: #0b1220;
  border: 1px solid rgba(0, 229, 255, 0.25);
  box-shadow: inset 0 0 40px rgba(0, 229, 255, 0.06);
}

.scope-wrap canvas {
  display: block;
}

.scope-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
  letter-spacing: 2px;
}

.scope-badge {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 12px;
  color: rgba(0, 229, 255, 0.9);
  background: rgba(0, 229, 255, 0.1);
  border: 1px solid rgba(0, 229, 255, 0.3);
  border-radius: 10px;
  padding: 2px 10px;
  pointer-events: none;

  &.done {
    color: #52c41a;
    background: rgba(82, 196, 26, 0.1);
    border-color: rgba(82, 196, 26, 0.35);
  }
}

/* ========== 右栏数据 ========== */
.data-group {
  margin-bottom: 14px;
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  color: $color-accent;
  margin-bottom: 8px;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-card {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 8px 12px;
}

.card-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2px;
}

.card-value {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  font-family: Consolas, monospace;

  &.small {
    font-size: 13px;
    font-family: inherit;
    font-weight: 500;
    line-height: 1.5;
  }

  &.live {
    color: #00e5ff;
  }
}

.tone-tag {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(74, 144, 226, 0.12);
  border: 1px solid rgba(74, 144, 226, 0.3);
  border-radius: 8px;
  padding: 6px 10px;
  line-height: 1.5;
}

.point-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.point-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
  padding-left: 10px;
  position: relative;

  &::before {
    content: '·';
    position: absolute;
    left: 2px;
    color: $color-tech-blue;
  }
}

/* ========== 底部原理 ========== */
.theory-content {
  p {
    margin-bottom: 8px;
  }

  .formula-block,
  .keypoint-block {
    margin: 10px 0;

    h4 {
      font-size: 14px;
      color: $color-primary;
      margin-bottom: 6px;
    }

    ul {
      padding-left: 20px;

      li {
        font-size: 13px;
        line-height: 1.8;
      }
    }
  }

  .notes {
    font-size: 13px;
    color: $color-text-muted;
  }
}
</style>