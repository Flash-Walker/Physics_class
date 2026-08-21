<template>
  <div class="mirror-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="runState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：参数控制 -->
      <template #control>
        <div class="mirror-control">
          <p class="control-tip">🪞 移动物体（上下左右），观察虚像：<br />正立 · 等大 · 与镜面距离相等</p>

          <!-- 物距滑块（左右移动） -->
          <div class="control-group">
            <div class="group-label">物体左右位置（物距 u：物体 → 镜面）</div>
            <input type="range" class="u-slider" min="5" max="40" step="0.5" v-model.number="u" />
            <div class="u-value">物距 u = <b>{{ u.toFixed(1) }}</b> cm</div>
          </div>

          <!-- 物体高度滑块（上下移动） -->
          <div class="control-group">
            <div class="group-label">物体上下位置（相对主光轴高度）</div>
            <input type="range" class="u-slider" min="-110" max="110" step="1" v-model.number="objOffsetY" />
            <div class="u-value">高度偏移 = <b>{{ objOffsetY > 0 ? '+' : '' }}{{ objOffsetY }}</b> px <span class="mirror-tip">{{ objOffsetY === 0 ? '在光轴上' : objOffsetY > 0 ? '光轴上方' : '光轴下方' }}</span></div>
          </div>

          <!-- 显示选项 -->
          <div class="control-group">
            <div class="group-label">显示选项</div>
            <label class="switch-row">
              <input type="checkbox" v-model="showLines" />
              <span>物像连线（虚线，被镜面平分）</span>
            </label>
            <label class="switch-row">
              <input type="checkbox" v-model="showDist" />
              <span>距离标注（物距 u / 像距 v）</span>
            </label>
          </div>

          <p class="control-hint">💡 点「开始」播放成像动画：物像连线向镜面延伸，穿过镜面后虚像逐渐显现</p>
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
        <div class="mirror-data">
          <div class="data-group">
            <div class="group-title">📐 平面镜成像规律</div>
            <div class="formula-box">
              <div class="formula-main">v = u</div>
              <div class="formula-sub">像距 = 物距（像与物关于镜面对称）</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">实时数据</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">物距 u（物体 → 镜面）</div>
                <div class="card-value">{{ u.toFixed(1) }}<span class="card-unit">cm</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">像距 v（镜面 → 虚像）</div>
                <div class="card-value">{{ v.toFixed(1) }}<span class="card-unit">cm</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">像高 h′</div>
                <div class="card-value">{{ OBJ_H_CM.toFixed(1) }}<span class="card-unit">cm（= 物高，等大）</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">物像连线中点</div>
                <div class="card-value small">落在镜面上 ✅</div>
              </div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">验证结论</div>
            <div class="nature-box real">
              <div class="nature-main">✅ 像距 = 物距，像与物等大</div>
              <div class="nature-sub">无论物体移到哪里，虚像始终与物体关于镜面对称</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">虚像的性质</div>
            <div class="point-list">
              <div class="point-item">① 正立：与物体方向一致（不颠倒）</div>
              <div class="point-item">② 等大：像高 = 物高</div>
              <div class="point-item">③ 虚像：不是实际光线会聚而成，光屏承接不到</div>
              <div class="point-item">④ 左右相反：照镜子时你的左手在像的右边</div>
              <div class="point-item">⑤ 连线垂直镜面，且被镜面平分</div>
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
import { mirrorConfig } from '@/config/experiments/optics/mirror.js'
import { OpticsEngine } from '@/utils/physics/PhysicsEngine.js'

const config = mirrorConfig

// ========== 实验常量 ==========
const SCALE = 10      // 基准比例 px/cm（画布会自动缩放以容纳成像）
const OBJ_H = 50      // 物体/像高度 px
const OBJ_H_CM = 5.0  // 物高 cm（数据面板显示）

// ========== 交互状态 ==========
const u = ref(18)               // 物距 cm（物体→镜面，左右移动）
const objOffsetY = ref(0)       // 物体上下位置 px（相对主光轴）
const showLines = ref(true)     // 物像连线
const showDist = ref(true)      // 距离标注
const runState = ref('idle')    // 引擎运行状态
const rayProgress = ref([])     // 引擎光线进度快照

