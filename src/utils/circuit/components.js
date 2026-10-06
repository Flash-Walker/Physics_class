// ============================================================
// 电路实验 - 元件模型与绘制
// 元件实例: { id, type, x, y, params, state, selected }
//   params: 用户可编辑参数（电压/阻值/额定值/开关状态等）
//   state:  仿真显示状态（灯泡亮度、电表读数等，M4 填充）
// ============================================================

export const COLORS = {
  line: '#1e293b',       // 元件轮廓/导线
  term: '#475569',       // 接线柱边框
  red: '#dc2626',
  blue: '#2563eb',
  orange: '#f59e0b',
  amber: '#fbbf24',
  dim: '#94a3b8'
}

// ---------- 灯泡五态 ----------
export const BULB_STATES = {
  off:    { name: '灭',   filament: '#94a3b8', glow: 0.0,  glowR: 0 },
  dim:    { name: '微亮', filament: '#fbbf24', glow: 0.14, glowR: 26 },
  on:     { name: '亮',   filament: '#f59e0b', glow: 0.32, glowR: 36 },
  bright: { name: '超亮', filament: '#fff7ed', glow: 0.6,  glowR: 48 },
  burnt:  { name: '损坏', filament: '#475569', glow: 0.0,  glowR: 0 }
}

let idCounter = 0
export function nextId() {
  return 'c' + (++idCounter)
}

// ---------- 元件类型注册表 ----------
export const COMPONENT_TYPES = {
  battery: {
    name: '电池',
    w: 96, h: 52,
    defaultParams: { voltage: 1.5 },
    terminals: [
      { label: '-', dx: -44, dy: 0, ldx: -10, ldy: 8 },
      { label: '+', dx: 44, dy: 0, ldx: 4, ldy: 8 }
    ],
    draw: drawBattery,
    drawSymbol: drawBatterySymbol
  },
  batteryBox: {
    name: '电池盒',
    w: 0, h: 56, // w 由 cells 决定，见 createComponent
    defaultParams: { cells: 1, loaded: true },
    terminals: [
      { label: '-', dx: -52, dy: 0, ldx: -12, ldy: 8 },
      { label: '+', dx: 52, dy: 0, ldx: 4, ldy: 8 }
    ],
    draw: drawBatteryBox,
    drawSymbol: drawBatteryBoxSymbol
  },
  bulb: {
    name: '小灯泡',
    w: 76, h: 52,
    defaultParams: { ratedV: 2.5, ratedI: 0.3 },
    terminals: [
      { label: '', dx: -36, dy: 0, ldx: -8, ldy: 8 },
      { label: '', dx: 36, dy: 0, ldx: 2, ldy: 8 }
    ],
    draw: drawBulb
  },
  resistor: {
    name: '电阻',
    w: 84, h: 44,
    defaultParams: { resistance: 10 },
    terminals: [
      { label: '', dx: -40, dy: 0, ldx: -8, ldy: 8 },
      { label: '', dx: 40, dy: 0, ldx: 2, ldy: 8 }
    ],
    draw: drawResistor,
    drawSymbol: drawResistorSymbol
  },
  voltmeter: {
    name: '电压表',
    w: 84, h: 64,
    defaultParams: { range: 3, internalR: 3000 },
    terminals: [
      { label: '-', dx: -40, dy: 0, ldx: -10, ldy: 8 },
      { label: '+', dx: 40, dy: 0, ldx: 4, ldy: 8 }
    ],
    draw: (ctx, c) => drawMeter(ctx, c, 'V', '电压表')
  },
  ammeter: {
    name: '电流表',
    w: 84, h: 64,
    defaultParams: { range: 0.6, internalR: 0.5 },
    terminals: [
      { label: '-', dx: -40, dy: 0, ldx: -10, ldy: 8 },
      { label: '+', dx: 40, dy: 0, ldx: 4, ldy: 8 }
    ],
    draw: (ctx, c) => drawMeter(ctx, c, 'A', '电流表')
  },
  ohmmeter: {
    name: '欧姆表',
    w: 96, h: 88,
    defaultParams: { E: 1.5, Rmid: 1500 },
    terminals: [
      { label: '红', dx: -44, dy: 0, ldx: -8, ldy: 10 },
      { label: '黑', dx: 44, dy: 0, ldx: 2, ldy: 10 }
    ],
    draw: drawOhmmeter
  },
  rheostat: {
    name: '滑动变阻器',
    w: 132, h: 84,
    defaultParams: { maxR: 20, slider: 0.5 },
    terminals: [
      { label: 'C', dx: -46, dy: -38, ldx: -6, ldy: -6 },
      { label: 'D', dx: 46, dy: -38, ldx: 2, ldy: -6 },
      { label: 'A', dx: -46, dy: 38, ldx: -6, ldy: 8 },
      { label: 'B', dx: 46, dy: 38, ldx: 2, ldy: 8 }
    ],
    // 电路图模式下作为二端元件，端子贴在元件两侧轴线上（与布局端口一致）；
    // 分压接法时追加滑片抽头端子（滑片正下方）
    symbolTerminals: (c) => {
      const t = [
        { dx: -64, dy: 0 },
        { dx: 64, dy: 0 }
      ]
      if (c.state && c.state.divider) t.push({ dx: -40 + (c.params.slider || 0) * 80, dy: 24 })
      return t
    },
    draw: drawRheostat,
    drawSymbol: drawRheostatSymbol
  },
  switch: {
    name: '单刀开关',
    w: 88, h: 48,
    defaultParams: { closed: false },
    terminals: [
      { label: '', dx: -40, dy: 0, ldx: -8, ldy: 8 },
      { label: '', dx: 40, dy: 0, ldx: 2, ldy: 8 }
    ],
    draw: drawSwitch,
    drawSymbol: drawSwitchSymbol
  },
  switch2: {
    name: '单刀双掷开关',
    w: 116, h: 72,
    defaultParams: { position: 'up' },
    terminals: [
      { label: '', dx: -52, dy: 0, ldx: -10, ldy: 8 },
      { label: '', dx: 52, dy: -24, ldx: 2, ldy: -6 },
      { label: '', dx: 52, dy: 24, ldx: 2, ldy: 8 }
    ],
    draw: drawSwitch2,
    drawSymbol: drawSwitch2Symbol
  }
}

// 器材栏顺序
export const PART_LIST = ['battery', 'batteryBox', 'bulb', 'resistor', 'voltmeter', 'ammeter', 'ohmmeter', 'rheostat', 'switch', 'switch2']

