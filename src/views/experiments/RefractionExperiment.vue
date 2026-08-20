<template>
  <div class="refraction-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="runState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：参数控制 -->
      <template #control>
        <div class="refr-control">
          <p class="control-tip">💧 光线从空气射入介质，入射角可调（1°~179°），<br />观察折射角与光速变化（n = c/v）</p>

          <!-- 光线方向滑块 -->
          <div class="control-group">
            <div class="group-label">光线方向（与水平面的夹角，1°~179°）</div>
            <input type="range" class="u-slider" min="1" max="179" step="1" v-model.number="theta" />
            <div class="u-value">方向角 = <b>{{ theta }}</b>° <span class="dir-tip">{{ theta === 90 ? '垂直入射（不偏折）' : theta < 90 ? '从左侧射入' : '从右侧射入' }}</span></div>
          </div>

          <!-- 介质折射率 -->
          <div class="control-group">
            <div class="group-label">下方介质折射率 n₂（n = c/v）</div>
            <div class="btn-row">
              <button class="style-btn" :class="{ active: Math.abs(n2 - 1.33) < 0.02 }" @click="n2 = 1.33">💧 水 1.33</button>
              <button class="style-btn" :class="{ active: Math.abs(n2 - 1.50) < 0.02 }" @click="n2 = 1.50">🔮 玻璃 1.50</button>
              <button class="style-btn" :class="{ active: Math.abs(n2 - 2.42) < 0.02 }" @click="n2 = 2.42">💎 钻石 2.42</button>
            </div>
            <input type="range" class="u-slider n2-slider" min="1" max="2.5" step="0.01" v-model.number="n2" />
            <div class="u-value">n₂ = <b>{{ n2.toFixed(2) }}</b>（{{ mediumName }}）</div>
          </div>

          <!-- 显示选项 -->
          <div class="control-group">
            <div class="group-label">显示选项</div>
            <label class="switch-row">
              <input type="checkbox" v-model="showNormal" />
              <span>法线（虚线）</span>
            </label>
            <label class="switch-row">
              <input type="checkbox" v-model="showAngles" />
              <span>角度标注（入射角 / 折射角）</span>
            </label>
          </div>

          <p class="control-hint">💡 点「开始」播放动画：入射光线射到液面 → 折射光线进入介质 → 角度标注渐显</p>
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
        <div class="refr-data">
          <div class="data-group">
            <div class="group-title">📐 折射定律（斯涅耳）</div>
            <div class="formula-box">
              <div class="formula-main">n₁ sin i = n₂ sin r</div>
              <div class="formula-sub">且 n = c / v（折射率 = 真空中光速 ÷ 介质中光速）</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">实时数据</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">入射角 i（光线 ↔ 法线）</div>
                <div class="card-value">{{ incidentAngle }}<span class="card-unit">°</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">折射角 r（折射光线 ↔ 法线）</div>
                <div class="card-value">{{ refractedAngle !== null ? refractedAngle.toFixed(1) : '—' }}<span class="card-unit">°</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">折射率 n₁（空气）/ n₂（{{ mediumName }}）</div>
                <div class="card-value small">1.00 / {{ n2.toFixed(2) }}</div>
              </div>
              <div class="data-card">
                <div class="card-label">光速 v₁（空气）= c / n₁</div>
                <div class="card-value small">{{ v1Display }}<span class="card-unit">×10⁸ m/s</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">光速 v₂（{{ mediumName }}）= c / n₂</div>
                <div class="card-value small">{{ v2Display }}<span class="card-unit">×10⁸ m/s</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">速度比 v₁ / v₂ = n₂ / n₁</div>
                <div class="card-value small">{{ (n2 / n1).toFixed(2) }}<span class="card-unit">×</span></div>
              </div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">速度对比</div>
            <div class="speed-bars">
              <div class="speed-row">
                <span class="speed-name">空气 v₁</span>
                <div class="speed-track"><div class="speed-fill air" :style="{ width: '100%' }"></div></div>
                <span class="speed-val">{{ v1Display }}</span>
              </div>
              <div class="speed-row">
                <span class="speed-name">{{ mediumName }} v₂</span>
                <div class="speed-track"><div class="speed-fill medium" :style="{ width: (v2 / v1 * 100) + '%' }"></div></div>
                <span class="speed-val">{{ v2Display }}</span>
              </div>
            </div>
            <div class="speed-note">光速 v = c / n：介质折射率越大，光速越慢</div>
          </div>

          <div class="data-group">
            <div class="group-title">验证结论</div>
            <div class="nature-box real">
              <div class="nature-main">✅ n₁ sin i = n₂ sin r</div>
              <div class="nature-sub">{{ snellCheck }}</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">折射规律要点</div>
            <div class="point-list">
              <div class="point-item">① 折射光线、入射光线、法线在同一平面内</div>
              <div class="point-item">② 折射光线与入射光线分居法线两侧</div>
              <div class="point-item">③ 光从空气斜射入介质：折射角 < 入射角（光速变小）</div>
              <div class="point-item">④ 垂直入射（i = 0°）：方向不变，沿原路进入</div>
              <div class="point-item">⑤ 光路可逆：光从介质射向空气时，折射角 > 入射角</div>
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
import { refractionConfig } from '@/config/experiments/optics/refraction.js'
import { OpticsEngine } from '@/utils/physics/PhysicsEngine.js'
import { refractionAngle, lightSpeedInMedium, degToRad, radToDeg, round } from '@/utils/physics/physicsUtils.js'

