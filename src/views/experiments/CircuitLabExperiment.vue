<template>
  <div class="circuit-lab">
    <!-- 顶部工具条 -->
    <div class="toolbar">
      <div class="tb-left">
        <span class="hint">💡 点击器材添加元件 · 拖动元件移动 · 点击接线柱连线 · 单击开关/电池盒切换状态 · 选中后 Delete 删除</span>
        <div class="wire-styles">
          <button
            v-for="s in wireStyles"
            :key="s.key"
            class="ws-btn"
            :class="{ on: wireStyle === s.key }"
            @click="wireStyle = s.key"
          >
            {{ s.name }}
          </button>
        </div>
      </div>
      <button class="clear-btn" @click="clearAll">🗑 清空画布</button>
    </div>

    <div class="main">
      <!-- 器材栏 -->
      <aside class="parts-bar">
        <div class="bar-title">器材栏</div>
        <button
          v-for="p in partButtons"
          :key="p.key"
          class="part-btn"
          @click="addPart(p)"
        >
          <canvas :ref="(el) => setPreviewRef(p.key, el)" :width="48" :height="40"></canvas>
          <span class="part-name">{{ p.name }}</span>
        </button>
      </aside>

      <!-- 画布 -->
      <div class="canvas-wrap" ref="cvWrap">
        <canvas ref="cv" class="cv" @mousedown="onPointerDown"></canvas>
      </div>

      <!-- 数据栏 -->
      <aside class="data-panel">
        <div class="bar-title">元件清单（{{ comps.length }}）</div>
        <ul class="comp-list">
          <li
            v-for="c in comps"
            :key="c.id"
            :class="{ active: c.selected }"
            @click="select(c.id)"
          >
            <span class="comp-icon">{{ iconOf(c.type) }}</span>
            <span class="comp-name">{{ nameOf(c.type) }}</span>
            <span class="comp-param">{{ brief(c) }}</span>
          </li>
          <li v-if="!comps.length" class="list-empty">画布为空，请从左侧添加元件</li>
        </ul>

        <div class="bar-title">导线（{{ wires.length }}）</div>
        <ul class="comp-list wire-list">
          <li
            v-for="w in wires"
            :key="w.id"
            :class="{ active: w.id === selectedWireId }"
            @click="selectWire(w.id)"
          >
            <span class="wire-dot" :style="{ background: wireStyleColor(w.style) }"></span>
            <span class="comp-name">{{ wireBrief(w) }}</span>
          </li>
          <li v-if="!wires.length" class="list-empty">暂无导线，点击接线柱开始连线</li>
        </ul>

        <div class="bar-title">参数设置</div>
        <div v-if="selectedComp" class="param-editor">
          <!-- 电池 -->
          <template v-if="selectedComp.type === 'battery'">
            <label class="p-row">
              <span>型号电压</span>
              <select v-model.number="selectedComp.params.voltage">
                <option v-for="v in [1.5, 3, 9]" :key="v" :value="v">{{ v }}V</option>
              </select>
            </label>
          </template>

          <!-- 电池盒 -->
          <template v-else-if="selectedComp.type === 'batteryBox'">
            <div class="p-info">电池节数：{{ selectedComp.params.cells }} 节（{{ selectedComp.params.cells * 1.5 }}V）</div>
            <button class="toggle-btn" @click="toggleLoaded">
              {{ selectedComp.params.loaded ? '已装电池（点击取出）' : '未装电池（点击装入）' }}
            </button>
          </template>

          <!-- 小灯泡 -->
          <template v-else-if="selectedComp.type === 'bulb'">
            <label class="p-row">
              <span>额定电压 (V)</span>
              <input type="number" min="0.5" max="6" step="0.1" v-model.number="selectedComp.params.ratedV" />
            </label>
            <label class="p-row">
              <span>额定电流 (A)</span>
              <input type="number" min="0.05" max="1" step="0.01" v-model.number="selectedComp.params.ratedI" />
            </label>
            <div class="p-info">电阻 R = U/I = {{ bulbR(selectedComp).toFixed(2) }}Ω（恒定）</div>
          </template>

          <!-- 电阻 -->
          <template v-else-if="selectedComp.type === 'resistor'">
            <label class="p-row">
              <span>阻值 (Ω)</span>
              <input type="number" min="1" max="9999" step="1" v-model.number="selectedComp.params.resistance" />
            </label>
          </template>

          <!-- 电压表 / 电流表 -->
          <template v-else-if="selectedComp.type === 'voltmeter' || selectedComp.type === 'ammeter'">
            <div class="p-info">量程（固定，不可自定义）：</div>
            <div class="range-btns">
              <button
                v-for="r in rangesOf(selectedComp.type)"
                :key="r"
                class="range-btn"
                :class="{ on: selectedComp.params.range === r }"
                @click="selectedComp.params.range = r"
              >
                {{ r }}{{ selectedComp.type === 'voltmeter' ? 'V' : 'A' }}
              </button>
            </div>
          </template>

          <!-- 滑动变阻器 -->
          <template v-else-if="selectedComp.type === 'rheostat'">
            <label class="p-row">
              <span>最大阻值 (Ω)</span>
              <input type="number" min="1" max="10000" step="1" v-model.number="selectedComp.params.maxR" />
            </label>
            <div class="p-info">滑片位置可在画布上直接拖动</div>
          </template>

          <!-- 开关 -->
          <template v-else-if="selectedComp.type === 'switch'">
            <div class="p-info">状态：{{ selectedComp.params.closed ? '✅ 闭合（通路）' : '⭕ 断开（断路）' }}</div>
            <button class="toggle-btn" @click="selectedComp.params.closed = !selectedComp.params.closed">
              {{ selectedComp.params.closed ? '点击断开' : '点击闭合' }}
            </button>
          </template>

          <!-- 单刀双掷 -->
          <template v-else-if="selectedComp.type === 'switch2'">
            <div class="p-info">掷向：{{ selectedComp.params.position === 'up' ? '上方触点' : '下方触点' }}</div>
            <button class="toggle-btn" @click="toggleSwitch2">切换掷向</button>
          </template>

          <button class="del-btn" @click="removeSelected">🗑 删除该元件</button>
        </div>
        <div v-else-if="selectedWire" class="param-editor">
          <div class="p-info">连接：{{ wireBrief(selectedWire) }}</div>
          <div class="p-info">线型：{{ wireStyleName(selectedWire.style) }}</div>
          <button class="del-btn" @click="removeWire(selectedWire.id)">🗑 删除该导线</button>
        </div>
        <div v-else class="no-sel">未选中元件<br />点击画布中的元件或上方清单进行选中</div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  COLORS,
  COMPONENT_TYPES,
  createComponent,
  drawComponent,
  drawPreview,
  getBounds,
  hitComponent,
  getTerminals,
  wirePath,
  distToWire
} from '@/utils/circuit/components.js'

