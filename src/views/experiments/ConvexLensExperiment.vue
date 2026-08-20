<template>
  <div class="convex-lens-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="runState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：参数控制 -->
      <template #control>
        <div class="lens-control">
          <p class="control-tip">🔍 凸透镜焦距 f = 10 cm<br />拖动物距滑块，观察成像变化（物近像远像变大）</p>

          <!-- 物距滑块 -->
          <div class="control-group">
            <div class="group-label">物距 u（物体到透镜距离）</div>
            <input
              type="range"
              class="u-slider"
              min="5"
              max="30"
              step="0.5"
              v-model.number="u"
            />
            <div class="u-value">
              u = <b>{{ u.toFixed(1) }}</b> cm
              <span class="u-zone">{{ zoneText }}</span>
            </div>
          </div>

          <!-- 物体样式切换 -->
          <div class="control-group">
            <div class="group-label">物体样式</div>
            <div class="btn-row">
              <button
                class="style-btn"
                :class="{ active: objectStyle === 'arrow' }"
                @click="objectStyle = 'arrow'"
              >↑ 箭头</button>
              <button
                class="style-btn"
                :class="{ active: objectStyle === 'candle' }"
                @click="objectStyle = 'candle'"
              >🕯 蜡烛</button>
            </div>
          </div>

          <!-- 显示开关 -->
          <div class="control-group">
            <div class="group-label">显示选项</div>
            <label class="switch-row">
              <input type="checkbox" v-model="showRays" />
              <span>三条特殊光线（光路）</span>
            </label>
            <label class="switch-row">
              <input type="checkbox" v-model="showScreen" />
              <span>光屏（仅实像时显示）</span>
            </label>
          </div>

          <p class="control-hint">💡 点「开始」播放光路传播动画，三条光线依次射出</p>
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
        <div class="lens-data">
          <div class="data-group">
            <div class="group-title">📐 透镜成像公式</div>
            <div class="formula-box">
              <div class="formula-main">1/f = 1/u + 1/v</div>
              <div class="formula-sub">f = 10 cm（焦距固定）</div>
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
                <div class="card-label">像距 v = uf/(u−f)</div>
                <div class="card-value">{{ vDisplay }}<span class="card-unit">cm</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">放大率 m = |v/u|</div>
                <div class="card-value">{{ magDisplay }}<span class="card-unit">×</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">像高 h′（物高 ≈ 4.4cm）</div>
                <div class="card-value">{{ imageHeightDisplay }}<span class="card-unit">cm</span></div>
              </div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">成像性质</div>
            <div class="nature-box" :class="cls.type">
              <div class="nature-main">{{ natureText }}</div>
              <div class="nature-sub">{{ natureDetail }}</div>
            </div>
            <div class="app-box">
              <span class="app-label">对应应用</span>
              <span class="app-value">{{ cls.application }}</span>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">公式展开</div>
            <div class="formula-detail">
              <div class="detail-line">v = uf/(u−f) = {{ u.toFixed(1) }}×10/({{ u.toFixed(1) }}−10)</div>
              <div class="detail-line judge">{{ formulaResult }}</div>
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
import { ref, computed, watch, onUnmounted } from 'vue'
import ExperimentLayout from '@/layouts/ExperimentLayout.vue'
import ExperimentCanvas from '@/components/ExperimentCanvas.vue'
import { convexLensConfig } from '@/config/experiments/optics/convex-lens.js'
import { OpticsEngine } from '@/utils/physics/PhysicsEngine.js'
import {
  lensImageDistance,
  lensMagnification,
  lensImageHeight,
  classifyLensImage
} from '@/utils/physics/physicsUtils.js'

const config = convexLensConfig

// ========== 实验常量 ==========
const F = 10          // 焦距 cm
const SCALE = 9       // px / cm
const OBJ_H = 40      // 物体高度 px（≈4.4cm）