const config = refractionConfig

// ========== 物理常量 ==========
const n1 = 1.0        // 上方介质：空气
const C = 3e8         // 真空中光速 m/s

// ========== 交互状态 ==========
const theta = ref(60)           // 光线方向与水平面夹角（1~179°；90° = 垂直入射）
const n2 = ref(1.33)            // 下方介质折射率（1.00~2.50）
const showNormal = ref(true)    // 显示法线
const showAngles = ref(true)    // 显示角度标注
const runState = ref('idle')
const rayProgress = ref([])

// 介质名称
const mediumName = computed(() => {
  if (Math.abs(n2.value - 1.33) < 0.02) return '水'
  if (Math.abs(n2.value - 1.50) < 0.02) return '玻璃'
  if (Math.abs(n2.value - 2.42) < 0.02) return '钻石'
  return n2.value <= 1.02 ? '空气' : '介质'
})

// 入射角（与竖直法线夹角）
const incidentAngle = computed(() => Math.abs(90 - theta.value))
// 折射角（斯涅耳定律；n₂≥1 时不会全反射）
const refractedAngle = computed(() => refractionAngle(n1, n2.value, incidentAngle.value))
// 介质中光速（n = c/v）
const v1 = computed(() => lightSpeedInMedium(n1, C))
const v2 = computed(() => lightSpeedInMedium(n2.value, C))
const v1Display = computed(() => (v1.value / 1e8).toFixed(2))
const v2Display = computed(() => (v2.value / 1e8).toFixed(2))

// 斯涅耳验证数值
const snellCheck = computed(() => {
  const i = incidentAngle.value
  const r = refractedAngle.value
  if (r === null) return '—'
  const lhs = round(n1 * Math.sin(degToRad(i)), 4)
  const rhs = round(n2.value * Math.sin(degToRad(r)), 4)
  return `左边 n₁ sin i = ${lhs}，右边 n₂ sin r = ${rhs}，两式相等 ✓`
})

// ========== 光学引擎：光线动画 + 标注时钟 ==========
const engine = new OpticsEngine()
engine.addRay({ id: 'ray-beam', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.5, delay: 0 })
engine.addRay({ id: 'ray-annot-in', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.6, delay: 2.0 })
engine.addRay({ id: 'ray-annot-ref', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.6, delay: 2.4 })
engine.onUpdate = (state) => {
  rayProgress.value = state.rays
  runState.value = state.state
}
engine.reset()