// ---------- 工厂 ----------
export function createComponent(type, extra = {}) {
  const def = COMPONENT_TYPES[type]
  let w = def.w
  if (type === 'batteryBox') {
    const cells = extra.cells || def.defaultParams.cells
    w = 80 + cells * 60 // 单节140 / 双节200 / 四节320
  }
  return {
    id: nextId(),
    type,
    x: 0,
    y: 0,
    w,
    h: def.h,
    rotation: 0, // 旋转角度（度，0~360，绕元件中心）
    params: { ...def.defaultParams, ...extra },
    state: {},
    selected: false
  }
}

export function getTypeDef(comp) {
  return COMPONENT_TYPES[comp.type]
}

// 元件局部坐标 ← 世界坐标（逆旋转）
export function toCompLocal(comp, x, y) {
  const rad = ((comp.rotation || 0) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = x - comp.x
  const dy = y - comp.y
  return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos }
}

// 接线柱全局坐标（随元件旋转）
export function getTerminals(comp) {
  const def = COMPONENT_TYPES[comp.type]
  let terms = def.terminals
  // 电池盒宽度随节数变化，接线柱贴在盒体两端
  if (comp.type === 'batteryBox') {
    const hw = comp.w / 2 - 10
    terms = [
      { label: '-', dx: -hw, dy: 0, ldx: -12, ldy: 8 },
      { label: '+', dx: hw, dy: 0, ldx: 4, ldy: 8 }
    ]
  }
  const rad = ((comp.rotation || 0) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return terms.map((t, i) => ({
    id: comp.id + ':' + (t.label || 't' + i),
    label: t.label,
    x: comp.x + t.dx * cos - (t.dy || 0) * sin,
    y: comp.y + t.dx * sin + (t.dy || 0) * cos,
    compId: comp.id,
    ldx: t.ldx,
    ldy: t.ldy
  }))
}

// 元件包围盒（用于命中检测与选中框；旋转时按轴对齐包围盒估算）
export function getBounds(comp) {
  const rad = ((comp.rotation || 0) * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const w = comp.w * cos + comp.h * sin
  const h = comp.w * sin + comp.h * cos
  return { x: comp.x - w / 2, y: comp.y - h / 2, w, h }
}

// 命中检测：点是否在元件上（变换到元件局部坐标，跟随旋转）
export function hitComponent(comp, px, py) {
  const l = toCompLocal(comp, px, py)
  return Math.abs(l.x) <= comp.w / 2 + 6 && Math.abs(l.y) <= comp.h / 2 + 6
}

// ---------- 通用绘制 ----------
// 电路图模式下元件的左右接线端口（元件局部坐标）
// 默认取端子中最左/最右者；电池盒端子随节数变化；变阻器/双掷开关用专用符号端口
export function symbolPorts(c) {
  if (c.type === 'batteryBox') {
    const dx = c.w / 2 - 10
    return { l: { dx: -dx, dy: 0 }, r: { dx, dy: 0 } }
  }
  if (c.type === 'rheostat') return { l: { dx: -64, dy: 0 }, r: { dx: 64, dy: 0 } }
  if (c.type === 'switch2') {
    const dy = c.params.position === 'up' ? -24 : 24
    return { l: { dx: -52, dy: 0 }, r: { dx: 52, dy } }
  }
  const ts = COMPONENT_TYPES[c.type].terminals
  let l = ts[0]
  let r = ts[0]
  for (const t of ts) {
    if (t.dx < l.dx) l = t
    if (t.dx > r.dx) r = t
  }
  return { l: { dx: l.dx, dy: l.dy || 0 }, r: { dx: r.dx, dy: r.dy || 0 } }
}

function drawTerminal(ctx, x, y, label, ldx, ldy) {
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = COLORS.term
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(x, y, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  if (label) {
    ctx.fillStyle = COLORS.term
    ctx.font = '11px "Microsoft YaHei", sans-serif'
    ctx.textAlign = ldx < 0 ? 'right' : 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x + ldx, y + ldy)
  }
  ctx.restore()
}

// ===== 绘制入口 =====
// 默认走程序化实物绘制（def.draw）；opts.symbol 时用电路符号画法（def.drawSymbol，电路图视图用）
export function drawComponent(ctx, comp, opts = {}) {
  const def = COMPONENT_TYPES[comp.type]
  ctx.save()
  ctx.translate(comp.x, comp.y)
  if (comp.rotation) ctx.rotate((comp.rotation * Math.PI) / 180)
  const drawFn = opts.symbol && def.drawSymbol ? def.drawSymbol : def.draw
  drawFn(ctx, comp)
  // 选中框（随元件旋转的局部坐标虚线框）
  if (comp.selected) {
    ctx.save()
    ctx.strokeStyle = COLORS.blue
    ctx.lineWidth = 1.4
    ctx.setLineDash([6, 4])
    ctx.strokeRect(-comp.w / 2 - 10, -comp.h / 2 - 10, comp.w + 20, comp.h + 20)
    ctx.restore()
  }
  ctx.restore()

  // 接线柱（符号模式下若定义了 symbolTerminals，用符号端子位置，与电路图布局端口一致）
  let terms = getTerminals(comp)
  if (opts.symbol && def.symbolTerminals) {
    const stList = typeof def.symbolTerminals === 'function' ? def.symbolTerminals(comp) : def.symbolTerminals
    const rad = ((comp.rotation || 0) * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    terms = stList.map((t, i) => ({
      id: comp.id + ':st' + i,
      label: '',
      x: comp.x + t.dx * cos - (t.dy || 0) * sin,
      y: comp.y + t.dx * sin + (t.dy || 0) * cos,
      compId: comp.id,
      ldx: -8,
      ldy: 8
    }))
  }
  for (const t of terms) {
    const td = def.terminals.find((x) => x.label === t.label)
    drawTerminal(ctx, t.x, t.y, t.label, td ? td.ldx : -8, td ? td.ldy : 8)
  }
}

// ---------- 干电池单元（电池与电池盒共用的半写实画法） ----------
// 中心 (cx, cy)，长度 len，直径 dia，正极铜头朝右；label 印在电池皮上（可选）
function drawDryCell(ctx, cx, cy, len, dia, label) {
  const r = dia / 2
  const x0 = cx - len / 2
  const capW = Math.max(3, len * 0.08)  // 负极银色盖
  const ringW = Math.max(3, len * 0.09) // 正极黑环
  const nubW = Math.max(4, len * 0.10)  // 铜头
  const bodyX = x0 + capW
  const bodyW = len - capW - ringW - nubW
  // 负极金属盖
  let g = ctx.createLinearGradient(0, cy - r, 0, cy + r)
  g.addColorStop(0, '#f8fafc')
  g.addColorStop(0.5, '#cbd5e1')
  g.addColorStop(1, '#94a3b8')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(x0, cy - r, capW + 1, dia, 1.5)
  ctx.fill()
  // 电池皮（绿色圆柱，竖向渐变出体积感）
  g = ctx.createLinearGradient(0, cy - r, 0, cy + r)
  g.addColorStop(0, '#4c9e77')
  g.addColorStop(0.45, '#2b7a57')
  g.addColorStop(1, '#1a4d38')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(bodyX, cy - r, bodyW, dia, 2)
  ctx.fill()
  // 正极黑环
  g = ctx.createLinearGradient(0, cy - r, 0, cy + r)
  g.addColorStop(0, '#475569')
  g.addColorStop(1, '#0f172a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(bodyX + bodyW, cy - r, ringW + 1, dia, 1.5)
  ctx.fill()
  // 铜头（略细于本体）
  const nr = r * 0.62
  g = ctx.createLinearGradient(0, cy - nr, 0, cy + nr)
  g.addColorStop(0, '#f0b28a')
  g.addColorStop(0.5, '#cd7f4f')
  g.addColorStop(1, '#a05a30')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(bodyX + bodyW + ringW, cy - nr, nubW, nr * 2, 1.5)
  ctx.fill()
  // 顶部高光条
  ctx.fillStyle = 'rgba(255,255,255,0.26)'
  ctx.beginPath()
  ctx.roundRect(bodyX + 1.5, cy - r + 2, bodyW - 3, Math.max(2, r * 0.42), 2)
  ctx.fill()
  // 电池皮文字
  if (label) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = 'bold ' + Math.max(8, Math.round(dia * 0.42)) + 'px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, bodyX + bodyW / 2, cy)
  }
}

// ---------- 电池（实物：单节干电池） ----------
function drawBattery(ctx, comp) {
  const v = comp.params.voltage
  // 引线
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-44, 0)
  ctx.lineTo(-33, 0)
  ctx.moveTo(44, 0)
  ctx.lineTo(33, 0)
  ctx.stroke()
  drawDryCell(ctx, 0, 0, 66, 26, v + 'V')
  // 电压标注
  ctx.fillStyle = COLORS.red
  ctx.font = 'bold 12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(v + 'V', 0, 24)
}

// ---------- 电池（电路符号） ----------
function drawBatterySymbol(ctx, comp) {
  const v = comp.params.voltage
  ctx.strokeStyle = COLORS.line
  ctx.fillStyle = COLORS.line
  ctx.lineWidth = 2.4
  // 正极长竖线
  ctx.beginPath()
  ctx.moveTo(16, -14)
  ctx.lineTo(16, 14)
  ctx.stroke()
  // 负极短粗竖线
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-16, -9)
  ctx.lineTo(-16, 9)
  ctx.stroke()
  // 中部细线连接
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-16, 0)
  ctx.lineTo(16, 0)
  ctx.stroke()
  // 标注电压
  ctx.fillStyle = COLORS.red
  ctx.font = 'bold 12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(v + 'V', 0, 24)
}

