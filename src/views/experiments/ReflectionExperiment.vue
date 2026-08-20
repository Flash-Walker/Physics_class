<template>
  <div class="reflection-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="runState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：参数控制 -->
      <template #control>
        <div class="refl-control">
          <p class="control-tip">🪞 调整入射角或转动平面镜<br />观察反射角始终等于入射角（反射定律）</p>

          <!-- 入射角滑块 -->
          <div class="control-group">
            <div class="group-label">入射角 i（入射光线与法线的夹角）</div>
            <input type="range" class="u-slider" min="0" max="85" step="1" v-model.number="incidentAngle" />
            <div class="u-value">入射角 i = <b>{{ incidentAngle }}</b>°</div>
          </div>

          <!-- 镜面角度滑块 -->
          <div class="control-group">
            <div class="group-label">平面镜角度（镜面与水平方向的夹角）</div>
            <input type="range" class="u-slider" min="0" max="90" step="1" v-model.number="mirrorAngle" />
            <div class="u-value">镜面角度 = <b>{{ mirrorAngle }}</b>° <span class="mirror-tip">{{ mirrorAngle === 90 ? '竖直（经典实验姿态）' : mirrorAngle === 0 ? '水平' : '倾斜' }}</span></div>
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
              <span>角度标注（入射角 / 反射角）</span>
            </label>
          </div>

          <p class="control-hint">💡 点「开始」播放光线传播动画：入射光线射到镜面，反射光线弹开</p>
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
        <div class="refl-data">
          <div class="data-group">
            <div class="group-title">📐 反射定律</div>
            <div class="formula-box">
              <div class="formula-main">r = i</div>
              <div class="formula-sub">反射角 = 入射角</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">实时数据</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">入射角 i（入射线 ↔ 法线）</div>
                <div class="card-value">{{ incidentAngle }}<span class="card-unit">°</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">反射角 r（反射线 ↔ 法线）</div>
                <div class="card-value">{{ reflectAngle }}<span class="card-unit">°</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">入射光线 ↔ 镜面夹角</div>
                <div class="card-value">{{ 90 - incidentAngle }}<span class="card-unit">°</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">反射光线 ↔ 镜面夹角</div>
                <div class="card-value">{{ 90 - reflectAngle }}<span class="card-unit">°</span></div>
              </div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">验证结论</div>
            <div class="nature-box real">
              <div class="nature-main">✅ 反射角 = 入射角 = {{ incidentAngle }}°</div>
              <div class="nature-sub">无论怎样改变入射角或转动镜面，两角始终相等</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">反射定律要点</div>
            <div class="point-list">
              <div class="point-item">① 三线共面：入射光线、反射光线、法线在同一平面内</div>
              <div class="point-item">② 分居两侧：反射光线与入射光线分居法线两侧</div>
              <div class="point-item">③ 两角相等：反射角 = 入射角</div>
              <div class="point-item">④ 光路可逆：沿反射光方向入射，将沿原入射光方向反射</div>
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
import { reflectionConfig } from '@/config/experiments/optics/reflection.js'
import { OpticsEngine } from '@/utils/physics/PhysicsEngine.js'
import { reflectionAngle, degToRad } from '@/utils/physics/physicsUtils.js'

const config = reflectionConfig

// ========== 交互状态 ==========
const incidentAngle = ref(40)   // 入射角 i（0~85°）
const mirrorAngle = ref(90)     // 镜面与水平方向夹角（0~90°，默认竖直）
const showNormal = ref(true)    // 显示法线
const showAngles = ref(true)    // 显示角度标注
const runState = ref('idle')    // 引擎运行状态
const rayProgress = ref([])     // 引擎光线进度快照

// ========== 光学引擎：驱动光线传播动画 ==========
// 光线路径由组件按反射定律实时计算（折线：光源→入射点→反射方向），
// 引擎仅作为动画时钟（progress 0→1 推进）。
const engine = new OpticsEngine()
engine.addRay({ id: 'ray-beam', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.5, delay: 0 })
engine.onUpdate = (state) => {
  rayProgress.value = state.rays
  runState.value = state.state
}
engine.reset()