// ---------- 导线 ----------
const wires = ref([])
let wireId = 0
const wireStyle = ref('curve')
const wireStyles = [
  { key: 'curve', name: '曲线' },
  { key: 'ortho', name: '正交' },
  { key: 'line', name: '直线' }
]
const wiring = ref(null) // { term, x, y, snap } 接线中状态
const selectedWireId = ref(null)
const selectedWire = computed(() => wires.value.find((w) => w.id === selectedWireId.value) || null)

const wireStyleName = (s) => (wireStyles.find((x) => x.key === s) || {}).name || s
const wireStyleColor = (s) => ({ curve: '#2563eb', ortho: '#7c3aed', line: '#059669' }[s] || '#64748b')
const wireBrief = (w) => {
  const a = comps.value.find((c) => c.id === w.a.compId)
  const b = comps.value.find((c) => c.id === w.b.compId)
  const lbl = (id) => {
    const p = id.split(':')[1] || ''
    return /^t\d+$/.test(p) ? '' : p
  }
  return (a ? nameOf(a.type) : '?') + (lbl(w.a.termId) ? '(' + lbl(w.a.termId) + ')' : '') +
    ' ↔ ' + (b ? nameOf(b.type) : '?') + (lbl(w.b.termId) ? '(' + lbl(w.b.termId) + ')' : '')
}
function selectWire(id) {
  comps.value.forEach((c) => (c.selected = false))
  selectedWireId.value = id
}
function removeWire(id) {
  wires.value = wires.value.filter((w) => w.id !== id)
  if (selectedWireId.value === id) selectedWireId.value = null
}
// 断开某端子上的所有导线
function disconnectTerm(termId) {
  wires.value = wires.value.filter((w) => w.a.termId !== termId && w.b.termId !== termId)
}
// 端子实时坐标
function termPos(ep) {
  const c = comps.value.find((x) => x.id === ep.compId)
  if (!c) return null
  const t = getTerminals(c).find((x) => x.id === ep.termId)
  return t ? { x: t.x, y: t.y } : null
}

