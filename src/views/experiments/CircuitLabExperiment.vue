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
        <button v-if="!submitted" class="submit-btn" @click="submitCircuit">✅ 提交电路</button>
        <button v-else class="submit-btn back" @click="backToEdit">✏️ 返回编辑</button>
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
        <div v-if="circuitReport" class="report" :class="circuitReport.ok ? 'ok' : 'bad'">
          <div class="rep-title">{{ circuitReport.ok ? '✅ 校验通过' : '⚠️ 校验未通过' }}</div>
          <div v-for="(m, i) in circuitReport.msgs" :key="i" class="rep-line">{{ m }}</div>
        </div>
        <div v-if="submitted && solveResult" class="solve-panel" :class="solveResult.ok ? 'ok' : 'bad'">
          <div class="sp-title">{{ solveResult.ok ? '🔌 电路运行中' : '⛔ ' + solveResult.err }}</div>
          <template v-if="solveResult.ok">
            <div class="sp-line">干路电流 <b>{{ solveResult.totalI.toFixed(3) }}A</b>（点击开关/拖动变阻器实时刷新）</div>
            <table class="sp-table">
              <thead>
                <tr><th>元件</th><th>电压</th><th>电流</th><th>功率</th><th>状态</th></tr>
              </thead>
              <tbody>
                <tr v-for="c in comps" :key="c.id">
                  <td>{{ nameOf(c.type) }}</td>
                  <td>
                    <template v-if="meterOf(c) && c.type === 'ohmmeter'">
                      <template v-if="meterOf(c).tip">—</template>
                      <template v-else-if="meterOf(c).inf">∞</template>
                      <template v-else>{{ meterOf(c).reading >= 1000 ? (meterOf(c).reading / 1000).toFixed(1) + 'k' : meterOf(c).reading.toFixed(1) }}{{ meterOf(c).unit }}</template>
                    </template>
                    <template v-else-if="meterOf(c)">{{ meterOf(c).reading.toFixed(3) }}{{ meterOf(c).unit }}</template>
                    <template v-else-if="resultOf(c)">{{ resultOf(c).U.toFixed(3) }}V</template>
                    <template v-else>—</template>
                  </td>
                  <td>
                    <template v-if="resultOf(c)">{{ resultOf(c).I.toFixed(3) }}A</template>
                    <template v-else>—</template>
                  </td>
                  <td>
                    <template v-if="resultOf(c)">{{ resultOf(c).P.toFixed(3) }}W</template>
                    <template v-else>—</template>
                  </td>
                  <td>
                    <template v-if="c.type === 'bulb'">{{ bulbStateName(c) }}</template>
                    <template v-else-if="c.type === 'switch'">{{ c.params.closed ? '闭合' : '断开' }}</template>
                    <template v-else-if="c.type === 'switch2'">{{ c.params.position === 'up' ? '掷↑' : '掷↓' }}</template>
                    <template v-else-if="c.type === 'voltmeter' || c.type === 'ammeter'">{{ c.state.over ? '⚠️超量程' : '档位 ' + c.params.range }}</template>
                    <template v-else-if="c.type === 'ohmmeter'">{{ c.state.tip ? c.state.tip : (c.state.over ? '⚠️打表' : (c.state.zero ? '✓ 已调零' : (c.state.inf ? '∞' : '测量中'))) }}</template>
                    <template v-else-if="c.type === 'rheostat'">{{ Math.round(c.params.slider * 100) }}%</template>
                    <template v-else>—</template>
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </div>
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
                @click="setMeterRange(selectedComp, r)"
              >
                {{ r }}{{ selectedComp.type === 'voltmeter' ? 'V' : 'A' }}
              </button>
            </div>
            <label class="p-row">
              <span>内阻 (Ω)</span>
              <input type="number" min="0" max="100000" step="1" v-model.number="selectedComp.params.internalR" />
            </label>
            <div class="p-info">0 = 理想电表（无误差）；当前档位默认 {{ meterDefR(selectedComp) }}Ω，切换档位自动联动</div>
          </template>

          <!-- 欧姆表（多用电表欧姆档） -->
          <template v-else-if="selectedComp.type === 'ohmmeter'">
            <div class="p-info">内部结构：电池 1.5V + 调零电阻（表头满偏 1mA，中值电阻 = 1500Ω）</div>
            <div class="p-info">当前中值电阻：{{ selectedComp.params.Rmid }}Ω（可拖动画布上「调零」旋钮，范围 1000~2000Ω）</div>
            <div class="p-info">用法：红黑表笔接被测电阻两端（须断开电源）；表笔短接时调零旋钮使指针满偏</div>
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
  BULB_STATES,
  createComponent,
  drawComponent,
  drawPreview,
  getBounds,
  hitComponent,
  getTerminals,
  wirePath,
  distToWire
} from '@/utils/circuit/components.js'
import { solveCircuit } from '@/utils/circuit/solver.js'

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
  { key: 'ohmmeter', type: 'ohmmeter', name: '欧姆表' },
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

