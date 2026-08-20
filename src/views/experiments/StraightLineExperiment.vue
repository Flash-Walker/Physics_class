<template>
  <div class="straight-line-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="runState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：参数控制 -->
      <template #control>
        <div class="sl-control">
          <!-- 探究引导卡片 -->
          <div class="guide-card" :class="{ done: guideDone }">
            <div class="guide-header">
              <span class="guide-title">🧪 探究引导</span>
              <span class="guide-step">{{ guideDone ? '已完成' : `第 ${currentStep + 1}/${steps.length} 步` }}</span>
            </div>
            <div class="guide-dots">
              <span
                v-for="(s, i) in steps"
                :key="i"
                class="dot"
                :class="{ active: i === currentStep && !guideDone, done: i < currentStep || guideDone }"
              ></span>
            </div>

            <template v-if="!guideDone">
              <p class="guide-task">{{ steps[currentStep].task }}</p>
              <div class="guide-options">
                <button
                  v-for="(opt, i) in steps[currentStep].options"
                  :key="i"
                  class="guide-opt"
                  @click="answerStep(i)"
                >{{ opt }}</button>
              </div>
              <p v-if="hintText" class="guide-hint">💡 {{ hintText }}</p>
            </template>
            <div v-else class="guide-congrats">
              <span>🎉 探究完成！你已经发现了小孔成像的全部规律</span>
              <button class="guide-reset" @click="resetGuide">再玩一次</button>
            </div>
          </div>

          <!-- 物距滑块 -->
          <div class="control-group">
            <div class="group-label">物距 u（物体 → 小孔）</div>
            <input type="range" class="u-slider" min="8" max="40" step="0.5" v-model.number="u" />
            <div class="u-value">u = <b>{{ u.toFixed(1) }}</b> cm</div>
          </div>

          <!-- 像距滑块 -->
          <div class="control-group">
            <div class="group-label">像距 v（小孔 → 光屏）</div>
            <input type="range" class="u-slider" min="8" max="35" step="0.5" v-model.number="v" />
            <div class="u-value">v = <b>{{ v.toFixed(1) }}</b> cm</div>
          </div>

          <!-- 小孔形状 -->
          <div class="control-group">
            <div class="group-label">小孔形状（试试切换，观察像的变化！）</div>
            <div class="btn-row">
              <button class="style-btn" :class="{ active: holeShape === 'circle' }" @click="holeShape = 'circle'">● 圆形</button>
              <button class="style-btn" :class="{ active: holeShape === 'square' }" @click="holeShape = 'square'">■ 方形</button>
              <button class="style-btn" :class="{ active: holeShape === 'triangle' }" @click="holeShape = 'triangle'">▲ 三角</button>
            </div>
          </div>

          <!-- 孔径大小 -->
          <div class="control-group">
            <div class="group-label">孔径大小</div>
            <input type="range" class="u-slider" min="2" max="12" step="1" v-model.number="holeRadius" />
            <div class="u-value">
              孔径 = <b>{{ holeRadius }}</b> px
              <span class="hole-tip">{{ holeRadius >= 8 ? '孔太大：像变模糊了' : holeRadius <= 3 ? '孔很小：像清晰但偏暗' : '适中：像清晰明亮' }}</span>
            </div>
          </div>

          <!-- 物体样式 -->
          <div class="control-group">
            <div class="group-label">物体样式</div>
            <div class="btn-row">
              <button class="style-btn" :class="{ active: objectStyle === 'arrow' }" @click="objectStyle = 'arrow'">↑ 箭头</button>
              <button class="style-btn" :class="{ active: objectStyle === 'candle' }" @click="objectStyle = 'candle'">🕯 蜡烛</button>
            </div>
          </div>

          <!-- 显示开关 -->
          <div class="control-group">
            <div class="group-label">显示选项</div>
            <label class="switch-row">
              <input type="checkbox" v-model="showRays" />
              <span>特征光线（光路）</span>
            </label>
          </div>

          <p class="control-hint">💡 点「开始」播放光路动画：三条光线依次穿过小孔，在光屏上"画出"倒立的像</p>
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
        <div class="sl-data">
          <div class="data-group">
            <div class="group-title">📐 相似三角形公式</div>
            <div class="formula-box">
              <div class="formula-main">h′/h = v/u</div>
              <div class="formula-sub">像高 / 物高 = 像距 / 物距</div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">实时数据</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">物距 u</div>
                <div class="card-value">{{ u.toFixed(1) }}<span class="card-unit">cm</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">像距 v</div>
                <div class="card-value">{{ v.toFixed(1) }}<span class="card-unit">cm</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">像高 h′ = h × v/u（物高 4.4cm）</div>
                <div class="card-value">{{ imgHDisplay }}<span class="card-unit">cm</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">放大率 m = v/u</div>
                <div class="card-value">{{ mag.toFixed(2) }}<span class="card-unit">×</span></div>
              </div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">像的性质</div>
            <div class="nature-box real">
              <div class="nature-main">倒立 · 实像</div>
              <div class="nature-sub">由实际光线会聚而成，光屏上可承接</div>
            </div>
            <div class="app-box">
              <span class="app-label">小孔形状</span>
              <span class="app-value">{{ shapeName }}</span>
            </div>
            <div class="app-box dim">
              <span class="app-label">像的形状由谁决定？</span>
              <span class="app-value">只由物体决定，与小孔形状无关</span>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">公式展开</div>
            <div class="formula-detail">
              <div class="detail-line">h′ = h × v/u = 4.4 × {{ v.toFixed(1) }} / {{ u.toFixed(1) }}</div>
              <div class="detail-line judge">= {{ imgHDisplay }} cm（{{ mag >= 1 ? '放大' : '缩小' }}像）</div>
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
import { straightLineConfig } from '@/config/experiments/optics/straight-line.js'
import { OpticsEngine } from '@/utils/physics/PhysicsEngine.js'
import { pinholeImageHeight } from '@/utils/physics/physicsUtils.js'