// ---------- 器材栏 ----------
const partButtons = [
  { key: 'battery', type: 'battery', name: '电池' },
  { key: 'box1', type: 'batteryBox', cells: 1, name: '电池盒·单节' },
  { key: 'box2', type: 'batteryBox', cells: 2, name: '电池盒·双节' },
  { key: 'box4', type: 'batteryBox', cells: 4, name: '电池盒·四节' },
  { key: 'bulb', type: 'bulb', name: '小灯泡' },
  { key: 'resistor', type: 'resistor', name: '电阻' },
  { key: 'voltmeter', type: 'voltmeter', name: '电压表' },
  { key: 'ammeter', type: 'ammeter', name: '电流表' },
  { key: 'rheostat', type: 'rheostat', name: '滑动变阻器' },
  { key: 'switch', type: 'switch', name: '单刀开关' },
  { key: 'switch2', type: 'switch2', name: '单刀双掷' }
]

const previewRefs = {}
function setPreviewRef(key, el) {
  if (el) previewRefs[key] = el
}

// ---------- 画布 ----------
const cv = ref(null)
const comps = ref([])
const selectedComp = computed(() => comps.value.find((c) => c.selected) || null)

const iconOf = (t) => ({ battery: '🔋', batteryBox: '🧰', bulb: '💡', resistor: 'Ω', voltmeter: 'V', ammeter: 'A', rheostat: '⇆', switch: '⏻', switch2: '⇅' }[t] || '?')
const nameOf = (t) => (COMPONENT_TYPES[t] ? COMPONENT_TYPES[t].name : t)
const brief = (c) => {
  switch (c.type) {
    case 'battery': return c.params.voltage + 'V'
    case 'batteryBox': return c.params.cells + '节·' + (c.params.loaded ? '已装' : '未装')
    case 'bulb': return c.params.ratedV + 'V ' + c.params.ratedI + 'A'
    case 'resistor': return c.params.resistance + 'Ω'
    case 'voltmeter': return '量程' + c.params.range + 'V'
    case 'ammeter': return '量程' + c.params.range + 'A'
    case 'rheostat': return c.params.maxR + 'Ω'
    case 'switch': return c.params.closed ? '闭合' : '断开'
    case 'switch2': return c.params.position === 'up' ? '掷上' : '掷下'
    default: return ''
  }
}
const rangesOf = (t) => (t === 'voltmeter' ? [3, 15] : [0.6, 3])
const bulbR = (c) => (c.params.ratedI > 0 ? c.params.ratedV / c.params.ratedI : 0)

// 从中心螺旋寻找不与现有元件重叠的空位
function findFreeSpot(w, h) {
  const wrap = cvWrap.value
  const cw = wrap.clientWidth
  const ch = wrap.clientHeight
  const cx = cw / 2
  const cy = ch / 2
  for (let ring = 0; ring < 16; ring++) {
    const off = ring * 46
    const cands = [
      [cx + off, cy], [cx, cy + off], [cx - off, cy], [cx, cy - off],
      [cx + off, cy + off], [cx - off, cy + off], [cx + off, cy - off], [cx - off, cy - off]
    ]
    for (const [x, y] of cands) {
      if (x < w / 2 + 20 || x > cw - w / 2 - 20 || y < h / 2 + 20 || y > ch - h / 2 - 20) continue
      let overlap = false
      for (const c of comps.value) {
        const b = getBounds(c)
        if (Math.abs(x - c.x) < (w + b.w) / 2 + 24 && Math.abs(y - c.y) < (h + b.h) / 2 + 24) {
          overlap = true
          break
        }
      }
      if (!overlap) return { x, y }
    }
  }
  return { x: cx, y: cy }
}

// ---------- 添加 / 删除 / 选中 ----------
function addPart(p) {
  const comp = createComponent(p.type, p.cells ? { cells: p.cells } : {})
  const pos = findFreeSpot(comp.w, comp.h)
  comp.x = pos.x
  comp.y = pos.y
  comps.value.forEach((c) => (c.selected = false))
  comp.selected = true
  comps.value.push(comp)
}

function select(id) {
  comps.value.forEach((c) => (c.selected = c.id === id))
}