// ---------- 电池盒（实物：塑料盒 + 内凹电池槽 + 干电池） ----------
function drawBatteryBox(ctx, comp) {
  const cells = comp.params.cells
  const loaded = comp.params.loaded
  const w = comp.w
  const half = w / 2
  ctx.save()
  // 塑料盒体
  const boxX = -half + 6
  const boxW = w - 12
  const boxY = -comp.h / 2 + 4
  const boxH = comp.h - 8
  const grad = ctx.createLinearGradient(0, boxY, 0, boxY + boxH)
  grad.addColorStop(0, '#fdf6e3')
  grad.addColorStop(1, '#ecdfbc')
  ctx.fillStyle = grad
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, 6)
  ctx.fill()
  ctx.stroke()
  // 内凹电池槽
  const slotX = boxX + 8
  const slotW = boxW - 16
  const slotY = -14
  const slotH = 23
  ctx.fillStyle = '#e2d5b0'
  ctx.beginPath()
  ctx.roundRect(slotX, slotY, slotW, slotH, 4)
  ctx.fill()
  // 槽口上沿内阴影（凹进去的感觉）
  ctx.strokeStyle = 'rgba(120, 100, 60, 0.5)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(slotX + 3, slotY + 1.5)
  ctx.lineTo(slotX + slotW - 3, slotY + 1.5)
  ctx.stroke()
  // 电池
  const cellW = 44
  const gap = 8
  const total = cells * cellW + (cells - 1) * gap
  const cy = slotY + slotH / 2
  let cx = -total / 2 + cellW / 2
  for (let i = 0; i < cells; i++) {
    if (loaded) {
      drawDryCell(ctx, cx, cy, 40, 17)
    } else {
      // 空槽虚线框
      ctx.strokeStyle = '#c3b58c'
      ctx.lineWidth = 1.4
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.roundRect(cx - 20, cy - 8.5, 40, 17, 3)
      ctx.stroke()
      ctx.setLineDash([])
    }
    cx += cellW + gap
  }
  // 负极弹簧（槽左端，之字形）
  ctx.strokeStyle = '#8a97a5'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  const sprX = slotX + 3
  ctx.moveTo(sprX, cy)
  for (let i = 0; i < 3; i++) {
    ctx.lineTo(sprX + 3 + i * 2.4, cy - 4.5)
    ctx.lineTo(sprX + 4.8 + i * 2.4, cy + 4.5)
  }
  ctx.stroke()
  // 正极接触片（槽右端）
  const cg = ctx.createLinearGradient(0, slotY + 4, 0, slotY + slotH - 4)
  cg.addColorStop(0, '#e2e8f0')
  cg.addColorStop(1, '#94a3b8')
  ctx.fillStyle = cg
  ctx.beginPath()
  ctx.roundRect(slotX + slotW - 9, slotY + 4, 5, slotH - 8, 1.5)
  ctx.fill()
  // 电压标注
  ctx.fillStyle = loaded ? COLORS.red : COLORS.dim
  ctx.font = 'bold 12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(loaded ? cells * 1.5 + 'V' : '未装电池', 0, comp.h / 2 - 10)
  ctx.restore()
}

// ---------- 电池盒（电路符号：cells 节电池串联） ----------
function drawBatteryBoxSymbol(ctx, comp) {
  const cells = comp.params.cells
  const sp = 26
  const total = cells * sp
  const x0 = -total / 2
  const half = comp.w / 2
  ctx.strokeStyle = COLORS.line
  ctx.fillStyle = COLORS.line
  // 连接导线（分段画，避开电池符号）
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-half + 10, 0)
  ctx.lineTo(x0 + sp / 2 - 9, 0)
  for (let i = 0; i < cells - 1; i++) {
    ctx.moveTo(x0 + sp / 2 + i * sp + 9, 0)
    ctx.lineTo(x0 + sp / 2 + (i + 1) * sp - 9, 0)
  }
  ctx.moveTo(x0 + total - sp / 2 + 9, 0)
  ctx.lineTo(half - 10, 0)
  ctx.stroke()
  // 各节电池：左负（短粗）右正（长细）
  for (let i = 0; i < cells; i++) {
    const cx = x0 + sp / 2 + i * sp
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(cx - 4, -8)
    ctx.lineTo(cx - 4, 8)
    ctx.stroke()
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(cx + 4, -12)
    ctx.lineTo(cx + 4, 12)
    ctx.stroke()
  }
  // 电压标注
  ctx.fillStyle = COLORS.red
  ctx.font = 'bold 12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(cells * 1.5 + 'V', 0, comp.h / 2 - 10)
}