const config = straightLineConfig

// ========== 实验常量 ==========
const SCALE = 10      // 基准比例 px/cm（画布会自动缩放以容纳成像）
const OBJ_H = 44      // 物体高度 px（≈4.4cm，纵向示意）
const OBJ_H_CM = 4.4  // 物高 cm（数据面板计算用）

// ========== 交互状态 ==========
const u = ref(25)                 // 物距 cm（物体→小孔）
const v = ref(15)                 // 像距 cm（小孔→光屏）
const holeShape = ref('circle')   // 小孔形状：circle | square | triangle
const holeRadius = ref(4)         // 小孔半径 px（2~12）
const objectStyle = ref('candle') // arrow | candle（小孔成像经典实验用蜡烛）
const showRays = ref(true)        // 特征光线
const runState = ref('idle')      // 引擎运行状态
const rayProgress = ref([])       // 引擎光线进度快照

// ========== 光学引擎：驱动光路传播动画 ==========
// 说明：光线路径由组件按小孔成像几何实时计算（折线：物体→小孔→光屏），
// 引擎仅作为动画时钟（progress 0→1 推进），origin/angleDeg 无实际意义。
const engine = new OpticsEngine()
engine.addRay({ id: 'ray-top', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.5, delay: 0 })
engine.addRay({ id: 'ray-mid', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.5, delay: 0.3 })
engine.addRay({ id: 'ray-bottom', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.5, delay: 0.6 })
engine.onUpdate = (state) => {
  rayProgress.value = state.rays
  runState.value = state.state
}
// 初始化引擎（触发一次 onUpdate，同步初始进度）
engine.reset()

// 物距/像距变化 → 光线进度清零重播（运行中则继续播放）
watch([u, v], () => {
  const wasRunning = engine.state === 'running'
  engine.reset()
  if (wasRunning) engine.start()
})

// ========== 按钮事件 ==========
const handleStart = () => engine.start()
const handlePause = () => engine.pause()
const handleReset = () => engine.reset()