function removeSelected() {
  const sel = selectedComp.value
  if (!sel) return
  comps.value = comps.value.filter((c) => c.id !== sel.id)
  // 联动删除连接在该元件上的导线
  wires.value = wires.value.filter((w) => w.a.compId !== sel.id && w.b.compId !== sel.id)
}

function clearAll() {
  comps.value = []
  wires.value = []
  selectedWireId.value = null
  wiring.value = null
}

function toggleLoaded() {
  const c = selectedComp.value
  if (c) c.params.loaded = !c.params.loaded
}

function toggleSwitch2() {
  const c = selectedComp.value
  if (c) c.params.position = c.params.position === 'up' ? 'down' : 'up'
}

// ---------- 鼠标交互 ----------
const cvWrap = ref(null)
let rafId = 0
let drag = null // { mode: 'move'|'slider', comp, offX, offY }

function toLocal(e) {
  const rect = cv.value.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

// 命中最上层元件
function topHit(x, y) {
  for (let i = comps.value.length - 1; i >= 0; i--) {
    const c = comps.value[i]
    if (hitComponent(c, x, y)) return c
  }
  return null
}

// 命中接线柱（优先于元件，radius 为命中半径）
function hitTerminal(x, y, radius = 14) {
  for (const c of comps.value) {
    for (const t of getTerminals(c)) {
      if (Math.hypot(x - t.x, y - t.y) <= radius) return t
    }
  }
  return null
}

// 命中导线
function hitWire(x, y) {
  for (let i = wires.value.length - 1; i >= 0; i--) {
    const w = wires.value[i]
    const a = termPos(w.a)
    const b = termPos(w.b)
    if (!a || !b) continue
    if (distToWire(x, y, a.x, a.y, b.x, b.y, w.style) < 7) return w
  }
  return null
}

// 命中变阻器滑块（局部坐标 sxp ∈ [-40,40], 滑块头部 y≈-9）
function hitSlider(c, x, y) {
  if (c.type !== 'rheostat') return null
  const sxp = -40 + c.params.slider * 80
  const lx = x - c.x
  const ly = y - c.y
  if (Math.abs(lx - sxp) <= 11 && ly >= -16 && ly <= -2) return true
  return null
}

function onPointerDown(e) {
  if (e.button !== 0) return
  const { x, y } = toLocal(e)
  // 1. 接线柱 → 开始接线（断开该端子旧线）
  const term = hitTerminal(x, y)
  if (term) {
    disconnectTerm(term.id)
    comps.value.forEach((c) => (c.selected = false))
    selectedWireId.value = null
    wiring.value = { term, x, y, snap: null }
    cv.value.style.cursor = 'crosshair'
    return
  }
  // 2. 变阻器滑块优先
  for (let i = comps.value.length - 1; i >= 0; i--) {
    const c = comps.value[i]
    if (hitSlider(c, x, y)) {
      comps.value.forEach((o) => (o.selected = o.id === c.id))
      drag = { mode: 'slider', comp: c, startX: x }
      return
    }
  }
  // 3. 元件优先于导线（避免导线横穿元件时元件无法拖动）
  const hit = topHit(x, y)
  if (hit) {
    comps.value.forEach((c) => (c.selected = c.id === hit.id))
    drag = { mode: 'move', comp: hit, offX: x - hit.x, offY: y - hit.y, moved: false, downX: x, downY: y }
    return
  }
  // 4. 导线 → 选中（导线在元件下层，只点露出部分）
  const wire = hitWire(x, y)
  if (wire) {
    comps.value.forEach((c) => (c.selected = false))
    selectedWireId.value = wire.id
    return
  }
  comps.value.forEach((c) => (c.selected = false))
  selectedWireId.value = null
  wiring.value = null
}

// mousemove / mouseup 挂在 window 上，拖动移出画布也能继续
function onPointerMove(e) {
  const { x, y } = toLocal(e)
  // 接线中：更新临时终点 + 吸附检测
  if (wiring.value) {
    wiring.value.x = x
    wiring.value.y = y
    const snap = hitTerminal(x, y, 16)
    wiring.value.snap = snap && snap.id !== wiring.value.term.id ? snap : null
    return
  }
  if (!drag) return
  if (drag.mode === 'move') {
    if (!drag.moved) {
      if (Math.hypot(x - drag.downX, y - drag.downY) < 4) return
      drag.moved = true
    }
    drag.comp.x = x - drag.offX
    drag.comp.y = y - drag.offY
  } else if (drag.mode === 'slider') {
    const c = drag.comp
    const sxp = x - c.x
    c.params.slider = Math.min(1, Math.max(0, (sxp + 40) / 80))
  }
}

function onPointerUp(e) {
  // 接线结束：吸附成功则创建导线
  if (wiring.value) {
    const w = wiring.value
    wiring.value = null
    cv.value.style.cursor = 'default'
    if (w.snap) {
      disconnectTerm(w.snap.id)
      wires.value.push({
        id: 'w' + (++wireId),
        a: { compId: w.term.compId, termId: w.term.id },
        b: { compId: w.snap.compId, termId: w.snap.id },
        style: wireStyle.value
      })
      selectedWireId.value = null
    }
    return
  }
  if (!drag) return
  const wasMove = drag.mode === 'move' && drag.moved
  const comp = drag.comp
  drag = null
  // 未发生拖动 = 单击 → 对可操作元件切换状态
  if (!wasMove && comp) {
    if (comp.type === 'switch') comp.params.closed = !comp.params.closed
    else if (comp.type === 'switch2') comp.params.position = comp.params.position === 'up' ? 'down' : 'up'
    else if (comp.type === 'batteryBox') comp.params.loaded = !comp.params.loaded
  }
}

function onKeyDown(e) {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedWireId.value) {
      removeWire(selectedWireId.value)
      return
    }
    removeSelected()
  }
}