// ========== 交互状态 ==========
const u = ref(25)              // 物距 cm
const objectStyle = ref('arrow')  // arrow | candle
const showRays = ref(true)     // 三条特殊光线
const showScreen = ref(true)   // 光屏
const runState = ref('idle')   // 引擎运行状态
const rayProgress = ref([])    // 引擎光线进度快照

// ========== 光学引擎：驱动三条光线的传播动画 ==========
// 说明：光线路径由 lensSpecialRays 按当前物距实时计算（折线），
// 引擎仅作为动画时钟（progress 0→1 推进），origin/angleDeg 无实际意义。
const engine = new OpticsEngine()
engine.addRay({ id: 'ray-parallel', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.45, delay: 0 })
engine.addRay({ id: 'ray-center', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.45, delay: 0.35 })
engine.addRay({ id: 'ray-focus', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.45, delay: 0.7 })
engine.onUpdate = (state) => {
  rayProgress.value = state.rays
  runState.value = state.state
}
// 初始化引擎（触发一次 onUpdate，同步初始进度）
engine.reset()

// 物距变化 → 光线进度清零重播（运行中则继续播放）
watch(u, () => {
  const wasRunning = engine.state === 'running'
  engine.reset()
  if (wasRunning) engine.start()
})

// ========== 按钮事件 ==========
const handleStart = () => engine.start()
const handlePause = () => engine.pause()
const handleReset = () => engine.reset()

// ========== 画布几何（依赖画布尺寸） ==========
const canvasW = ref(640)
const canvasH = ref(420)
const handleCanvasResize = ({ width, height }) => {
  canvasW.value = width
  canvasH.value = height
}

const lensX = computed(() => canvasW.value * 0.62) // 透镜位置（画布右侧约 62%）
const axisY = computed(() => canvasH.value * 0.5)  // 主光轴
const objX = computed(() => lensX.value - u.value * SCALE)
const tip = computed(() => ({ x: objX.value, y: axisY.value - OBJ_H }))

// ========== 成像计算（复用 physicsUtils） ==========
const v = computed(() => lensImageDistance(F, u.value))
const cls = computed(() => classifyLensImage(F, u.value))
const mag = computed(() => lensMagnification(F, u.value))
const imgX = computed(() => {
  if (!isFinite(v.value)) return lensX.value
  return Math.min(lensX.value + v.value * SCALE, canvasW.value - 50)
})
const imgH = computed(() => {
  if (!isFinite(v.value)) return 0
  return OBJ_H * (Math.abs(v.value) / u.value)
})

// 三条特殊光线路径（引擎方法计算）
const rayPaths = computed(() => {
  if (!showRays.value) return []
  return engine.lensSpecialRays(tip.value, lensX.value, F * SCALE, { length: 340 })
})

// 数据面板展示
const vDisplay = computed(() => (!isFinite(v.value) ? '—' : v.value.toFixed(1)))
const magDisplay = computed(() => (!isFinite(v.value) ? '—' : mag.value.toFixed(2)))
const imageHeightDisplay = computed(() => {
  if (!isFinite(v.value)) return '—'
  const h = lensImageHeight(OBJ_H / SCALE, F, u.value)
  return h.toFixed(1)
})
const natureText = computed(() => {
  if (cls.value.type === 'none') return '不成像'
  return `${cls.value.orientation === 'inverted' ? '倒立' : '正立'}、${sizeText.value}、${cls.value.type === 'real' ? '实像' : '虚像'}`
})
const sizeText = computed(() => {
  const map = { reduced: '缩小', same: '等大', magnified: '放大', none: '—' }
  return map[cls.value.size]
})
const natureDetail = computed(() => {
  const map = {
    'u > 2f': '物距大于二倍焦距',
    'u = 2f': '物距等于二倍焦距',
    'f < u < 2f': '物距在一倍与二倍焦距之间',
    'u = f': '物距等于焦距',
    'u < f': '物距小于焦距'
  }
  return map[zoneKey.value] || ''
})
const zoneKey = computed(() => {
  if (u.value > 2 * F) return 'u > 2f'
  if (Math.abs(u.value - 2 * F) < 1e-9) return 'u = 2f'
  if (u.value > F) return 'f < u < 2f'
  if (Math.abs(u.value - F) < 1e-9) return 'u = f'
  return 'u < f'
})
const zoneText = computed(() => {
  const map = {
    'u > 2f': 'u > 2f',
    'u = 2f': 'u = 2f',
    'f < u < 2f': 'f < u < 2f',
    'u = f': 'u = f',
    'u < f': 'u < f'
  }
  return map[zoneKey.value]
})
const formulaResult = computed(() => {
  if (!isFinite(v.value)) return 'u = f → 分母为 0，不成像（出射平行光）'
  return `= ${v.value.toFixed(1)} cm${v.value < 0 ? '（负号：虚像，与物同侧）' : ''}`
})