// ========== 光学引擎：驱动成像动画时钟 ==========
// 动画流程：物像连线从物体向镜面生长 → 穿过镜面延伸到虚像 → 虚像淡入。
// 引擎仅作为动画时钟（progress 0→1），origin/angleDeg 无实际意义。
const engine = new OpticsEngine()
engine.addRay({ id: 'ray-clk', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.35, delay: 0 })
engine.onUpdate = (state) => {
  rayProgress.value = state.rays
  runState.value = state.state
}
engine.reset()

// 物距/高度变化 → 动画清零重播（运行中则继续播放）
watch([u, objOffsetY], () => {
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

// 平面镜：画布正中，竖直放置
const mirrorX = computed(() => canvasW.value / 2)
const axisY = computed(() => canvasH.value / 2) // 主光轴

// ========== 自动缩放：保证物体与虚像都在画布内 ==========
const scale = computed(() => {
  let s = SCALE
  s = Math.min(s, (mirrorX.value - 70) / u.value)
  s = Math.min(s, (canvasW.value - mirrorX.value - 70) / u.value)
  return Math.max(s, 0.5)
})

// 物体（左）与虚像（右，关于镜面对称）
const objX = computed(() => mirrorX.value - u.value * scale.value)
const imgX = computed(() => mirrorX.value + u.value * scale.value)
const objBaseY = computed(() => axisY.value + objOffsetY.value) // 物体底部
const objTopY = computed(() => objBaseY.value - OBJ_H)         // 物体顶部（向上）
const imgTopY = computed(() => objTopY.value)                  // 虚像顶部（正立等大）

// 像距 = 物距（对称）
const v = computed(() => u.value)

// ========== 动画进度 ==========
const clkProgress = computed(() => {
  const r = rayProgress.value.find(x => x.id === 'ray-clk')
  return r ? r.progress : 0
})
// 连线生长进度（idle 时完整显示）
// 注意：条件用响应式 runState——engine.state 是普通属性，computed 不跟踪它，
// 三元短路会让 clkProgress 从未被读取、computed 永不失效（动画卡在完整画面）
const lineProgress = computed(() => (runState.value === 'idle' ? 1 : clkProgress.value))
// 虚像淡入：连线画到约 1/3 后开始显现
const imgAlpha = computed(() => (runState.value === 'idle' ? 1 : Math.max(0, Math.min(1, (clkProgress.value - 0.35) / 0.65))))

// ========== 画布状态 ==========
const canvasState = computed(() => ({
  u: u.value,
  v: v.value,
  objX: objX.value,
  imgX: imgX.value,
  objBaseY: objBaseY.value,
  objTopY: objTopY.value,
  imgTopY: imgTopY.value,
  mirrorX: mirrorX.value,
  axisY: axisY.value,
  showLines: showLines.value,
  showDist: showDist.value,
  lineProgress: lineProgress.value,
  imgAlpha: imgAlpha.value,
  engineState: engine.state
}))

// ========== 绘制函数 ==========
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

const drawScene = (ctx, state, utils) => {
  const { mirrorX, axisY } = state

  // ① 主光轴（点划线）
  ctx.save()
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1.5
  ctx.setLineDash([8, 6])
  ctx.beginPath()
  ctx.moveTo(24, axisY)
  ctx.lineTo(utils.canvasWidth - 24, axisY)
  ctx.stroke()
  ctx.restore()

  // ② 物像连线（虚线：物体顶端/底端 → 虚像顶端/底端，被镜面平分）
  if (state.showLines) {
    const p = state.lineProgress
    drawLinkLine(ctx, { x: state.objX, y: state.objTopY }, { x: state.imgX, y: state.imgTopY }, p)
    drawLinkLine(ctx, { x: state.objX, y: state.objBaseY }, { x: state.imgX, y: state.objBaseY }, p)
    // 连线与镜面的交点（中点）标记
    if (p >= 1) {
      ctx.save()
      ctx.fillStyle = '#888'
      ctx.beginPath()
      ctx.arc(mirrorX, state.objTopY, 3, 0, Math.PI * 2)
      ctx.arc(mirrorX, state.objBaseY, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  // ③ 平面镜（竖直，粗线 + 背面阴影；物在左 → 背面在右）
  drawMirror(ctx, state)

  // ④ 物体（实线，红色箭头）
  arrow(ctx, state.objX, state.objBaseY, state.objTopY, '#d33', false, '物体')

  // ⑤ 虚像（虚线，绿色箭头，淡入动画）
  ctx.save()
  ctx.globalAlpha = state.imgAlpha
  arrow(ctx, state.imgX, state.objBaseY, state.imgTopY, '#2e9e44', true, '虚像')
  ctx.restore()

  // ⑥ 距离标注（u / v，双箭头线 + 数值）
  if (state.showDist) {
    drawDistLabel(ctx, state)
  }
}

// 物像连线：从物体端向虚像端按进度生长（虚线，穿过镜面）
const drawLinkLine = (ctx, from, to, progress) => {
  const p = Math.max(0, Math.min(1, progress))
  if (p <= 0) return
  const len = dist(from, to)
  const ex = from.x + (to.x - from.x) * p
  const ey = from.y + (to.y - from.y) * p
  ctx.save()
  ctx.strokeStyle = '#8a94a6'
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 5])
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(ex, ey)
  ctx.stroke()
  ctx.restore()
}

// 平面镜：竖直粗线 + 右侧背面斜线阴影
const drawMirror = (ctx, state) => {
  const { mirrorX, axisY } = state
  const half = 115
  ctx.save()
  // 镜面粗线
  ctx.strokeStyle = '#3a4356'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(mirrorX, axisY - half)
  ctx.lineTo(mirrorX, axisY + half)
  ctx.stroke()
  // 背面阴影线（右侧）
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 1.5
  for (let y = axisY - half + 8; y <= axisY + half - 8; y += 12) {
    ctx.beginPath()
    ctx.moveTo(mirrorX + 3, y + 4)
    ctx.lineTo(mirrorX + 10, y - 4)
    ctx.stroke()
  }
  // 标签
  ctx.fillStyle = '#3a4356'
  ctx.font = '12px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.fillText('平面镜', mirrorX, axisY + half + 18)
  ctx.restore()
}

// 距离标注：u（左）与 v（右），双箭头 + 数值
const drawDistLabel = (ctx, state) => {
  const { mirrorX, axisY, objX, imgX, u, v } = state
  const ly = axisY + 46
  ctx.save()
  ctx.font = '12px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  // 物距 u
  drawDoubleArrow(ctx, objX, ly, mirrorX, ly, '#e67e22')
  ctx.fillStyle = '#e67e22'
  ctx.fillText(`u = ${u.toFixed(1)} cm`, (objX + mirrorX) / 2, ly - 10)
  // 像距 v
  drawDoubleArrow(ctx, mirrorX, ly, imgX, ly, '#2e9e44')
  ctx.fillStyle = '#2e9e44'
  ctx.fillText(`v = ${v.toFixed(1)} cm`, (mirrorX + imgX) / 2, ly - 10)
  ctx.restore()
}

// 双箭头线段（两端都有箭头）
const drawDoubleArrow = (ctx, x0, y0, x1, y1, color) => {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
  const len = Math.hypot(x1 - x0, y1 - y0) || 1
  const ux = (x1 - x0) / len
  const uy = (y1 - y0) / len
  // 两端箭头
  for (const [ax, ay] of [[x0, y0], [x1, y1]]) {
    const dir = (ax === x0 && ay === y0) ? 1 : -1 // 起点箭头朝外，终点箭头朝外
    const sx = ux * dir
    const sy = uy * dir
    ctx.beginPath()
    ctx.moveTo(ax + sx * 8, ay + sy * 8)
    ctx.lineTo(ax - sy * 4 + sx * 0, ay + sx * 4 + sy * 0)
    ctx.lineTo(ax + sy * 4 + sx * 0, ay - sx * 4 + sy * 0)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

// 箭头（带标签，可虚线）
const arrow = (ctx, x, y0, y1, color, dashed, label) => {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 3
  if (dashed) ctx.setLineDash([7, 5])
  ctx.beginPath()
  ctx.moveTo(x, y0)
  ctx.lineTo(x, y1)
  ctx.stroke()
  ctx.setLineDash([])
  const dir = y1 > y0 ? 1 : -1
  ctx.beginPath()
  ctx.moveTo(x, y1 + dir * 9)
  ctx.lineTo(x - 6, y1 - dir * 1)
  ctx.lineTo(x + 6, y1 - dir * 1)
  ctx.closePath()
  ctx.fill()
  if (label) {
    ctx.font = '13px "Microsoft YaHei"'
    ctx.textAlign = 'center'
    ctx.fillText(label, x, y1 + dir * 24)
  }
  ctx.restore()
}

// ========== 生命周期 ==========
onUnmounted(() => {
  engine.destroy()
})
</script>

<style lang="scss" scoped>
.mirror-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 控制面板 ========== */
.mirror-control {
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
.mirror-data {
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

  &.small {
    font-size: 14px;
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