// 参数变化 → 动画清零重播
watch([theta, n2], () => {
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

const surfaceY = computed(() => canvasH.value * 0.55) // 液面高度
const O = computed(() => ({ x: canvasW.value / 2, y: surfaceY.value })) // 入射点

// 向量旋转（角度制，数学正方向）
const rot = (v, deg) => {
  const rad = degToRad(deg)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos }
}

// ========== 光线几何 ==========
// 入射方向（传播方向：θ<90 从左上射下，θ>90 从右上射下，90 竖直向下）
const inDir = computed(() => ({ x: Math.cos(degToRad(theta.value)), y: Math.sin(degToRad(theta.value)) }))

// 折射方向：水平分量按 sin r 偏向入射侧的反侧，竖直分量向下 cos r
const refDir = computed(() => {
  const r = refractedAngle.value
  if (r === null) return { x: 0, y: 1 }
  const side = theta.value < 90 ? 1 : -1
  return { x: side * Math.sin(degToRad(r)), y: Math.cos(degToRad(r)) }
})

// 入射光线长度（保证光源在画布内）
const LIn = computed(() => {
  const d = inDir.value
  let L = 200
  L = Math.min(L, (surfaceY.value - 30) / Math.max(d.y, 1e-6))
  if (d.x > 0.01) L = Math.min(L, (O.value.x - 30) / d.x)
  else if (d.x < -0.01) L = Math.min(L, (canvasW.value - 30 - O.value.x) / -d.x)
  return Math.max(L, 40)
})

// 折射光线长度（保证折射端在画布内）
const LRef = computed(() => {
  const d = refDir.value
  let L = 200
  L = Math.min(L, (canvasH.value - surfaceY.value - 30) / Math.max(d.y, 1e-6))
  if (d.x > 0.01) L = Math.min(L, (O.value.x - 30) / d.x)
  else if (d.x < -0.01) L = Math.min(L, (canvasW.value - 30 - O.value.x) / -d.x)
  return Math.max(L, 40)
})

const source = computed(() => ({ x: O.value.x - inDir.value.x * LIn.value, y: O.value.y - inDir.value.y * LIn.value }))
const refEnd = computed(() => ({ x: O.value.x + refDir.value.x * LRef.value, y: O.value.y + refDir.value.y * LRef.value }))

// ========== 标注进度（角度标注渐显） ==========
const annotIn = computed(() => {
  const r = rayProgress.value.find(x => x.id === 'ray-annot-in')
  return r ? r.progress : 0
})
const annotRef = computed(() => {
  const r = rayProgress.value.find(x => x.id === 'ray-annot-ref')
  return r ? r.progress : 0
})

// ========== 画布状态 ==========
const canvasState = computed(() => ({
  theta: theta.value,
  n2: n2.value,
  mediumName: mediumName.value,
  incidentAngle: incidentAngle.value,
  refractedAngle: refractedAngle.value,
  showNormal: showNormal.value,
  showAngles: showAngles.value,
  O: O.value,
  surfaceY: surfaceY.value,
  inDir: inDir.value,
  refDir: refDir.value,
  source: source.value,
  refEnd: refEnd.value,
  rays: rayProgress.value,
  engineState: engine.state,
  annotIn: annotIn.value,
  annotRef: annotRef.value
}))

// ========== 绘制函数 ==========
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

const drawScene = (ctx, state, utils) => {
  const { O, surfaceY } = state

  // ① 液体区域（液面下方半透明蓝）
  ctx.save()
  ctx.fillStyle = 'rgba(74, 144, 226, 0.12)'
  ctx.fillRect(0, surfaceY, utils.canvasWidth, utils.canvasHeight - surfaceY)
  ctx.restore()

  // ② 液面（深蓝粗线）
  ctx.save()
  ctx.strokeStyle = '#3a7bd5'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(24, surfaceY)
  ctx.lineTo(utils.canvasWidth - 24, surfaceY)
  ctx.stroke()
  ctx.restore()

  // ③ 法线（竖直虚线，过入射点 O）
  if (state.showNormal) {
    ctx.save()
    ctx.strokeStyle = '#9aa3af'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 5])
    ctx.beginPath()
    ctx.moveTo(O.x, 24)
    ctx.lineTo(O.x, utils.canvasHeight - 24)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#888'
    ctx.font = '12px "Microsoft YaHei"'
    ctx.textAlign = 'center'
    ctx.fillText('法线', O.x + 14, 40)
    ctx.restore()
  }

  // ④ 光线（入射红 → 折射蓝，接力式动画）
  const ray = state.rays.find(r => r.id === 'ray-beam')
  const progress = state.engineState === 'idle' ? 1 : (ray ? ray.progress : 1)
  const lenIn = dist(state.source, O)
  const lenRef = dist(O, state.refEnd)
  const remain = (lenIn + lenRef) * Math.max(0, Math.min(1, progress))
  // 入射段：红，箭头指向 O
  drawRayPath(ctx, [{ from: state.source, to: O }], Math.min(1, remain / lenIn), '#e74c3c', 2.4)
  // 折射段：蓝，入射段完成后立即进入介质
  drawRayPath(ctx, [{ from: O, to: state.refEnd }], Math.max(0, Math.min(1, (remain - lenIn) / lenRef)), '#1890ff', 2.4)

  // ⑤ 角度标注（入射角 / 折射角弧线，渐显）
  if (state.showAngles) {
    const pIn = state.engineState === 'idle' ? 1 : state.annotIn
    const pRef = state.engineState === 'idle' ? 1 : state.annotRef
    // 入射弧：法线向上 (0,-1) ↔ 光源方向（-inDir）
    drawAngleArc(ctx, O, { x: 0, y: -1 }, { x: -state.inDir.x, y: -state.inDir.y }, 34, '#e74c3c', `i = ${state.incidentAngle}°`, 52, pIn)
    // 折射弧：法线向下 (0,1) ↔ 折射方向
    if (state.refractedAngle !== null && state.incidentAngle > 0) {
      drawAngleArc(ctx, O, { x: 0, y: 1 }, state.refDir, 30, '#1890ff', `r = ${state.refractedAngle.toFixed(1)}°`, 48, pRef)
    }
  }

  // ⑥ 入射点 O 标记
  ctx.save()
  ctx.fillStyle = '#444'
  ctx.beginPath()
  ctx.arc(O.x, O.y, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // ⑦ 介质标签
  ctx.save()
  ctx.font = '13px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#e67e22'
  ctx.fillText('空气  n₁ = 1.00', O.x, surfaceY - 14)
  ctx.fillStyle = '#3a7bd5'
  ctx.fillText(`${state.mediumName}  n₂ = ${state.n2.toFixed(2)}`, O.x, surfaceY + 24)
  ctx.restore()
}