const iconOf = (t) => ({ battery: '🔋', batteryBox: '🧰', bulb: '💡', resistor: 'Ω', voltmeter: 'V', ammeter: 'A', ohmmeter: 'Ω̂', rheostat: '⇆', switch: '⏻', switch2: '⇅' }[t] || '?')
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

// ---------- M3/M4 提交、电路图与求解 ----------
const submitted = ref(false)
const circuitReport = ref(null)
const layout = ref(null)
const solveResult = ref(null)       // M4 求解结果
const layoutBackup = ref(null)      // 布局前的元件坐标（返回编辑时恢复）
const dragRheostatCircuit = ref(null) // 电路图模式变阻器拖动
const dragOhmCircuit = ref(null)      // 电路图模式欧姆表调零拖动

function backToEdit() {
  submitted.value = false
  // 恢复编辑坐标
  if (layoutBackup.value) {
    for (const b of layoutBackup.value) {
      const c = comps.value.find((x) => x.id === b.id)
      if (c) { c.x = b.x; c.y = b.y }
    }
    layoutBackup.value = null
  }
  // 编辑模式不求解不发光
  comps.value.forEach((c) => { c.state = {} })
  solveResult.value = null
}

// M4：求解并写入元件显示状态
function applySolve(sol) {
  solveResult.value = sol
  if (!sol.ok) {
    comps.value.forEach((c) => { c.state = {} })
    return
  }
  for (const c of comps.value) {
    c.state = {}
    if (c.type === 'bulb') {
      c.state.bulbState = sol.bulbStates.get(c.id) || 'off'
    } else if (c.type === 'voltmeter' || c.type === 'ammeter') {
      const mm = sol.meters.get(c.id)
      if (mm) {
        c.state.reading = mm.reading
        c.state.rangeMax = c.params.range
        c.state.over = mm.reading > c.params.range
      }
    } else if (c.type === 'ohmmeter') {
      const mm = sol.meters.get(c.id)
      if (mm) {
        c.state.reading = mm.reading
        c.state.frac = mm.frac
        c.state.over = mm.over
        c.state.zero = mm.zero
        c.state.inf = mm.inf
        c.state.tip = mm.tip
      }
    }
  }
}

function solveNow() {
  applySolve(solveCircuit(comps.value, wires.value, getTerminals))
}