// ========== 探究引导（5 步闯关） ==========
const steps = [
  { task: '观察光屏上的像，它是正立的还是倒立的？', options: ['正立', '倒立'], answer: 1, hint: '再仔细看：物体顶端的光线穿过小孔后，打到了光屏的上方还是下方？' },
  { task: '把物距 u 调大（物体远离小孔），光屏上的像会？', options: ['变大', '变小'], answer: 1, hint: '物体越远，穿过小孔的光线夹角越小。试试把 u 从 25 拉到 40！' },
  { task: '把像距 v 调大（光屏远离小孔），像会？', options: ['变大', '变小'], answer: 0, hint: '光屏越远，光线散开得越多。试试把 v 从 15 拉到 35！' },
  { task: '把小孔形状换成方形或三角形，像的形状会？', options: ['跟着变', '保持不变'], answer: 1, hint: '点下面的「方形」「三角」按钮试试——像的形状由物体决定，与小孔形状无关！' },
  { task: '像的大小由什么公式决定？（h=物高，v=像距，u=物距）', options: ['h′ = h × v/u', 'h′ = h × u/v'], answer: 0, hint: '相似三角形：像高 / 物高 = 像距 / 物距' }
]
const currentStep = ref(0)
const hintText = ref('')
const guideDone = computed(() => currentStep.value >= steps.length)
const answerStep = (i) => {
  if (guideDone.value) return
  const s = steps[currentStep.value]
  if (i === s.answer) {
    hintText.value = ''
    currentStep.value++
  } else {
    hintText.value = s.hint
  }
}
const resetGuide = () => {
  currentStep.value = 0
  hintText.value = ''
}

// ========== 画布几何（依赖画布尺寸） ==========
const canvasW = ref(640)
const canvasH = ref(420)
const handleCanvasResize = ({ width, height }) => {
  canvasW.value = width
  canvasH.value = height
}

const boardX = computed(() => canvasW.value * 0.5) // 挡板位置（画布正中）
const axisY = computed(() => canvasH.value * 0.5)  // 主光轴

// ========== 自动缩放：保证物体与光屏都落在画布内 ==========
const leftSpace = computed(() => boardX.value - 70)    // 挡板左侧可用宽度
const rightSpace = computed(() => canvasW.value - boardX.value - 70) // 挡板右侧可用宽度
const scale = computed(() => {
  let s = SCALE
  s = Math.min(s, leftSpace.value / u.value)
  s = Math.min(s, rightSpace.value / v.value)
  return Math.max(s, 0.5) // 下限保护
})

const objX = computed(() => boardX.value - u.value * scale.value)
const screenX = computed(() => boardX.value + v.value * scale.value)

// ========== 成像计算（复用 utils 的相似三角形公式） ==========
const imgH = computed(() => OBJ_H * (v.value / u.value)) // 像高 px（倒立，在光轴下方）
const imgH_CM = computed(() => pinholeImageHeight(OBJ_H_CM, u.value, v.value))
const mag = computed(() => v.value / u.value)

const imgHDisplay = computed(() => imgH_CM.value.toFixed(2))
const shapeName = computed(() => ({ circle: '圆形 ○', square: '方形 □', triangle: '三角形 △' }[holeShape.value]))

// ========== 三条特征光线路径（物体顶端/中部/底端 → 小孔 → 光屏） ==========
const hole = computed(() => ({ x: boardX.value, y: axisY.value }))
const rayPaths = computed(() => {
  if (!showRays.value) return []
  const points = [
    { id: 'ray-top', yOff: -OBJ_H, imgYOff: imgH.value, color: '#e74c3c' },
    { id: 'ray-mid', yOff: -OBJ_H / 2, imgYOff: imgH.value / 2, color: '#f5a623' },
    { id: 'ray-bottom', yOff: 0, imgYOff: 0, color: '#1890ff' }
  ]
  return points.map((p) => ({
    id: p.id,
    color: p.color,
    segments: [
      { from: { x: objX.value, y: axisY.value + p.yOff }, to: hole.value },
      { from: hole.value, to: { x: screenX.value, y: axisY.value + p.imgYOff } }
    ]
  }))
})

// ========== 画布状态（传给 draw） ==========
const canvasState = computed(() => ({
  u: u.value,
  v: v.value,
  holeShape: holeShape.value,
  holeRadius: holeRadius.value,
  objectStyle: objectStyle.value,
  showRays: showRays.value,
  boardX: boardX.value,
  axisY: axisY.value,
  objX: objX.value,
  screenX: screenX.value,
  imgH: imgH.value,
  rays: rayProgress.value,
  engineState: engine.state,
  rayPaths: rayPaths.value
}))

// ========== 绘制函数 ==========
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