// ---------- 小灯泡（实物：螺口灯泡 + 灯座，五态） ----------
function drawBulb(ctx, comp) {
  const st = comp.state.bulbState || 'off'
  const s = BULB_STATES[st] || BULB_STATES.off
  const gx = 0, gy = -9, r = 13 // 玻璃泡中心
  // 引线
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-36, 0)
  ctx.lineTo(-24, 0)
  ctx.moveTo(36, 0)
  ctx.lineTo(24, 0)
  ctx.stroke()
  // 光晕（亮态）
  if (s.glow > 0) {
    const g = ctx.createRadialGradient(gx, gy, 2, gx, gy, s.glowR)
    g.addColorStop(0, 'rgba(255, 200, 60, ' + s.glow + ')')
    g.addColorStop(1, 'rgba(255, 200, 60, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(gx, gy, s.glowR, 0, Math.PI * 2)
    ctx.fill()
  }
  // 灯座（塑料）
  const sg = ctx.createLinearGradient(0, 2, 0, 14)
  sg.addColorStop(0, '#eef3f8')
  sg.addColorStop(1, '#c3cedb')
  ctx.fillStyle = sg
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.roundRect(-24, 2, 48, 12, 3)
  ctx.fill()
  ctx.stroke()
  // 灯座接线螺钉
  for (const sx of [-16, 16]) {
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.arc(sx, 8, 2.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(sx - 1.4, 8)
    ctx.lineTo(sx + 1.4, 8)
    ctx.stroke()
  }
  // 螺口金属底座（含螺纹）
  const bg = ctx.createLinearGradient(0, -1, 0, 5)
  bg.addColorStop(0, '#e2e8f0')
  bg.addColorStop(1, '#94a3b8')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(-7, -1, 14, 6, 1.5)
  ctx.fill()
  ctx.strokeStyle = 'rgba(71,85,105,0.7)'
  ctx.lineWidth = 0.8
  for (const ty of [0.6, 2.6]) {
    ctx.beginPath()
    ctx.moveTo(-7, ty)
    ctx.lineTo(7, ty)
    ctx.stroke()
  }
  // 玻璃泡
  const glass = ctx.createRadialGradient(gx - 4, gy - 5, 2, gx, gy, r)
  glass.addColorStop(0, 'rgba(255,255,255,0.95)')
  glass.addColorStop(1, 'rgba(219,234,254,0.75)')
  ctx.fillStyle = glass
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(gx, gy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // 灯丝支架
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-5, 0)
  ctx.lineTo(-5, -5)
  ctx.moveTo(5, 0)
  ctx.lineTo(5, -5)
  ctx.stroke()
  // 灯丝（V 形）
  ctx.strokeStyle = s.filament
  ctx.lineWidth = 2.2
  ctx.beginPath()
  if (st === 'burnt') {
    // 断裂灯丝
    ctx.moveTo(-5, -5)
    ctx.lineTo(-1, -12)
    ctx.moveTo(5, -5)
    ctx.lineTo(2, -10)
    ctx.stroke()
    // 裂纹
    ctx.strokeStyle = '#7c2d12'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-9, -16)
    ctx.lineTo(-4, -11)
    ctx.lineTo(-6, -6)
    ctx.moveTo(7, -18)
    ctx.lineTo(3, -12)
    ctx.stroke()
    // 底部焦黑
    ctx.fillStyle = 'rgba(51,65,85,0.45)'
    ctx.beginPath()
    ctx.arc(gx, gy, r - 2, 0.4, Math.PI - 0.4)
    ctx.fill()
  } else {
    ctx.moveTo(-5, -5)
    ctx.lineTo(0, -16)
    ctx.lineTo(5, -5)
    ctx.stroke()
  }
  // 玻璃高光
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(gx - 4, gy - 4, 7, Math.PI * 0.9, Math.PI * 1.4)
  ctx.stroke()
  // 额定值标注
  ctx.fillStyle = COLORS.dim
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(comp.params.ratedV + 'V ' + comp.params.ratedI + 'A', 0, comp.h / 2 - 6)
}

// ---------- 电阻 ----------
// 色环计算：两位有效数字 + 乘数指数（阻值 = (10*d1+d2) × 10^exp）
function resistorBands(R) {
  if (!(R > 0)) return null
  let exp = Math.floor(Math.log10(R)) - 1
  let sig = Math.round(R / Math.pow(10, exp))
  if (sig >= 100) { sig = Math.round(sig / 10); exp += 1 }
  if (sig < 10) { sig *= 10; exp -= 1 }
  return [Math.floor(sig / 10), sig % 10, exp]
}
const BAND_COLORS = ['#202020', '#7b3f1d', '#d42a1e', '#f07f13', '#f2c812', '#2e9e44', '#1d4fc4', '#7d3ac1', '#8c8c8c', '#f5f5f5']
function bandColor(v) {
  if (v === -2) return '#c8c8c8' // 银 ×0.01
  if (v === -1) return '#d4af37' // 金 ×0.1
  return BAND_COLORS[v] || '#202020'
}

// 实物：色环电阻（金属引脚 + 陶瓷体 + 四环）
function drawResistor(ctx, comp) {
  const R = comp.params.resistance
  // 引脚
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-40, 0)
  ctx.lineTo(-20, 0)
  ctx.moveTo(40, 0)
  ctx.lineTo(20, 0)
  ctx.stroke()
  // 陶瓷体（胶囊形，竖向渐变）
  const g = ctx.createLinearGradient(0, -8, 0, 8)
  g.addColorStop(0, '#f0ddad')
  g.addColorStop(0.5, '#ddc084')
  g.addColorStop(1, '#c4a265')
  ctx.fillStyle = g
  ctx.strokeStyle = '#a5854c'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.roundRect(-22, -8, 44, 16, 8)
  ctx.fill()
  ctx.stroke()
  // 色环（裁剪到胶囊体内）
  const bands = resistorBands(R)
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-22, -8, 44, 16, 8)
  ctx.clip()
  if (bands) {
    const xs = [-13, -5, 3]
    bands.forEach((b, i) => {
      ctx.fillStyle = bandColor(b)
      ctx.fillRect(xs[i], -9, 4, 18)
    })
  }
  // 公差环（金）
  ctx.fillStyle = '#d4af37'
  ctx.fillRect(14, -9, 3, 18)
  // 顶部高光
  ctx.fillStyle = 'rgba(255,255,255,0.32)'
  ctx.beginPath()
  ctx.roundRect(-19, -6.5, 38, 3.5, 1.8)
  ctx.fill()
  ctx.restore()
  // 阻值标注
  ctx.fillStyle = COLORS.blue
  ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(R + 'Ω', 0, comp.h / 2 - 12)
}