// ========== 画布状态（传给 draw） ==========
const canvasState = computed(() => ({
  u: u.value,
  v: v.value,
  cls: cls.value,
  objectStyle: objectStyle.value,
  showRays: showRays.value,
  showScreen: showScreen.value,
  lensX: lensX.value,
  axisY: axisY.value,
  objX: objX.value,
  tip: tip.value,
  imgX: imgX.value,
  imgH: imgH.value,
  rays: rayProgress.value,
  engineState: engine.state,
  rayPaths: rayPaths.value
}))

// ========== 绘制函数 ==========
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

const drawScene = (ctx, state, utils) => {
  const { lensX, axisY } = state
  const fPx = F * SCALE

  // 主光轴（点划线）
  ctx.save()
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1.5
  ctx.setLineDash([8, 6])
  ctx.beginPath()
  ctx.moveTo(24, axisY)
  ctx.lineTo(utils.canvasWidth - 24, axisY)
  ctx.stroke()
  ctx.restore()

  // 焦点标记
  markFocus(ctx, lensX - fPx, 'F', axisY)
  markFocus(ctx, lensX + fPx, "F'", axisY)
  markFocus(ctx, lensX - 2 * fPx, '2F', axisY)
  markFocus(ctx, lensX + 2 * fPx, "2F'", axisY)

  // 光屏（实像时）
  if (state.showScreen && state.cls.type === 'real') {
    drawScreen(ctx, state.imgX, axisY)
  }

  // 凸透镜
  drawLens(ctx, lensX, axisY)

  // 物体（箭头 / 蜡烛）
  if (state.objectStyle === 'candle') {
    drawCandle(ctx, state.objX, axisY)
  } else {
    arrow(ctx, state.objX, axisY, axisY - OBJ_H, '#d33', false, '物体')
  }

  // 三条特殊光线（idle 时显示完整光路，running/paused 按传播进度裁剪）
  if (state.showRays) {
    state.rayPaths.forEach((rp) => {
      const ray = state.rays.find(r => r.id === rp.id)
      const progress = state.engineState === 'idle' ? 1 : (ray ? ray.progress : 1)
      drawRayPath(ctx, rp.segments, progress, rp.color, 2.2)
    })

    // 虚像：画三条出射光线的反向延长线（虚线），汇聚于虚像点
    if (state.cls.type === 'virtual') {
      const virtualTip = { x: state.imgX, y: axisY - state.imgH }
      ctx.save()
      ctx.strokeStyle = 'rgba(46,158,68,.6)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 5])
      state.rayPaths.forEach((rp) => {
        // 出射点：两段光线的起点为透镜出射点；过光心光线取光心
        const exit = rp.segments.length > 1
          ? rp.segments[rp.segments.length - 1].from
          : { x: lensX, y: axisY }
        ctx.beginPath()
        ctx.moveTo(exit.x, exit.y)
        ctx.lineTo(virtualTip.x, virtualTip.y)
        ctx.stroke()
      })
      ctx.restore()
    }
  }

  // 像
  if (state.cls.type === 'real') {
    arrow(ctx, state.imgX, axisY, axisY + state.imgH, '#2e9e44', false, '实像')
  } else if (state.cls.type === 'virtual') {
    arrow(ctx, state.imgX, axisY, axisY - state.imgH, '#2e9e44', true, '虚像')
  } else {
    ctx.save()
    ctx.font = '14px "Microsoft YaHei"'
    ctx.fillStyle = '#999'
    ctx.textAlign = 'center'
    ctx.fillText('u = f：折射后为平行光，不成像', utils.canvasWidth / 2, 32)
    ctx.restore()
  }

  // 物距 / 像距标注
  ctx.save()
  ctx.font = '12px "Microsoft YaHei"'
  ctx.fillStyle = '#888'
  ctx.textAlign = 'center'
  ctx.fillText(`u = ${state.u.toFixed(1)} cm`, (state.objX + lensX) / 2, axisY + 34)
  if (state.cls.type !== 'none') {
    ctx.fillText(`v = ${state.v.toFixed(1)} cm`, (lensX + state.imgX) / 2, axisY + 34)
  }
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

// 凸透镜符号（双凸弧线 + 上下箭头 + 光心）
const drawLens = (ctx, x, axisY) => {
  const half = 78
  ctx.save()
  ctx.strokeStyle = '#2f6bff'
  ctx.fillStyle = '#2f6bff'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(x, axisY - half)
  ctx.quadraticCurveTo(x + 16, axisY, x, axisY + half)
  ctx.quadraticCurveTo(x - 16, axisY, x, axisY - half)
  ctx.stroke()
  // 上下箭头
  ctx.beginPath(); ctx.moveTo(x, axisY - half); ctx.lineTo(x, axisY - half - 10); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 6, axisY - half - 4); ctx.lineTo(x, axisY - half - 12); ctx.lineTo(x + 6, axisY - half - 4); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x, axisY + half); ctx.lineTo(x, axisY + half + 10); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 6, axisY + half + 4); ctx.lineTo(x, axisY + half + 12); ctx.lineTo(x + 6, axisY + half + 4); ctx.stroke()
  // 光心 O 与标签
  ctx.font = '13px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.fillText('O', x, axisY - 12)
  ctx.fillText('凸透镜', x + 30, axisY - half - 14)
  ctx.restore()
}