// ---------- 渲染 ----------
function draw() {
  const canvas = cv.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  const dpr = window.devicePixelRatio || 1

  // 背景
  ctx.save()
  ctx.scale(dpr, dpr)
  const cw = W / dpr
  const ch = H / dpr
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, cw, ch)
  // 网格
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 24; x < cw; x += 24) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, ch)
  }
  for (let y = 24; y < ch; y += 24) {
    ctx.moveTo(0, y)
    ctx.lineTo(cw, y)
  }
  ctx.stroke()

  // 导线（元件下层，选中高亮）
  for (const w of wires.value) {
    const a = termPos(w.a)
    const b = termPos(w.b)
    if (!a || !b) continue
    const sel = w.id === selectedWireId.value
    ctx.strokeStyle = sel ? COLORS.blue : COLORS.line
    ctx.lineWidth = sel ? 3.2 : 2.2
    ctx.lineCap = 'round'
    wirePath(ctx, a.x, a.y, b.x, b.y, w.style)
    ctx.stroke()
    ctx.lineCap = 'butt'
  }

  // 元件
  for (const c of comps.value) {
    drawComponent(ctx, c)
  }

  // 已连接端子小圆点标记
  ctx.fillStyle = COLORS.blue
  for (const c of comps.value) {
    for (const t of getTerminals(c)) {
      if (wires.value.some((w) => w.a.termId === t.id || w.b.termId === t.id)) {
        ctx.beginPath()
        ctx.arc(t.x, t.y, 2.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // 接线中：起点高亮 + 吸附目标高亮 + 临时线
  if (wiring.value) {
    const w = wiring.value
    const t = w.term
    ctx.save()
    // 起点
    ctx.fillStyle = COLORS.orange
    ctx.beginPath()
    ctx.arc(t.x, t.y, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
    // 吸附目标
    if (w.snap) {
      ctx.fillStyle = '#16a34a'
      ctx.beginPath()
      ctx.arc(w.snap.x, w.snap.y, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    // 临时线（虚线）
    ctx.strokeStyle = COLORS.orange
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    const ex = w.snap ? w.snap.x : w.x
    const ey = w.snap ? w.snap.y : w.y
    wirePath(ctx, t.x, t.y, ex, ey, wireStyle.value)
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}

function loop() {
  draw()
  rafId = requestAnimationFrame(loop)
}

// ---------- 生命周期 ----------
let ro = null
onMounted(() => {
  // 调试钩子（测试用）
  window.__circuitState = () => ({
    comps: comps.value.map((c) => ({ id: c.id, type: c.type, x: Math.round(c.x), y: Math.round(c.y), params: { ...c.params }, selected: c.selected })),
    wires: wires.value.map((w) => ({ id: w.id, a: w.a.termId, b: w.b.termId, style: w.style })),
    wiring: wiring.value ? { from: wiring.value.term.id, snap: wiring.value.snap ? wiring.value.snap.id : null } : null,
    cvRect: (() => { const r = cv.value.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } })()
  })
  // 预览图
  for (const p of partButtons) {
    const el = previewRefs[p.key]
    if (el) {
      const ctx = el.getContext('2d')
      drawPreview(ctx, p.type, p.cells ? { cells: p.cells } : {})
    }
  }
  // 画布尺寸
  const wrap = cvWrap.value
  const canvas = cv.value
  const resize = () => {
    const dpr = window.devicePixelRatio || 1
    canvas.width = wrap.clientWidth * dpr
    canvas.height = wrap.clientHeight * dpr
  }
  resize()
  ro = new ResizeObserver(resize)
  ro.observe(wrap)
  loop()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('mouseup', onPointerUp)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  if (ro) ro.disconnect()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('mousemove', onPointerMove)
  window.removeEventListener('mouseup', onPointerUp)
})
</script>

<style lang="scss" scoped>
.circuit-lab {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px);
  min-height: 560px;
  background: #f1f5f9;

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;

    .tb-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .hint {
      font-size: 12px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .wire-styles {
      display: flex;
      gap: 4px;
      flex-shrink: 0;

      .ws-btn {
        padding: 4px 10px;
        font-size: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: #f8fafc;
        color: #475569;
        cursor: pointer;

        &:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        &.on {
          background: #2563eb;
          color: #fff;
          border-color: #2563eb;
        }
      }
    }

    .clear-btn {
      font-size: 12px;
      padding: 5px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #fff;
      color: #ef4444;
      cursor: pointer;
      flex-shrink: 0;

      &:hover {
        background: #fef2f2;
      }
    }
  }

  .main {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .parts-bar {
    width: 168px;
    background: #fff;
    border-right: 1px solid #e2e8f0;
    padding: 10px;
    overflow-y: auto;

    .bar-title {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 8px;
    }

    .part-btn {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 3px 6px;
      margin-bottom: 4px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.15s;

      &:hover {
        border-color: #2563eb;
        background: #eff6ff;
      }

      canvas {
        width: 44px;
        height: 32px;
        flex-shrink: 0;
      }

      .part-name {
        font-size: 12px;
        color: #334155;
        margin-left: 6px;
        text-align: left;
      }
    }
  }

  .canvas-wrap {
    flex: 1;
    min-width: 0;
    position: relative;
    background: #f8fafc;

    .cv {
      width: 100%;
      height: 100%;
      display: block;
      cursor: default;
    }
  }

  .data-panel {
    width: 260px;
    background: #fff;
    border-left: 1px solid #e2e8f0;
    padding: 10px;
    overflow-y: auto;

    .bar-title {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin: 8px 0;
    }

    .comp-list {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 220px;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;

      li {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        font-size: 12px;
        color: #334155;
        cursor: pointer;
        border-bottom: 1px solid #f1f5f9;

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background: #f8fafc;
        }

        &.active {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .comp-icon {
          width: 18px;
          text-align: center;
          font-weight: 700;
          color: #475569;
        }

        .comp-name {
          flex: 1;
        }

        .comp-param {
          color: #64748b;
          font-size: 11px;
        }
      }

      .list-empty {
        color: #94a3b8;
        font-size: 12px;
        padding: 10px;
        text-align: center;
        cursor: default;
      }
    }

    .wire-list {
      max-height: 140px;

      .wire-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }
    }

    .param-editor {
      .p-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 12px;
        color: #334155;

        input,
        select {
          width: 110px;
          padding: 4px 6px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 12px;
          outline: none;

          &:focus {
            border-color: #2563eb;
          }
        }
      }

      .p-info {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 8px;
        line-height: 1.6;
      }

      .toggle-btn {
        width: 100%;
        padding: 6px;
        margin-bottom: 8px;
        font-size: 12px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #f8fafc;
        cursor: pointer;

        &:hover {
          background: #eff6ff;
          border-color: #2563eb;
        }
      }

      .range-btns {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;

        .range-btn {
          flex: 1;
          padding: 6px;
          font-size: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #f8fafc;
          cursor: pointer;

          &.on {
            background: #2563eb;
            color: #fff;
            border-color: #2563eb;
          }
        }
      }

      .del-btn {
        width: 100%;
        padding: 6px;
        margin-top: 10px;
        font-size: 12px;
        border: 1px solid #fecaca;
        border-radius: 6px;
        background: #fff;
        color: #ef4444;
        cursor: pointer;

        &:hover {
          background: #fef2f2;
        }
      }
    }

    .no-sel {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      padding: 16px 0;
      line-height: 1.8;
    }
  }
}
</style>