// 入射角/镜面角度变化 → 光线进度清零重播（运行中则继续播放）
watch([incidentAngle, mirrorAngle], () => {
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

// 入射点 O = 画布中心
const O = computed(() => ({ x: canvasW.value / 2, y: canvasH.value / 2 }))
// 光线最大长度：保证任意方向都在画布内
const rayLen = computed(() => Math.min(250, canvasH.value / 2 - 40, canvasW.value / 2 - 40))

// ========== 反射几何 ==========
// 法线方向：候选 (-sinθ, cosθ) 与 (sinθ, -cosθ)，选更靠"左"的（入射侧）；平局选朝上的
const normalDir = computed(() => {
  const rad = degToRad(mirrorAngle.value)
  const s = Math.sin(rad)
  const c = Math.cos(rad)
  const n1 = { x: -s, y: c }
  const n2 = { x: s, y: -c }
  const dot1 = n1.x * -1 // 与 (-1, 0) 点积
  const dot2 = n2.x * -1
  if (Math.abs(dot1 - dot2) < 1e-9) {
    // 平局：选 y 更小（朝上）的
    return n1.y <= n2.y ? n1 : n2
  }
  return dot1 > dot2 ? n1 : n2
})

// 向量旋转（数学正方向）：rot(v, α)
const rot = (v, deg) => {
  const rad = degToRad(deg)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos }
}

// O→光源方向（与法线夹角 = 入射角 i）
const inDir = computed(() => rot(normalDir.value, incidentAngle.value))
// 反射方向（与法线夹角 = 反射角 r，在法线另一侧）
const refDir = computed(() => rot(normalDir.value, -incidentAngle.value))

// 光源位置 / 反射光线端点
const source = computed(() => ({ x: O.value.x + inDir.value.x * rayLen.value, y: O.value.y + inDir.value.y * rayLen.value }))
const reflectEnd = computed(() => ({ x: O.value.x + refDir.value.x * rayLen.value, y: O.value.y + refDir.value.y * rayLen.value }))

// 镜面两端点（半长 110px）
const MIRROR_HALF = 110
const mirrorDir = computed(() => ({ x: Math.cos(degToRad(mirrorAngle.value)), y: Math.sin(degToRad(mirrorAngle.value)) }))
const mirrorA = computed(() => ({ x: O.value.x - mirrorDir.value.x * MIRROR_HALF, y: O.value.y - mirrorDir.value.y * MIRROR_HALF }))
const mirrorB = computed(() => ({ x: O.value.x + mirrorDir.value.x * MIRROR_HALF, y: O.value.y + mirrorDir.value.y * MIRROR_HALF }))

// 反射角（复用 utils：反射角 = 入射角）
const reflectAngle = computed(() => reflectionAngle(incidentAngle.value))

// ========== 光线路径（光源 → O → 反射端） ==========
const rayPaths = computed(() => [{
  id: 'ray-beam',
  color: '#e74c3c',
  segments: [
    { from: source.value, to: O.value },
    { from: O.value, to: reflectEnd.value }
  ]
}])

// ========== 画布状态 ==========
const canvasState = computed(() => ({
  incidentAngle: incidentAngle.value,
  mirrorAngle: mirrorAngle.value,
  showNormal: showNormal.value,
  showAngles: showAngles.value,
  O: O.value,
  normalDir: normalDir.value,
  inDir: inDir.value,
  refDir: refDir.value,
  source: source.value,
  reflectEnd: reflectEnd.value,
  mirrorA: mirrorA.value,
  mirrorB: mirrorB.value,
  rays: rayProgress.value,
  engineState: engine.state,
  rayPaths: rayPaths.value
}))

// ========== 绘制函数 ==========
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

const drawScene = (ctx, state, utils) => {
  const { O, normalDir } = state

  // ① 平面镜（粗线 + 背面阴影线）
  drawMirror(ctx, state)

  // ② 法线（虚线，两端出头）
  if (state.showNormal) {
    const nLen = rayLen.value * 0.45
    ctx.save()
    ctx.strokeStyle = '#9aa3af'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 5])
    ctx.beginPath()
    ctx.moveTo(O.x - normalDir.x * nLen, O.y - normalDir.y * nLen)
    ctx.lineTo(O.x + normalDir.x * nLen, O.y + normalDir.y * nLen)
    ctx.stroke()
    ctx.setLineDash([])
    // 法线标签（法线指向入射侧的一端）
    ctx.fillStyle = '#888'
    ctx.font = '12px "Microsoft YaHei"'
    ctx.textAlign = 'center'
    ctx.fillText('法线', O.x + normalDir.x * (nLen + 16), O.y + normalDir.y * (nLen + 16))
    ctx.restore()
  }

  // ③ 光线（入射红 + 反射蓝，带方向箭头）
  const ray = state.rays.find(r => r.id === 'ray-beam')
  const progress = state.engineState === 'idle' ? 1 : (ray ? ray.progress : 1)
  // 入射段：红，箭头指向 O
  drawRayPath(ctx, [{ from: state.source, to: O }], progress, '#e74c3c', 2.4)
  // 反射段：蓝，箭头远离 O
  drawRayPath(ctx, [{ from: O, to: state.reflectEnd }], progress, '#1890ff', 2.4)

  // ④ 角度标注（入射角 / 反射角弧线 + 数值）
  if (state.showAngles) {
    drawAngleArc(ctx, O, state.inDir, normalDir, 34, '#e74c3c', `i = ${state.incidentAngle}°`, 52)
    drawAngleArc(ctx, O, normalDir, state.refDir, 26, '#1890ff', `r = ${state.reflectAngle}°`, 44)
  }

  // ⑤ 入射点 O 标记
  ctx.save()
  ctx.fillStyle = '#444'
  ctx.beginPath()
  ctx.arc(O.x, O.y, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = '13px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#666'
  ctx.fillText('O', O.x, O.y + 20)
  ctx.restore()
}