// M5：电表档位切换联动内阻（用户自定义过内阻则不覆盖）
const METER_DEF_R = {
  voltmeter: { 3: 3000, 15: 15000 },
  ammeter: { 0.6: 0.5, 3: 0.1 }
}
function setMeterRange(c, r) {
  const old = c.params.range
  const map = METER_DEF_R[c.type]
  if (map && map[old] !== undefined && c.params.internalR === map[old]) {
    c.params.internalR = map[r]
  }
  c.params.range = r
  if (submitted.value) solveNow()
}
function meterDefR(c) {
  const map = METER_DEF_R[c.type]
  return map ? map[c.params.range] : 0
}
// 欧姆表调零旋钮命中（元件底部旋钮中心 (0,40) 半径 12）
function hitOhmKnob(c, x, y) {
  return c.type === 'ohmmeter' && Math.hypot(x - c.x, y - (c.y + 40)) < 14
}
// 调零旋钮拖动 → 中值电阻 1000~2000Ω
function applyOhmZero(c, x) {
  c.params.Rmid = Math.round(Math.min(2000, Math.max(1000, 1500 + (x - c.x) * 10)))
}

// 数据栏求解面板辅助
const resultOf = (c) => (solveResult.value && solveResult.value.ok ? solveResult.value.results.get(c.id) : null)
const meterOf = (c) => (solveResult.value && solveResult.value.ok ? solveResult.value.meters.get(c.id) : null)
function bulbStateName(c) {
  const s = c.state.bulbState || 'off'
  const d = BULB_STATES[s]
  return d ? d.name : s
}

// 构建拓扑：端子按导线合并为节点，元件为边
// 返回 { roots: Map<termId, root>, compEdges: [{ comp, a, b }] }
function buildTopo() {
  const parent = {}
  const find = (a) => {
    while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a] }
    return a
  }
  const union = (a, b) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }
  for (const c of comps.value) {
    for (const t of getTerminals(c)) parent[t.id] = t.id
  }
  for (const w of wires.value) {
    if (parent[w.a.termId] && parent[w.b.termId]) union(w.a.termId, w.b.termId)
  }
  // 变阻器滑杆 C/D 为同一节点（0Ω）
  for (const c of comps.value) {
    if (c.type === 'rheostat') {
      const all = getTerminals(c)
      const tC = all.find((t) => t.label === 'C')
      const tD = all.find((t) => t.label === 'D')
      if (tC && tD) union(tC.id, tD.id)
    }
  }
  const compEdges = []
  for (const c of comps.value) {
    let ts = getTerminals(c).map((t) => find(t.id))
    // 变阻器：按实际接线端取边（滑杆 C/D 已合并）
    if (c.type === 'rheostat') {
      const used = new Set()
      for (const w of wires.value) {
        if (w.a.compId === c.id) used.add(w.a.termId.slice(w.a.termId.indexOf(':') + 1))
        if (w.b.compId === c.id) used.add(w.b.termId.slice(w.b.termId.indexOf(':') + 1))
      }
      const all = getTerminals(c)
      const rod = find(all.find((t) => t.label === 'C').id)
      const tA = find(all.find((t) => t.label === 'A').id)
      const tB = find(all.find((t) => t.label === 'B').id)
      const hasRod = used.has('C') || used.has('D')
      const hasA = used.has('A')
      const hasB = used.has('B')
      if (hasA && hasB && !hasRod) ts = [tA, tB]
      else if (hasA && hasRod) ts = [tA, rod]
      else if (hasB && hasRod) ts = [tB, rod]
      else if (hasRod) ts = [rod, rod]
      else ts = [tA, rod]
    } else if (c.type === 'switch2') {
      const all = getTerminals(c)
      const com = all.find((t) => t.label === '')
      const arm = all.find((t) => (c.params.position === 'up' ? t.dy < 0 : t.dy > 0))
      if (com && arm) ts = [find(com.id), find(arm.id)]
    }
    if (ts.length >= 2 && ts[0] !== ts[1]) {
      compEdges.push({ comp: c, a: ts[0], b: ts[1] })
    } else if (ts.length >= 2 && ts[0] === ts[1]) {
      // 元件两端被同一根线短接（自环），保留以便提示
      compEdges.push({ comp: c, a: ts[0], b: ts[1], short: true })
    }
  }
  return { compEdges }
}