// 光屏（竖条）
const drawScreen = (ctx, x, axisY) => {
  ctx.save()
  ctx.fillStyle = 'rgba(47,107,255,.12)'
  ctx.strokeStyle = '#2f6bff'
  ctx.lineWidth = 1.5
  ctx.fillRect(x - 4, axisY - 92, 8, 184)
  ctx.strokeRect(x - 4, axisY - 92, 8, 184)
  ctx.fillStyle = '#2f6bff'
  ctx.font = '12px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.fillText('光屏', x, axisY + 108)
  ctx.restore()
}

// 蜡烛物体
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

// 焦点标记
const markFocus = (ctx, x, label, axisY) => {
  ctx.save()
  ctx.strokeStyle = '#999'
  ctx.fillStyle = '#999'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x, axisY - 7)
  ctx.lineTo(x, axisY + 7)
  ctx.stroke()
  ctx.font = '13px "Microsoft YaHei"'
  ctx.textAlign = 'center'
  ctx.fillText(label, x, axisY + 22)
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
    // 完整走完的线段：末端画传播方向箭头
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
.convex-lens-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 控制面板 ========== */
.lens-control {
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

  .u-zone {
    margin-left: 8px;
    font-size: 12px;
    color: $color-tech-blue;
    background: rgba(74, 144, 226, 0.15);
    padding: 2px 8px;
    border-radius: 8px;
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
.lens-data {
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
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);

  &.real {
    border-color: rgba(82, 196, 26, 0.5);
    background: rgba(82, 196, 26, 0.1);
  }

  &.virtual {
    border-color: rgba(245, 166, 35, 0.5);
    background: rgba(245, 166, 35, 0.1);
  }

  &.none {
    border-color: rgba(255, 255, 255, 0.2);
  }
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
}

.app-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.app-value {
  font-size: 15px;
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