// 电路符号：矩形（人教版）
function drawResistorSymbol(ctx, comp) {
  // 引线
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-40, 0)
  ctx.lineTo(-20, 0)
  ctx.moveTo(40, 0)
  ctx.lineTo(20, 0)
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.rect(-20, -8, 40, 16)
  ctx.fill()
  ctx.stroke()
  // 阻值标注
  ctx.fillStyle = COLORS.blue
  ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(comp.params.resistance + 'Ω', 0, comp.h / 2 - 12)
}

// ---------- 电表（实物：教学指针表，电压表/电流表） ----------
function drawMeter(ctx, comp, letter, label) {
  const range = comp.params.range
  // 引线
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-40, 0)
  ctx.lineTo(-32, 0)
  ctx.moveTo(40, 0)
  ctx.lineTo(32, 0)
  ctx.stroke()
  // 表壳（浅色塑料）
  const caseG = ctx.createLinearGradient(0, -30, 0, 24)
  caseG.addColorStop(0, '#fbfdff')
  caseG.addColorStop(1, '#d7dfe8')
  ctx.fillStyle = caseG
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.roundRect(-32, -30, 64, 54, 6)
  ctx.fill()
  ctx.stroke()
  // 深色表圈
  ctx.fillStyle = '#273242'
  ctx.beginPath()
  ctx.roundRect(-27, -25, 54, 38, 4)
  ctx.fill()
  // 表盘窗口（米白）
  const dialG = ctx.createLinearGradient(0, -22, 0, 10)
  dialG.addColorStop(0, '#fffdf4')
  dialG.addColorStop(1, '#f4ecd8')
  ctx.fillStyle = dialG
  ctx.beginPath()
  ctx.roundRect(-24, -22, 48, 32, 3)
  ctx.fill()
  // 刻度弧与刻度（指针轴 (0,-3)，左下 0 → 右下满量程）
  const px = 0, py = -3, pr = 13
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(px, py, pr - 3, Math.PI * 0.75, Math.PI * 2.25)
  ctx.stroke()
  for (let i = 0; i <= 5; i++) {
    const ang = Math.PI * 0.75 + (i / 5) * Math.PI * 1.5
    const x0 = px + Math.cos(ang) * (pr - 5)
    const y0 = py + Math.sin(ang) * (pr - 5)
    const x1 = px + Math.cos(ang) * (pr - 2)
    const y1 = py + Math.sin(ang) * (pr - 2)
    ctx.strokeStyle = i % 5 === 0 ? '#475569' : '#b6bfca'
    ctx.lineWidth = i % 5 === 0 ? 1.4 : 0.9
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }
  // 单位字母（表盘上部）
  ctx.fillStyle = COLORS.line
  ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(letter, px, py - 8)
  // 指针（按读数偏转）
  const reading = comp.state.reading || 0
  const rangeMax = comp.state.rangeMax || range
  const over = comp.state.over
  const frac = Math.min(1, Math.max(0, reading / rangeMax))
  const ang = Math.PI * 0.75 + frac * Math.PI * 1.5
  ctx.strokeStyle = COLORS.red
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(px, py)
  ctx.lineTo(px + Math.cos(ang) * (pr - 4), py + Math.sin(ang) * (pr - 4))
  ctx.stroke()
  // 指针轴帽
  ctx.fillStyle = '#475569'
  ctx.beginPath()
  ctx.arc(px, py, 2, 0, Math.PI * 2)
  ctx.fill()
  // 玻璃反光
  ctx.fillStyle = 'rgba(255,255,255,0.30)'
  ctx.beginPath()
  ctx.moveTo(-24, -22)
  ctx.lineTo(-9, -22)
  ctx.lineTo(-21, 10)
  ctx.lineTo(-24, 10)
  ctx.closePath()
  ctx.fill()
  // 超量程：红框 + 警示
  if (over) {
    ctx.strokeStyle = COLORS.red
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.roundRect(-27, -25, 54, 38, 4)
    ctx.stroke()
    ctx.fillStyle = COLORS.red
    ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('超量程', 0, -36)
  }
  // 量程 / 名称 / 内阻标注
  ctx.fillStyle = COLORS.blue
  ctx.font = '11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(range + (letter === 'V' ? 'V' : 'A'), 0, 18)
  ctx.fillStyle = COLORS.dim
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.fillText(label, 0, 32)
  const ir = comp.params.internalR
  if (ir !== undefined) {
    ctx.fillStyle = COLORS.orange
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.fillText((letter === 'V' ? 'Rv ' : 'RA ') + (ir >= 1000 ? (ir / 1000) + 'kΩ' : ir + 'Ω'), 0, 44)
  }
}