// 找含电池的回路（主回路）：电池 a→b 之间经过其他元件的路径
function findMainLoop(compEdges) {
  const bat = compEdges.find((e) => (e.comp.type === 'battery' || e.comp.type === 'batteryBox' || e.comp.type === 'ohmmeter') && (!e.short || e.comp.type === 'ohmmeter'))
  if (!bat) return null
  // 邻接表（节点 → 边）
  const adj = new Map()
  const addAdj = (node, edge) => {
    if (!adj.has(node)) adj.set(node, [])
    adj.get(node).push(edge)
  }
  for (const e of compEdges) {
    if (e === bat) continue
    addAdj(e.a, e)
    addAdj(e.b, e)
  }
  // DFS 找 bat.a → bat.b 路径
  const visited = new Set()
  const path = []
  let found = null
  const dfs = (node, target) => {
    if (found) return
    if (node === target) { found = path.slice(); return }
    visited.add(node)
    for (const e of adj.get(node) || []) {
      const next = e.a === node ? e.b : e.a
      if (!visited.has(next)) {
        path.push(e)
        dfs(next, target)
        if (found) return
        path.pop()
      }
    }
  }
  dfs(bat.a, bat.b)
  if (!found) return null
  const loop = [bat, ...found]
  // 节点序列（从 bat.a 开始沿回路）
  const nodeSeq = [bat.a]
  let cur = bat.a
  for (const e of loop.slice(1)) {
    cur = e.a === cur ? e.b : e.a
    nodeSeq.push(cur)
  }
  return { loop, nodeSeq }
}

// 主回路之外的元件分类：并联支路 / 断路
function classifyRest(mainLoop, compEdges) {
  const loopSet = new Set(mainLoop.loop)
  const loopNodes = new Set(mainLoop.nodeSeq)
  const rest = compEdges.filter((e) => !loopSet.has(e))
  const branches = [] // [{ comps: [], nA, nB }]
  const broken = []
  for (const e of rest) {
    if (e.short) { broken.push(e.comp); continue }
    if (loopNodes.has(e.a) && loopNodes.has(e.b)) {
      // 并联支路：合并共享节点的支路元件
      let br = branches.find((b) => b.nA === e.a && b.nB === e.b)
      if (!br) { br = { nA: e.a, nB: e.b, comps: [] }; branches.push(br) }
      br.comps.push(e.comp)
    } else {
      broken.push(e.comp)
    }
  }
  return { branches, broken }
}