// 角度弧线标注：弧线随 progress 渐进生长，文字淡入
const drawAngleArc = (ctx, O, fromDir, toDir, radius, color, label, labelR, progress = 1) => {
  const a0 = Math.atan2(fromDir.y, fromDir.x)
  const a1 = Math.atan2(toDir.y, toDir.x)
  let delta = ((a1 - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  if (Math.abs(delta) < 0.02) return
  const p = Math.max(0, Math.min(1, progress))
  if (p <= 0) return
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(O.x, O.y, radius, a0, a0 + delta * p, delta < 0)
  ctx.stroke()
  const mid = a0 + delta / 2
  ctx.fillStyle = color
  ctx.font = 'bold 13px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = Math.min(1, (p - 0.35) / 0.65)
  ctx.fillText(label, O.x + Math.cos(mid) * labelR, O.y + Math.sin(mid) * labelR)
  ctx.restore()
}

// 光线路径按进度裁剪绘制 + 段中点方向箭头
const drawRayPath = (ctx, segments, progress, color, width) => {
  let total = 0
  segments.forEach(s => { total += dist(s.from, s.to) })
  let remain = total * Math.max(0, Math.min(1, progress))

  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'

  for (const s of segments) {
    const len = dist(s.from, s.to)
    if (remain <= 0) break
    const t = Math.min(1, remain / len)
    const ex = s.from.x + (s.to.x - s.from.x) * t
    const ey = s.from.y + (s.to.y - s.from.y) * t
    ctx.beginPath()
    ctx.moveTo(s.from.x, s.from.y)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    if (remain >= len * 0.5) {
      const mx = s.from.x + (s.to.x - s.from.x) * 0.5
      const my = s.from.y + (s.to.y - s.from.y) * 0.5
      drawRayArrow(ctx, mx, my, s.to.x - s.from.x, s.to.y - s.from.y)
    }
    remain -= len
  }
  ctx.restore()
}

const drawRayArrow = (ctx, x, y, dx, dy) => {
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const size = 7
  ctx.beginPath()
  ctx.moveTo(x + ux * size, y + uy * size)
  ctx.lineTo(x - uy * size * 0.5, y + ux * size * 0.5)
  ctx.lineTo(x + uy * size * 0.5, y - ux * size * 0.5)
  ctx.closePath()
  ctx.fill()
}

// ========== 生命周期 ==========
onUnmounted(() => {
  engine.destroy()
})
</script>

<style lang="scss" scoped>
.refraction-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 控制面板 ========== */
.refr-control {
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

  &.n2-slider {
    margin-top: 4px;
  }
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

.btn-row {
  display: flex;
  gap: 8px;
}

.style-btn {
  flex: 1;
  padding: 8px 0;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: $color-accent;
  }

  &.active {
    background: rgba(245, 166, 35, 0.18);
    border-color: $color-accent;
    color: $color-accent;
    font-weight: 600;
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

.control-hint {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 10px;
  line-height: 1.6;
}

/* ========== 数据面板 ========== */
.refr-data {
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

.formula-main {
  font-size: 18px;
  font-weight: 600;
  color: $color-accent;
  font-family: 'Georgia', 'Times New Roman', serif;
  letter-spacing: 1px;
}

.formula-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.card-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.card-value {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  line-height: 1.2;

  .card-unit {
    font-size: 12px;
    font-weight: normal;
    color: rgba(255, 255, 255, 0.5);
    margin-left: 4px;
  }

  &.small {
    font-size: 14px;
  }
}

.speed-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.speed-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.speed-name {
  width: 74px;
  color: rgba(255, 255, 255, 0.75);
  flex-shrink: 0;
}

.speed-track {
  flex: 1;
  height: 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  overflow: hidden;
}

.speed-fill {
  height: 100%;
  border-radius: 6px;

  &.air {
    background: linear-gradient(90deg, #f5a623, #ffd98a);
  }

  &.medium {
    background: linear-gradient(90deg, #3a7bd5, #6fb1ff);
  }
}

.speed-val {
  width: 58px;
  text-align: right;
  color: #fff;
  flex-shrink: 0;
}

.speed-note {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;
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
  line-height: 1.5;
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