// ---------- 欧姆表（实物：指针式多用表欧姆档，M5：电流表+电池+调零电阻） ----------
function drawOhmmeter(ctx, comp) {
  const E = comp.params.E || 1.5
  const Rmid = comp.params.Rmid || 1500
  const Ig = E / 1500 // 满偏电流（1mA @ 1.5V 默认）
  const r = 20
  // 引线（红 + / 黑 -）
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-44, 0)
  ctx.lineTo(-40, 0)
  ctx.moveTo(44, 0)
  ctx.lineTo(40, 0)
  ctx.stroke()
  // 表壳（浅色塑料）
  const caseG = ctx.createLinearGradient(0, -36, 0, 44)
  caseG.addColorStop(0, '#fbfdff')
  caseG.addColorStop(1, '#d7dfe8')
  ctx.fillStyle = caseG
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.roundRect(-40, -36, 80, 80, 7)
  ctx.fill()
  ctx.stroke()
  // 深色表圈
  ctx.fillStyle = '#273242'
  ctx.beginPath()
  ctx.roundRect(-32, -33, 64, 47, 4)
  ctx.fill()
  // 表盘窗口（米白）
  const dialG = ctx.createLinearGradient(0, -30, 0, 11)
  dialG.addColorStop(0, '#fffdf4')
  dialG.addColorStop(1, '#f4ecd8')
  ctx.fillStyle = dialG
  ctx.beginPath()
  ctx.roundRect(-29, -30, 58, 41, 3)
  ctx.fill()
  // 反比刻度弧（左 ∞ → 右 0）
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(0, -10, r - 6, Math.PI * 0.75, Math.PI * 2.25)
  ctx.stroke()
  // 刻度：Rx → frac = Rmid/(Rmid+Rx)（反比）；数字沿刻度外侧排布，避免挤在圆心
  const ticks = [0, Rmid / 3, Rmid, Rmid * 3, Infinity]
  const tickLabel = (v) => (v === Infinity ? '∞' : v >= 1000 ? (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k' : String(Math.round(v)))
  ticks.forEach((v) => {
    const frac = v === Infinity ? 0 : Rmid / (Rmid + v)
    const ang = Math.PI * 0.75 + frac * Math.PI * 1.5
    const x0 = Math.cos(ang) * (r - 9)
    const y0 = -10 + Math.sin(ang) * (r - 9)
    const x1 = Math.cos(ang) * (r - 4)
    const y1 = -10 + Math.sin(ang) * (r - 4)
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    ctx.fillStyle = '#475569'
    ctx.font = '8px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(tickLabel(v), Math.cos(ang) * (r - 1), -10 + Math.sin(ang) * (r - 1))
  })
  // 指针（frac = I/Ig：0 → ∞ 左端，1 → 0Ω 右端）
  const frac = comp.state.frac || 0
  const over = comp.state.over
  const ang = Math.PI * 0.75 + Math.min(1, Math.max(0, frac)) * Math.PI * 1.5
  ctx.strokeStyle = COLORS.red
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(0, -10)
  ctx.lineTo(Math.cos(ang) * (r - 6), -10 + Math.sin(ang) * (r - 6))
  ctx.stroke()
  // 指针轴帽
  ctx.fillStyle = '#475569'
  ctx.beginPath()
  ctx.arc(0, -10, 2, 0, Math.PI * 2)
  ctx.fill()
  // 玻璃反光
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.beginPath()
  ctx.moveTo(-29, -30)
  ctx.lineTo(-12, -30)
  ctx.lineTo(-25, 11)
  ctx.lineTo(-29, 11)
  ctx.closePath()
  ctx.fill()
  // 打表：红框
  if (over) {
    ctx.strokeStyle = COLORS.red
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.roundRect(-32, -33, 64, 47, 4)
    ctx.stroke()
  }
  // Ω 档标识（表盘下部空档处）
  ctx.fillStyle = COLORS.line
  ctx.font = 'bold 12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Ω', 0, 3)
  // 中值标注
  ctx.fillStyle = COLORS.blue
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.fillText('中值 ' + (Rmid >= 1000 ? (Rmid / 1000) + 'k' : Rmid) + 'Ω', 0, 20)
  // 读数 / 状态
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (comp.state.tip) {
    ctx.fillStyle = COLORS.red
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.fillText(comp.state.tip, 0, 31)
  } else if (comp.state.zero) {
    ctx.fillStyle = '#16a34a'
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.fillText('✓ 已调零', 0, 31)
  } else if (comp.state.inf) {
    ctx.fillStyle = COLORS.dim
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.fillText('Rx = ∞', 0, 31)
  } else if (comp.state.reading !== undefined && comp.state.reading !== null && !Number.isNaN(comp.state.reading)) {
    ctx.fillStyle = COLORS.line
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.fillText('Rx = ' + (comp.state.reading >= 1000 ? (comp.state.reading / 1000).toFixed(1) + 'k' : Math.round(comp.state.reading)) + 'Ω', 0, 31)
  } else {
    ctx.fillStyle = COLORS.dim
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.fillText('未接入', 0, 31)
  }
  // 调零旋钮（底部，拖动改变 Rmid 1000~2000；位置 (0,40) 与命中检测绑定，勿移动）
  const knobY = 40
  const kg = ctx.createLinearGradient(0, knobY - 8, 0, knobY + 8)
  kg.addColorStop(0, '#f1f5f9')
  kg.addColorStop(1, '#94a3b8')
  ctx.fillStyle = kg
  ctx.strokeStyle = COLORS.term
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(0, knobY, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // 旋钮指示线（Rmid 1000~2000 → -120°~+120°）
  const kfrac = Math.min(1, Math.max(0, (Rmid - 1000) / 1000))
  const kang = -Math.PI / 2 + (kfrac - 0.5) * (Math.PI * 2 / 3)
  ctx.strokeStyle = COLORS.red
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(0, knobY)
  ctx.lineTo(Math.cos(kang) * 6, knobY + Math.sin(kang) * 6)
  ctx.stroke()
  ctx.fillStyle = COLORS.dim
  ctx.font = '9px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('调零', 0, knobY + 13)
}

// ---------- 滑动变阻器（实物：陶瓷管绕线 + 金属杆滑块） ----------
// 注意：滑块可视部分须覆盖 y∈[-16,0]（与 hitSlider 命中区域绑定）
function drawRheostat(ctx, comp) {
  const maxR = comp.params.maxR
  const slider = comp.params.slider
  const sxp = -40 + slider * 80 // 滑块 x
  // 陶瓷管（米白圆柱）
  const tubeG = ctx.createLinearGradient(0, -13, 0, 3)
  tubeG.addColorStop(0, '#f7f2e7')
  tubeG.addColorStop(1, '#d9d0bc')
  ctx.fillStyle = tubeG
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.roundRect(-42, -13, 84, 16, 8)
  ctx.fill()
  ctx.stroke()
  // 电阻丝绕组（裁剪到陶瓷管内）
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-42, -13, 84, 16, 8)
  ctx.clip()
  ctx.strokeStyle = '#a06832'
  ctx.lineWidth = 1.5
  for (let x = -39; x <= 39; x += 4) {
    ctx.beginPath()
    ctx.moveTo(x, -12)
    ctx.lineTo(x, 2)
    ctx.stroke()
  }
  // 绕组顶部高光
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(-40, -12, 80, 3)
  ctx.restore()
  // 金属滑杆
  const rodG = ctx.createLinearGradient(0, -32, 0, -28)
  rodG.addColorStop(0, '#f1f5f9')
  rodG.addColorStop(1, '#94a3b8')
  ctx.fillStyle = rodG
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(-48, -32, 96, 4, 2)
  ctx.fill()
  ctx.stroke()
  // 两端支柱（C/D 一侧连接滑杆，向下连到陶瓷管端部）
  ctx.fillStyle = '#475569'
  ctx.beginPath()
  ctx.roundRect(-48, -28, 4, 15, 1)
  ctx.roundRect(44, -28, 4, 15, 1)
  ctx.fill()
  // C D 接线短柱（滑杆端部向上）
  ctx.beginPath()
  ctx.roundRect(-48, -38, 4, 6, 1)
  ctx.roundRect(44, -38, 4, 6, 1)
  ctx.fill()
  // A B 引线（线圈两端向下）
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(-42, -2)
  ctx.lineTo(-46, -2)
  ctx.lineTo(-46, 38)
  ctx.moveTo(42, -2)
  ctx.lineTo(46, -2)
  ctx.lineTo(46, 38)
  ctx.stroke()
  // 滑块（金属块跨在滑杆上）
  const slG = ctx.createLinearGradient(0, -34, 0, -26)
  slG.addColorStop(0, '#e2e8f0')
  slG.addColorStop(1, '#8fa0ae')
  ctx.fillStyle = slG
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.roundRect(sxp - 6, -34, 12, 8, 2)
  ctx.fill()
  ctx.stroke()
  // 滑块触指（向下接触绕组，橙色便于识别；覆盖命中区 y∈[-16,0]）
  ctx.fillStyle = COLORS.orange
  ctx.beginPath()
  ctx.roundRect(sxp - 2, -26, 4, 12, 1.5)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(sxp - 6, -14)
  ctx.lineTo(sxp + 6, -14)
  ctx.lineTo(sxp, -5)
  ctx.closePath()
  ctx.fill()
  // 标注
  ctx.fillStyle = COLORS.blue
  ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(maxR + 'Ω', 0, 34)
  ctx.fillStyle = COLORS.dim
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.fillText('滑动变阻器', 0, 48)
}