// 电路图布局（画布坐标）
function buildLayout() {
  const topo = buildTopo()
  const main = findMainLoop(topo.compEdges)
  const { branches, broken } = classifyRest(main, topo.compEdges)
  const W = cvWrap.value.clientWidth
  const H = cvWrap.value.clientHeight
  const L = 110
  const R = W - 110
  const T = 96
  const B = H - 110
  const nodes = []
  const segs = []
  const reports = []

  const bat = main.loop[0]
  const topComps = main.loop.slice(1)
  const k = topComps.length
  const gap = (R - L) / (k + 1)
  // 顶边元件
  topComps.forEach((e, i) => {
    nodes.push({ compId: e.comp.id, x: L + gap * (i + 1), y: T })
  })
  // 电池（底边）
  nodes.push({ compId: bat.comp.id, x: L + 70, y: B })
  // 底边导线：电池+ → (R,B)；电池- ← (L,B)
  segs.push({ x1: L + 70 + 44, y1: B, x2: R, y2: B })
  segs.push({ x1: L, y1: B, x2: L + 70 - 44, y2: B })
  // 右边垂直
  segs.push({ x1: R, y1: B, x2: R, y2: T })
  // 左边垂直
  segs.push({ x1: L, y1: T, x2: L, y2: B })
  // 顶边元件端子引线与元件间连线
  for (let i = 0; i < k; i++) {
    const e = topComps[i]
    const def = COMPONENT_TYPES[e.comp.type]
    const hw = e.comp.w / 2
    const cx = L + gap * (i + 1)
    if (i === 0) segs.push({ x1: L, y1: T, x2: cx - hw, y2: T })
    else {
      const prev = topComps[i - 1]
      const pxc = L + gap * i
      segs.push({ x1: pxc + prev.comp.w / 2, y1: T, x2: cx - hw, y2: T })
    }
    if (i === k - 1) segs.push({ x1: cx + hw, y1: T, x2: R, y2: T })
  }
  // 并联支路：垂直排布在主回路内部
  branches.forEach((br, bi) => {
    const rowY = T + 120 + bi * 96
    // 支路连接点在主回路顶边上的 x 位置
    const findNodeX = (n) => {
      // n 在 nodeSeq 中的位置 → 顶边元件索引
      const idx = main.nodeSeq.indexOf(n)
      if (idx <= 0) return L
      if (idx >= k) return R
      return L + gap * idx
    }
    const xA = findNodeX(br.nA)
    const xB = findNodeX(br.nB)
    const m = br.comps.length
    br.comps.forEach((e, i) => {
      const cx = Math.min(xA, xB) + (Math.abs(xB - xA) * (i + 1)) / (m + 1)
      nodes.push({ compId: e.id, x: cx, y: rowY })
      // 引线到连接点
      segs.push({ x1: cx - e.w / 2, y1: rowY, x2: cx - e.w / 2, y2: T })
      segs.push({ x1: cx + e.w / 2, y1: rowY, x2: cx + e.w / 2, y2: T })
    })
    // 支路两连接点间水平连线（在 T 处，与主回路连线重合即可——补垂直段）
    segs.push({ x1: Math.min(xA, xB), y1: T, x2: Math.max(xA, xB), y2: T })
    // 支路元件间水平连线
    for (let i = 0; i < m - 1; i++) {
      const c1 = nodes[nodes.length - m + i]
      const c2 = nodes[nodes.length - m + i + 1]
      segs.push({ x1: c1.x + br.comps[i].w / 2, y1: rowY, x2: c2.x - br.comps[i + 1].w / 2, y2: rowY })
    }
    reports.push('并联支路：' + br.comps.map((e) => nameOf(e.type)).join(' → '))
  })

  // 主回路报告
  reports.unshift('主回路（串联）：' + main.loop.map((e) => nameOf(e.comp.type)).join(' → '))
  if (broken.length) reports.push('⚠️ 断路元件：' + broken.map((c) => nameOf(c.type)).join('、'))

  return {
    nodes,
    segs,
    loopLen: main.loop.length,
    branchCount: branches.length,
    broken: broken.map((c) => nameOf(c.type)),
    reports
  }
}

// 校验并提交
function submitCircuit() {
  const msgs = []
  let ok = true
  if (!comps.value.length) {
    msgs.push('画布为空，请先添加元件')
    ok = false
  } else {
    // 未连接元件
    const connected = new Set()
    for (const w of wires.value) { connected.add(w.a.compId); connected.add(w.b.compId) }
    const unconnected = comps.value.filter((c) => !connected.has(c.id))
    if (unconnected.length) {
      msgs.push('未接线元件：' + unconnected.map((c) => nameOf(c.type)).join('、'))
      ok = false
    }
    if (!wires.value.length) {
      msgs.push('没有任何导线，无法形成回路')
      ok = false
    }
    if (ok) {
      const topo = buildTopo()
      // 短路检测：电源两端被导线直连
      const shortBat = topo.compEdges.find((e) => e.short && (e.comp.type === 'battery' || e.comp.type === 'batteryBox'))
      if (shortBat) {
        msgs.push('⚠️ 电源短路：导线直接连接电源两端！')
        ok = false
      }
      const main = ok ? findMainLoop(topo.compEdges) : null
      if (!main && ok) {
        msgs.push('未形成闭合回路：从电池正极出发无法回到负极（请检查接线）')
        ok = false
      } else if (main) {
        const { branches, broken } = classifyRest(main, topo.compEdges)
        if (branches.length) msgs.push('检测到 ' + branches.length + ' 条并联支路（并联电路）')
        if (broken.length) msgs.push('断路元件：' + broken.map((c) => nameOf(c.type)).join('、') + '（未接入回路）')
        const series = main.loop.filter((e) => e.comp.type === 'battery' || e.comp.type === 'batteryBox').length
        msgs.push('回路元件数：' + main.loop.length + '（含电源 ' + series + ' 个）')
      }
    }
  }
  circuitReport.value = { ok, msgs }
  if (ok) {
    layout.value = buildLayout()
    // 固化布局坐标到元件（电路图模式交互命中用），备份原坐标
    layoutBackup.value = comps.value.map((c) => ({ id: c.id, x: c.x, y: c.y }))
    for (const n of layout.value.nodes) {
      const c = comps.value.find((x) => x.id === n.compId)
      if (c) { c.x = n.x; c.y = n.y }
    }
    solveNow()
    submitted.value = true
  }
}