const drawScene = (ctx, state, utils) => {
  const { boardX, axisY } = state
  const w = utils.canvasWidth

  // 主光轴（点划线）
  ctx.save()
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1.5
  ctx.setLineDash([8, 6])
  ctx.beginPath()
  ctx.moveTo(24, axisY)
  ctx.lineTo(w - 24, axisY)
  ctx.stroke()
  ctx.restore()

  // ① 特征光线（先画，让挡板/光屏/物体盖住被遮挡的部分）
  if (state.showRays) {
    state.rayPaths.forEach((rp) => {
      const ray = state.rays.find(r => r.id === rp.id)
      const progress = state.engineState === 'idle' ? 1 : (ray ? ray.progress : 1)
      drawRayPath(ctx, rp.segments, progress, rp.color, 2.2)
    })
  }

  // ② 挡板（不透明，中间镂空小孔）
  drawBoard(ctx, state)

  // ③ 光屏
  drawScreen(ctx, state.screenX, axisY)

  // ④ 物体（蜡烛 / 箭头）
  if (state.objectStyle === 'candle') {
    drawCandle(ctx, state.objX, axisY)
  } else {
    arrow(ctx, state.objX, axisY, axisY - OBJ_H, '#d33', false, '物体')
  }

  // ⑤ 像（倒立实像，画在光屏上，清晰度/亮度随孔径变化）
  drawImageOnScreen(ctx, state)

  // ⑥ 物距/像距标注
  ctx.save()
  ctx.font = '12px "Microsoft YaHei"'
  ctx.fillStyle = '#888'
  ctx.textAlign = 'center'
  ctx.fillText(`u = ${state.u.toFixed(1)} cm`, (state.objX + boardX) / 2, axisY + 42)
  ctx.fillText(`v = ${state.v.toFixed(1)} cm`, (boardX + state.screenX) / 2, axisY + 42)
  ctx.restore()
}

// 挡板（灰色竖条 + 镂空小孔）
const drawBoard = (ctx, state) => {
  const { boardX, axisY, holeShape, holeRadius } = state
  const boardH = 230
  ctx.save()
  ctx.fillStyle = '#6b7280'
  ctx.fillRect(boardX - 7, axisY - boardH / 2, 14, boardH)
  ctx.strokeStyle = '#4b5563'
  ctx.lineWidth = 1
  ctx.strokeRect(boardX - 7, axisY - boardH / 2, 14, boardH)
  // 小孔镂空（用画布背景色填充）
  ctx.fillStyle = '#fafbfc'
  const r = holeRadius
  if (holeShape === 'circle') {
    ctx.beginPath()
    ctx.arc(boardX, axisY, r, 0, Math.PI * 2)
    ctx.fill()
  } else if (holeShape === 'square') {
    ctx.fillRect(boardX - r, axisY - r, r * 2, r * 2)
  } else {
    ctx.beginPath()
    ctx.moveTo(boardX, axisY - r * 1.4)
    ctx.lineTo(boardX - r * 1.2, axisY + r)
    ctx.lineTo(boardX + r * 1.2, axisY + r)
    ctx.closePath()
    ctx.fill()
  }
  // 标签
  ctx.fillStyle = '#666'
  ctx.font = '12px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.fillText('挡板（不透明）', boardX, axisY + boardH / 2 + 16)
  ctx.restore()
}

// 光屏（白色竖条）
const drawScreen = (ctx, x, axisY) => {
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#9aa3af'
  ctx.lineWidth = 1.5
  ctx.fillRect(x - 6, axisY - 112, 12, 224)
  ctx.strokeRect(x - 6, axisY - 112, 12, 224)
  ctx.fillStyle = '#888'
  ctx.font = '12px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.fillText('光屏', x, axisY + 130)
  ctx.restore()
}

// 光屏上的像：倒立实像（绿色），模糊度/亮度随孔径变化
const drawImageOnScreen = (ctx, state) => {
  const { screenX, axisY, imgH, holeRadius } = state
  if (imgH < 2) return
  const blur = Math.max(0, (holeRadius - 3) * 0.7) // 孔越大越模糊
  const alpha = 0.45 + (holeRadius / 12) * 0.5     // 孔越大越亮
  ctx.save()
  ctx.filter = blur > 0 ? `blur(${blur.toFixed(1)}px)` : 'none'
  ctx.globalAlpha = alpha
  // 倒立箭头：从光屏中心（光轴）向下延伸 imgH
  arrow(ctx, screenX, axisY, axisY + imgH, '#2e9e44', false, null)
  ctx.globalAlpha = 1
  ctx.filter = 'none'
  ctx.fillStyle = '#2e9e44'
  ctx.font = '12px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.fillText('像（倒立实像）', screenX, axisY + Math.min(imgH, 140) + 20)
  ctx.restore()
}