// ---------- 开关共用件 ----------
// 黄铜接线柱（带螺钉槽）
function drawBrassPost(ctx, x, y) {
  const g = ctx.createRadialGradient(x - 1.5, y - 1.5, 0.5, x, y, 5)
  g.addColorStop(0, '#f8d98a')
  g.addColorStop(1, '#b0772f')
  ctx.fillStyle = g
  ctx.strokeStyle = '#8a5a1e'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(x, y, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#8a5a1e'
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.moveTo(x - 2.4, y)
  ctx.lineTo(x + 2.4, y)
  ctx.stroke()
}

// 铜刀片（从轴点 (x0,y0) 沿角度 ang 伸出 len，尖端带绝缘柄）
function drawBlade(ctx, x0, y0, ang, len) {
  ctx.save()
  ctx.translate(x0, y0)
  ctx.rotate(ang)
  const g = ctx.createLinearGradient(0, -3, 0, 3)
  g.addColorStop(0, '#f6c177')
  g.addColorStop(1, '#b0772f')
  ctx.fillStyle = g
  ctx.strokeStyle = '#8a5a1e'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, -2.6)
  ctx.lineTo(len - 7, -2.6)
  ctx.lineTo(len, 0)
  ctx.lineTo(len - 7, 2.6)
  ctx.lineTo(0, 2.6)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // 绝缘柄（黑色柄头）
  ctx.fillStyle = '#273242'
  ctx.beginPath()
  ctx.arc(len - 10, 0, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ---------- 单刀开关（实物：绝缘底座 + 黄铜柱 + 铜刀片） ----------
function drawSwitch(ctx, comp) {
  const closed = comp.params.closed
  // 引线
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-40, 0)
  ctx.lineTo(-36, 0)
  ctx.moveTo(40, 0)
  ctx.lineTo(36, 0)
  ctx.stroke()
  // 绝缘底座
  const bg = ctx.createLinearGradient(0, -11, 0, 11)
  bg.addColorStop(0, '#eef3f8')
  bg.addColorStop(1, '#c3cedb')
  ctx.fillStyle = bg
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.roundRect(-36, -11, 72, 22, 4)
  ctx.fill()
  ctx.stroke()
  // 刀片（左柱为轴；断开时上抬 38°）
  const ang = closed ? 0 : (-38 * Math.PI) / 180
  drawBlade(ctx, -14, -3, ang, 30)
  // 两个黄铜接线柱（压在刀片上方绘制，闭合时右柱露出）
  drawBrassPost(ctx, -14, -3)
  drawBrassPost(ctx, 14, -3)
  // 状态标注
  ctx.fillStyle = closed ? '#16a34a' : COLORS.dim
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(closed ? '闭合' : '断开', 0, comp.h / 2 - 5)
}

// ---------- 单刀开关（电路符号） ----------
function drawSwitchSymbol(ctx, comp) {
  const closed = comp.params.closed
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  // 左接线点引线
  ctx.beginPath()
  ctx.moveTo(-40, 0)
  ctx.lineTo(-14, 0)
  ctx.stroke()
  // 右接线点
  ctx.beginPath()
  ctx.moveTo(40, 0)
  ctx.lineTo(14, 0)
  ctx.stroke()
  // 刀片
  ctx.lineWidth = 2.6
  ctx.beginPath()
  if (closed) {
    ctx.moveTo(-14, 0)
    ctx.lineTo(14, 0)
  } else {
    ctx.moveTo(-14, 0)
    ctx.lineTo(12, -16)
  }
  ctx.stroke()
  // 触点
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(14, 0, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // 状态标注
  ctx.fillStyle = closed ? '#16a34a' : COLORS.dim
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(closed ? '闭合' : '断开', 0, comp.h / 2 - 10)
}

// ---------- 单刀双掷开关（实物：绝缘底座 + 三铜柱 + 铜刀片） ----------
function drawSwitch2(ctx, comp) {
  const pos = comp.params.position // 'up' | 'down'
  // 引线
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-52, 0)
  ctx.lineTo(-46, 0)
  ctx.moveTo(52, -24)
  ctx.lineTo(46, -24)
  ctx.moveTo(52, 24)
  ctx.lineTo(46, 24)
  ctx.stroke()
  // 绝缘底座
  const bg = ctx.createLinearGradient(0, -28, 0, 28)
  bg.addColorStop(0, '#eef3f8')
  bg.addColorStop(1, '#c3cedb')
  ctx.fillStyle = bg
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.roundRect(-46, -28, 92, 56, 5)
  ctx.fill()
  ctx.stroke()
  // 刀片（公共端为轴，掷向上/下触点）
  const ang = pos === 'up' ? Math.atan2(-24, 30) : Math.atan2(24, 30)
  drawBlade(ctx, -14, 0, ang, 40)
  // 三个黄铜接线柱（公共端 + 两掷；压在刀片上方）
  drawBrassPost(ctx, -14, 0)
  drawBrassPost(ctx, 16, -24)
  drawBrassPost(ctx, 16, 24)
  // 状态标注
  ctx.fillStyle = COLORS.dim
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(pos === 'up' ? '掷向 ↑' : '掷向 ↓', 0, comp.h / 2 - 3)
}

// ---------- 单刀双掷开关（电路符号） ----------
function drawSwitch2Symbol(ctx, comp) {
  const pos = comp.params.position // 'up' | 'down'
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  // 公共端引线
  ctx.beginPath()
  ctx.moveTo(-52, 0)
  ctx.lineTo(-14, 0)
  ctx.stroke()
  // 两掷触点引线
  ctx.beginPath()
  ctx.moveTo(52, -24)
  ctx.lineTo(16, -24)
  ctx.moveTo(52, 24)
  ctx.lineTo(16, 24)
  ctx.stroke()
  // 触点
  for (const ty of [-24, 24]) {
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = COLORS.line
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(16, ty, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  // 刀片
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.moveTo(-14, 0)
  if (pos === 'up') ctx.lineTo(12, -24)
  else ctx.lineTo(12, 24)
  ctx.stroke()
  // 状态标注
  ctx.fillStyle = COLORS.dim
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(pos === 'up' ? '掷向 ↑' : '掷向 ↓', 0, comp.h / 2 - 8)
}

// ---------- 滑动变阻器（电路符号：电阻框 + 滑块箭头） ----------
// 滑块箭头 x 与 hitSlider 命中计算一致（sxp = -40 + slider*80）
// 限流接法：滑片用导线引到电阻框一端（标准可变电阻画法，方向按实际接线端）
// 分压接法：滑片向下引出抽头端子（与布局的垂直引下导线相接）
function drawRheostatSymbol(ctx, comp) {
  const maxR = comp.params.maxR
  const sxp = -40 + comp.params.slider * 80
  const divider = comp.state && comp.state.divider
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  // 引线（伸到元件两侧，与布局端口 ±64 对齐）
  ctx.beginPath()
  ctx.moveTo(-64, 0)
  ctx.lineTo(-20, 0)
  ctx.moveTo(64, 0)
  ctx.lineTo(20, 0)
  ctx.stroke()
  // 限流接法：滑片 → 电阻框端部 的连接线（先画，压在箭头下）
  if (!divider) {
    const tieX = comp.state && comp.state.rheoUse === 'B' ? -20 : 20
    ctx.beginPath()
    ctx.moveTo(sxp, -16)
    ctx.lineTo(sxp, -24)
    ctx.lineTo(tieX, -24)
    ctx.lineTo(tieX, 0)
    ctx.stroke()
  }
  // 电阻框
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.rect(-20, -8, 40, 16)
  ctx.fill()
  ctx.stroke()
  // 滑块箭头（自上而下指向电阻框）
  ctx.strokeStyle = COLORS.orange
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(sxp, -16)
  ctx.lineTo(sxp, -9)
  ctx.stroke()
  ctx.fillStyle = COLORS.orange
  ctx.beginPath()
  ctx.moveTo(sxp - 4.5, -10)
  ctx.lineTo(sxp + 4.5, -10)
  ctx.lineTo(sxp, -3)
  ctx.closePath()
  ctx.fill()
  // 分压接法：滑片向下引出抽头（端子小圆由 symbolTerminals 提供）
  if (divider) {
    ctx.strokeStyle = COLORS.line
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(sxp, 8)
    ctx.lineTo(sxp, 24)
    ctx.stroke()
  }
  // 阻值标注（分压时避开滑片抽头的引下导线，放到相反一侧）
  ctx.fillStyle = COLORS.blue
  ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (divider) ctx.fillText(maxR + 'Ω', sxp >= 0 ? -44 : 44, 36)
  else ctx.fillText(maxR + 'Ω', 0, 20)
}

// ---------- 导线路径 ----------
// style: 'line' 直线 | 'curve' 圆滑贝塞尔 | 'ortho' 正交直角（转角圆角）
// bendRatio: 曲线弧度系数（-1~1，负=反向弯曲，0=直线）；undefined/null = 自动默认弧度
export function curveBendPx(len, bendRatio) {
  if (bendRatio === undefined || bendRatio === null) return Math.min(48, len * 0.22)
  return bendRatio * Math.min(70, len * 0.4)
}
export function wirePath(ctx, x1, y1, x2, y2, style, bendRatio) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  if (style === 'line' || len < 2) {
    ctx.lineTo(x2, y2)
  } else if (style === 'curve') {
    // 控制点：中点沿法线方向偏移，弯曲幅度随长度增长（上限 48）
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const nx = -dy / len
    const ny = dx / len
    const bend = curveBendPx(len, bendRatio)
    ctx.quadraticCurveTo(mx + nx * bend, my + ny * bend, x2, y2)
  } else {
    // ortho：水平优先走线，转角处圆角
    if (Math.abs(dx) < 2 || Math.abs(dy) < 2) {
      ctx.lineTo(x2, y2)
      return
    }
    const mx = x2
    const my = y1
    const r = Math.max(0, Math.min(10, Math.abs(dx) / 2, Math.abs(dy) / 2))
    const sx = dx > 0 ? 1 : -1
    const sy = dy > 0 ? 1 : -1
    if (r >= 4) {
      ctx.lineTo(mx - sx * r, my)
      ctx.quadraticCurveTo(mx, my, mx, my + sy * r)
      ctx.lineTo(x2, y2)
    } else {
      ctx.lineTo(mx, my)
      ctx.lineTo(x2, y2)
    }
  }
}

// 点到线段距离（导线命中检测用）
export function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const l2 = dx * dx + dy * dy
  if (l2 < 1e-6) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

// 点到导线距离（按线型分别计算）
export function distToWire(px, py, ax, ay, bx, by, style, bendRatio) {
  if (style === 'line') return distToSeg(px, py, ax, ay, bx, by)
  if (style === 'ortho') {
    const d1 = distToSeg(px, py, ax, ay, bx, ay)
    const d2 = distToSeg(px, py, bx, ay, bx, by)
    return Math.min(d1, d2)
  }
  // curve：二次贝塞尔采样 24 段
  const len = Math.hypot(bx - ax, by - ay) || 1
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2
  const nx = -(by - ay) / len
  const ny = (bx - ax) / len
  const bend = curveBendPx(len, bendRatio)
  const cx = mx + nx * bend
  const cy = my + ny * bend
  let min = Infinity
  let px0 = ax
  let py0 = ay
  const N = 24
  for (let i = 1; i <= N; i++) {
    const t = i / N
    const qx = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx
    const qy = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by
    const d = distToSeg(px, py, px0, py0, qx, qy)
    if (d < min) min = d
    px0 = qx
    py0 = qy
  }
  return min
}

// ---------- 器材栏预览 ----------
export function drawPreview(ctx, type, extra = {}, w = 44, h = 32) {
  const comp = createComponent(type, extra)
  const scale = Math.min(w / comp.w, h / comp.h)
  ctx.save()
  ctx.clearRect(0, 0, w, h)
  ctx.translate(w / 2, h / 2)
  ctx.scale(scale, scale)
  drawComponent(ctx, comp)
  ctx.restore()
}