// 电路图绘制（submitted 模式）
function drawLayout(ctx, cw, ch) {
  if (!layout.value) return
  const l = layout.value
  // 背景区
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, cw, ch)
  // 导线（深灰，正交）
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of l.segs) {
    ctx.beginPath()
    ctx.moveTo(s.x1, s.y1)
    ctx.lineTo(s.x2, s.y2)
    ctx.stroke()
  }
  // 元件（布局坐标已固化到 comps）
  for (const c of comps.value) {
    drawComponent(ctx, c)
  }
  // 标题
  ctx.fillStyle = '#334155'
  ctx.font = 'bold 14px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('电路图（' + (l.branchCount ? '串并联混合' : '串联') + '电路）', 16, 14)
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
  // 电路图模式：只读，但支持实时交互（开关/电表档位/变阻器滑块）
  if (submitted.value) {
    for (let i = comps.value.length - 1; i >= 0; i--) {
      const c = comps.value[i]
      if (!hitComponent(c, x, y)) continue
      if (c.type === 'switch') {
        c.params.closed = !c.params.closed
        solveNow()
      } else if (c.type === 'switch2') {
        c.params.position = c.params.position === 'up' ? 'down' : 'up'
        solveNow()
      } else if (c.type === 'voltmeter') {
        setMeterRange(c, c.params.range === 3 ? 15 : 3)
      } else if (c.type === 'ammeter') {
        setMeterRange(c, c.params.range === 0.6 ? 3 : 0.6)
      } else if (c.type === 'rheostat') {
        dragRheostatCircuit.value = c.id
        cv.value.style.cursor = 'ew-resize'
      } else if (c.type === 'ohmmeter' && hitOhmKnob(c, x, y)) {
        dragOhmCircuit.value = c.id
        cv.value.style.cursor = 'ew-resize'
      }
      return
    }
    return
  }
  // 1. 接线柱 → 开始接线（端子可连多根线，并联靠多线汇聚实现）
  const term = hitTerminal(x, y)
  if (term) {
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
  // 2.5 欧姆表调零旋钮（优先于元件选中）
  for (let i = comps.value.length - 1; i >= 0; i--) {
    const c = comps.value[i]
    if (hitOhmKnob(c, x, y)) {
      comps.value.forEach((o) => (o.selected = o.id === c.id))
      drag = { mode: 'ohmZero', comp: c }
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
  // 电路图模式：变阻器滑块实时拖动 → 重新求解
  if (submitted.value) {
    if (dragRheostatCircuit.value) {
      const c = comps.value.find((o) => o.id === dragRheostatCircuit.value)
      if (c) {
        c.params.slider = Math.min(1, Math.max(0, (x - (c.x - 40)) / 80))
        solveNow()
      }
    } else if (dragOhmCircuit.value) {
      const c = comps.value.find((o) => o.id === dragOhmCircuit.value)
      if (c) {
        applyOhmZero(c, x)
        solveNow()
      }
    }
    return
  }
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
  } else if (drag.mode === 'ohmZero') {
    applyOhmZero(drag.comp, x)
  }
}

function onPointerUp(e) {
  // 电路图模式：结束变阻器拖动
  if (submitted.value) {
    if (dragRheostatCircuit.value) {
      dragRheostatCircuit.value = null
      cv.value.style.cursor = 'default'
    }
    if (dragOhmCircuit.value) {
      dragOhmCircuit.value = null
      cv.value.style.cursor = 'default'
    }
    return
  }
  // 接线结束：吸附成功则创建导线
  if (wiring.value) {
    const w = wiring.value
    wiring.value = null
    cv.value.style.cursor = 'default'
    if (w.snap) {
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
  if (submitted.value) return // 电路图模式只读
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

  // 电路图模式：只画布局
  if (submitted.value && layout.value) {
    drawLayout(ctx, cw, ch)
    ctx.restore()
    return
  }

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
  window.__layoutProbe = () => {
  try {
    buildLayout()
    return { ok: true }
  } catch (err) {
    return { __throw: String((err && err.stack) || err) }
  }
}
window.__solveProbe = () => {
  const r = solveCircuit(comps.value, wires.value, getTerminals)
  return { ok: r.ok, err: r.err || null, totalI: r.ok ? r.totalI : null, diag: r.diag || null }
}
window.__circuitState = () => ({    comps: comps.value.map((c) => ({ id: c.id, type: c.type, x: Math.round(c.x), y: Math.round(c.y), w: c.w, params: { ...c.params }, selected: c.selected, state: { ...c.state } })),
    wires: wires.value.map((w) => ({ id: w.id, a: w.a.termId, b: w.b.termId, style: w.style })),
    wiring: wiring.value ? { from: wiring.value.term.id, snap: wiring.value.snap ? wiring.value.snap.id : null } : null,
    submitted: submitted.value,
    solve: solveResult.value ? (solveResult.value.ok ? { ok: true, totalI: solveResult.value.totalI, meters: [...solveResult.value.meters.entries()].map(([k, v]) => [k, v.reading]), bulbs: [...solveResult.value.bulbStates.entries()].map(([k, v]) => [k, v]) } : { ok: false, err: solveResult.value.err }) : null,
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

    .submit-btn {
      padding: 5px 12px;
      font-size: 12px;
      border: none;
      border-radius: 6px;
      background: #16a34a;
      color: #fff;
      cursor: pointer;
      flex-shrink: 0;

      &:hover {
        background: #15803d;
      }

      &.back {
        background: #2563eb;

        &:hover {
          background: #1d4ed8;
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

    .report {
      font-size: 12px;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 8px;
      line-height: 1.7;

      .rep-title {
        font-weight: 700;
        margin-bottom: 4px;
      }

      .rep-line {
        color: #475569;
      }

      &.ok {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;

        .rep-title {
          color: #15803d;
        }
      }

      &.bad {
        background: #fef2f2;
        border: 1px solid #fecaca;

        .rep-title {
          color: #b91c1c;
        }

        .rep-line {
          color: #991b1b;
        }
      }
    }

    .solve-panel {
      font-size: 12px;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 8px;
      line-height: 1.7;

      .sp-title {
        font-weight: 700;
        margin-bottom: 4px;
      }

      .sp-line {
        color: #475569;
        margin-bottom: 6px;

        b {
          color: #2563eb;
        }
      }

      .sp-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;

        th, td {
          border: 1px solid #e2e8f0;
          padding: 3px 4px;
          text-align: center;
          color: #334155;
        }

        th {
          background: #f1f5f9;
          color: #475569;
          font-weight: 600;
        }
      }

      &.ok {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;

        .sp-title {
          color: #15803d;
        }
      }

      &.bad {
        background: #fef2f2;
        border: 1px solid #fecaca;

        .sp-title {
          color: #b91c1c;
        }
      }
    }
  }
}
</style>