// 箭头（带标签，可虚线）
const arrow = (ctx, x, y0, y1, color, dashed, label) => {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 3
  if (dashed) ctx.setLineDash([6, 5])
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

// 蜡烛物体（火焰顶端为发光点）
const drawCandle = (ctx, x, axisY) => {
  const bodyH = OBJ_H * 0.72
  const topY = axisY - bodyH
  ctx.save()
  // 烛身
  ctx.fillStyle = '#fdf3dd'
  ctx.strokeStyle = 'rgba(0,0,0,.25)'
  ctx.lineWidth = 1
  ctx.fillRect(x - 6, topY, 12, bodyH)
  ctx.strokeRect(x - 6, topY, 12, bodyH)
  // 烛身横纹
  ctx.strokeStyle = 'rgba(0,0,0,.08)'
  ctx.beginPath()
  for (let i = 1; i <= 3; i++) {
    const yy = topY + (bodyH * i) / 4
    ctx.moveTo(x - 6, yy)
    ctx.lineTo(x + 6, yy)
  }
  ctx.stroke()
  // 烛芯
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x, topY)
  ctx.lineTo(x, topY - 5)
  ctx.stroke()
  // 火焰（外焰橙 + 内焰黄）
  const fy = topY - 5
  ctx.fillStyle = 'rgba(255,138,0,.9)'
  ctx.beginPath()
  ctx.ellipse(x, fy - 7, 5, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffe08a'
  ctx.beginPath()
  ctx.ellipse(x, fy - 5.5, 2.8, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  // 标签
  ctx.font = '13px "Microsoft YaHei"'
  ctx.fillStyle = '#d33'
  ctx.textAlign = 'center'
  ctx.fillText('物体(蜡烛)', x, axisY + 18)
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
.straight-line-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 探究引导卡片 ========== */
.guide-card {
  background: rgba(245, 166, 35, 0.08);
  border: 1px solid rgba(245, 166, 35, 0.4);
  border-radius: 8px;
  padding: 12px;

  &.done {
    border-color: rgba(82, 196, 26, 0.5);
    background: rgba(82, 196, 26, 0.08);
  }
}

.guide-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.guide-title {
  font-size: 14px;
  font-weight: 600;
  color: $color-accent;
}

.guide-step {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.guide-dots {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    transition: all 0.3s;

    &.active {
      background: $color-accent;
      box-shadow: 0 0 6px rgba(245, 166, 35, 0.6);
    }

    &.done {
      background: rgba(82, 196, 26, 0.7);
    }
  }
}

.guide-task {
  font-size: 13px;
  color: #fff;
  line-height: 1.6;
  margin: 0 0 10px;
}

.guide-options {
  display: flex;
  gap: 8px;
}

.guide-opt {
  flex: 1;
  padding: 7px 0;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: $color-accent;
    color: $color-accent;
  }
}

.guide-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: $color-accent;
  line-height: 1.6;
}

.guide-congrats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: #52c41a;
  text-align: center;
  line-height: 1.6;
}

.guide-reset {
  padding: 5px 14px;
  border: 1px solid rgba(82, 196, 26, 0.5);
  border-radius: 6px;
  background: transparent;
  color: #52c41a;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: rgba(82, 196, 26, 0.12);
  }
}

/* ========== 控制面板 ========== */
.sl-control {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

  .hole-tip {
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
.sl-data {
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
  font-size: 17px;
  font-weight: 600;
  color: #fff;
}

.nature-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.app-box {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(74, 144, 226, 0.12);
  border: 1px solid rgba(74, 144, 226, 0.35);
  border-radius: 6px;
  padding: 8px 12px;

  &.dim {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }
}

.app-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.app-value {
  font-size: 13px;
  font-weight: 600;
  color: $color-tech-blue;
}

.formula-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-line {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  word-break: break-all;

  &.judge {
    color: $color-accent;
    font-weight: 500;
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px dashed rgba(255, 255, 255, 0.12);
  }
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