// 平面镜：粗线 + 背面斜线阴影
const drawMirror = (ctx, state) => {
  const { mirrorA, mirrorB, O, normalDir } = state
  ctx.save()
  // 镜面粗线
  ctx.strokeStyle = '#3a4356'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(mirrorA.x, mirrorA.y)
  ctx.lineTo(mirrorB.x, mirrorB.y)
  ctx.stroke()
  // 背面阴影线（沿镜面方向等距短斜线）
  const back = { x: -normalDir.x, y: -normalDir.y } // 背面方向
  const dx = mirrorB.x - mirrorA.x
  const dy = mirrorB.y - mirrorA.y
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 1.5
  for (let t = -len / 2 + 6; t <= len / 2 - 6; t += 10) {
    const bx = O.x + ux * t
    const by = O.y + uy * t
    ctx.beginPath()
    ctx.moveTo(bx + back.x * 2, by + back.y * 2)
    ctx.lineTo(bx + back.x * 9, by + back.y * 9)
    ctx.stroke()
  }
  // 标签（背面侧）
  ctx.fillStyle = '#3a4356'
  ctx.font = '12px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.fillText('平面镜', O.x + back.x * 26, O.y + back.y * 26 + 4)
  ctx.restore()
}

// 角度弧线标注：从 aFrom 方向到 aTo 方向画弧，标 label
const drawAngleArc = (ctx, O, fromDir, toDir, radius, color, label, labelR) => {
  const a0 = Math.atan2(fromDir.y, fromDir.x)
  const a1 = Math.atan2(toDir.y, toDir.x)
  // 归一化差值到 [-180°, 180°]
  let delta = ((a1 - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  if (Math.abs(delta) < 0.02) return // 夹角为 0（垂直入射），不画弧
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(O.x, O.y, radius, a0, a0 + delta, delta < 0)
  ctx.stroke()
  // 标签放在弧中点外侧
  const mid = a0 + delta / 2
  ctx.fillStyle = color
  ctx.font = 'bold 13px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, O.x + Math.cos(mid) * labelR, O.y + Math.sin(mid) * labelR)
  ctx.restore()
}

// 光线路径按进度裁剪绘制 + 段末方向箭头
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
    if (t >= 1) {
      drawRayArrow(ctx, ex, ey, s.to.x - s.from.x, s.to.y - s.from.y)
    }
    remain -= len
  }
  ctx.restore()
}

// 光线方向小箭头（三角）
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
.reflection-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 控制面板 ========== */
.refl-control {
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

  .mirror-tip {
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

.control-hint {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 10px;
  line-height: 1.6;
}

/* ========== 数据面板 ========== */
.refl-data {
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
  font-size: 20px;
  font-weight: 600;
  color: $color-accent;
  font-family: 'Georgia', 'Times New Roman', serif;
  letter-spacing: 1px;
}

.formula-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
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
