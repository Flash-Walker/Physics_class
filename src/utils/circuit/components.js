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
    draw: drawBattery
  },
  batteryBox: {
    name: '电池盒',
    w: 0, h: 56, // w 由 cells 决定，见 createComponent
    defaultParams: { cells: 1, loaded: true },
    terminals: [
      { label: '-', dx: -52, dy: 0, ldx: -12, ldy: 8 },
      { label: '+', dx: 52, dy: 0, ldx: 4, ldy: 8 }
    ],
    draw: drawBatteryBox
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
    draw: drawResistor
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
    draw: drawRheostat
  },
  switch: {
    name: '单刀开关',
    w: 88, h: 48,
    defaultParams: { closed: false },
    terminals: [
      { label: '', dx: -40, dy: 0, ldx: -8, ldy: 8 },
      { label: '', dx: 40, dy: 0, ldx: 2, ldy: 8 }
    ],
    draw: drawSwitch
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
    draw: drawSwitch2
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

// ===== 实物图片（可选，替代矢量符号绘制）=====
// 端子锚点：图中 (xL, yC) ↔ 元件端子 (-dx, 0)，(xR, yC) ↔ (+dx, 0)
// dx 为 null 时随元件宽度动态（batteryBox 端子距 = w/2 - 10，随节数变化）
export const PART_IMAGES = {
  battery: { url: new URL('../../assets/parts/battery.png', import.meta.url), dx: 44, xL: 4.8, xR: 595.8, yC: 78.5 },
  batteryBox: { url: new URL('../../assets/parts/batteryBox.png', import.meta.url), dx: null, xL: 39.3, xR: 570.9, yC: 82.1 },
  resistor: { url: new URL('../../assets/parts/resistor.png', import.meta.url), dx: 40, xL: 35.6, xR: 604.1, yC: 78.7 }
}
const _partImg = {}
export function partImageOf(type) {
  const p = PART_IMAGES[type]
  if (!p) return null
  if (_partImg[type]) return _partImg[type]
  if (!p._loading) {
    p._loading = true
    const im = new Image()
    im.onload = () => { _partImg[type] = im }
    im.src = p.url.href
  }
  return null
}

export function drawComponent(ctx, comp, opts = {}) {
  const def = COMPONENT_TYPES[comp.type]
  const img = opts.symbol ? null : partImageOf(comp.type)
  const part = PART_IMAGES[comp.type]
  ctx.save()
  ctx.translate(comp.x, comp.y)
  if (comp.rotation) ctx.rotate((comp.rotation * Math.PI) / 180)
  if (img && part) {
    // 图片模式：按端子锚点缩放（图内端子间距 → 元件端子间距 2dx）
    const dx = part.dx != null ? part.dx : comp.w / 2 - 10
    const scale = (2 * dx) / (part.xR - part.xL)
    ctx.drawImage(img, -dx - part.xL * scale, -part.yC * scale, img.naturalWidth * scale, img.naturalHeight * scale)
  } else {
    def.draw(ctx, comp)
  }
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

  // 接线柱
  const terms = getTerminals(comp)
  for (const t of terms) {
    const td = def.terminals.find((x) => x.label === t.label)
    drawTerminal(ctx, t.x, t.y, t.label, td ? td.ldx : -8, td ? td.ldy : 8)
  }
}

// ---------- 电池 ----------
function drawBattery(ctx, comp) {
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

// ---------- 电池盒 ----------
function drawBatteryBox(ctx, comp) {
  const cells = comp.params.cells
  const loaded = comp.params.loaded
  const w = comp.w
  const half = w / 2
  // 盒体
  ctx.save()
  const grad = ctx.createLinearGradient(0, -comp.h / 2, 0, comp.h / 2)
  grad.addColorStop(0, loaded ? '#fef3c7' : '#f1f5f9')
  grad.addColorStop(1, loaded ? '#fde68a' : '#e2e8f0')
  ctx.fillStyle = grad
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.roundRect(-half + 6, -comp.h / 2 + 4, w - 12, comp.h - 8, 5)
  ctx.fill()
  ctx.stroke()
  // 电池槽与电池
  const cellW = 44
  const gap = 8
  const total = cells * cellW + (cells - 1) * gap
  let cx = -total / 2 + cellW / 2
  for (let i = 0; i < cells; i++) {
    if (loaded) {
      // 电池：矩形 + 正极帽
      ctx.fillStyle = '#334155'
      ctx.beginPath()
      ctx.roundRect(cx - cellW / 2, -10, cellW, 20, 3)
      ctx.fill()
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.roundRect(cx + cellW / 2 - 8, -8, 8, 16, 2)
      ctx.fill()
      // 正负极标记
      ctx.fillStyle = '#f8fafc'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('+', cx + cellW / 2 - 4, 0)
      ctx.fillText('-', cx - cellW / 2 + 4, 0)
    } else {
      // 空槽
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1.4
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.roundRect(cx - cellW / 2, -10, cellW, 20, 3)
      ctx.stroke()
      ctx.setLineDash([])
    }
    cx += cellW + gap
  }
  // 电压标注
  ctx.fillStyle = loaded ? COLORS.red : COLORS.dim
  ctx.font = 'bold 12px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(loaded ? cells * 1.5 + 'V' : '未装电池', 0, comp.h / 2 - 10)
  ctx.restore()
}

// ---------- 小灯泡（五态） ----------
function drawBulb(ctx, comp) {
  const st = comp.state.bulbState || 'off'
  const s = BULB_STATES[st] || BULB_STATES.off
  const r = 16
  // 引线
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-36, 0)
  ctx.lineTo(-r, 0)
  ctx.moveTo(36, 0)
  ctx.lineTo(r, 0)
  ctx.stroke()
  // 光晕（亮态）
  if (s.glow > 0) {
    const g = ctx.createRadialGradient(0, -2, 2, 0, -2, s.glowR)
    g.addColorStop(0, 'rgba(255, 200, 60, ' + s.glow + ')')
    g.addColorStop(1, 'rgba(255, 200, 60, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, -2, s.glowR, 0, Math.PI * 2)
    ctx.fill()
  }
  // 玻璃泡
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // 灯丝（V 形）
  ctx.strokeStyle = s.filament
  ctx.lineWidth = 2.2
  ctx.beginPath()
  if (st === 'burnt') {
    // 断裂灯丝
    ctx.moveTo(-8, 10)
    ctx.lineTo(-2, 0)
    ctx.moveTo(-2, 0)
    ctx.lineTo(2, -6)
    ctx.moveTo(8, 10)
    ctx.lineTo(3, 2)
    // 裂纹
    ctx.strokeStyle = '#7c2d12'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-10, -8)
    ctx.lineTo(-5, -3)
    ctx.lineTo(-7, 2)
    ctx.moveTo(8, -10)
    ctx.lineTo(4, -4)
    ctx.stroke()
    // 底部焦黑
    ctx.fillStyle = 'rgba(51,65,85,0.5)'
    ctx.beginPath()
    ctx.arc(0, 0, r - 2, 0.4, Math.PI - 0.4)
    ctx.fill()
  } else {
    ctx.moveTo(-8, 10)
    ctx.lineTo(0, -6)
    ctx.lineTo(8, 10)
    ctx.stroke()
  }
  // 高光
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(-5, -5, 8, Math.PI * 0.9, Math.PI * 1.4)
  ctx.stroke()
  // 额定值标注
  ctx.fillStyle = COLORS.dim
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(comp.params.ratedV + 'V ' + comp.params.ratedI + 'A', 0, comp.h / 2 - 12)
}

// ---------- 电阻 ----------
function drawResistor(ctx, comp) {
  // 引线
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-40, 0)
  ctx.lineTo(-20, 0)
  ctx.moveTo(40, 0)
  ctx.lineTo(20, 0)
  ctx.stroke()
  // 矩形电阻体（人教版符号）
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

// ---------- 电表（电压表/电流表） ----------
function drawMeter(ctx, comp, letter, label) {
  const range = comp.params.range
  const r = 20
  // 引线
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-40, 0)
  ctx.lineTo(-r - 4, 0)
  ctx.moveTo(40, 0)
  ctx.lineTo(r + 4, 0)
  ctx.stroke()
  // 表壳
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(0, -4, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // 刻度弧（左下 0 → 右下满量程）
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(0, -4, r - 5, Math.PI * 0.75, Math.PI * 2.25)
  ctx.stroke()
  // 刻度线
  for (let i = 0; i <= 5; i++) {
    const ang = Math.PI * 0.75 + (i / 5) * Math.PI * 1.5
    const x0 = Math.cos(ang) * (r - 7)
    const y0 = -4 + Math.sin(ang) * (r - 7)
    const x1 = Math.cos(ang) * (r - 3)
    const y1 = -4 + Math.sin(ang) * (r - 3)
    ctx.strokeStyle = i % 5 === 0 ? '#475569' : '#cbd5e1'
    ctx.lineWidth = i % 5 === 0 ? 1.6 : 1
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }
  // 指针（M1 指向 0；M4 按读数转动）
  const reading = comp.state.reading || 0
  const rangeMax = comp.state.rangeMax || range
  const over = comp.state.over
  const frac = Math.min(1, Math.max(0, reading / rangeMax))
  const ang = Math.PI * 0.75 + frac * Math.PI * 1.5
  ctx.strokeStyle = COLORS.red
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(0, -4)
  ctx.lineTo(Math.cos(ang) * (r - 6), -4 + Math.sin(ang) * (r - 6))
  ctx.stroke()
  // 超量程：红圈 + 警示
  if (over) {
    ctx.strokeStyle = COLORS.red
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.arc(0, -4, r + 3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = COLORS.red
    ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('超量程', 0, -4 - r - 8)
  }
  // 字母
  ctx.fillStyle = COLORS.line
  ctx.font = 'bold 15px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(letter, 0, -4)
  // 量程标注
  ctx.fillStyle = COLORS.blue
  ctx.font = '11px "Microsoft YaHei", sans-serif'
  ctx.fillText(range + (letter === 'V' ? 'V' : 'A'), 0, 20)
  ctx.fillStyle = COLORS.dim
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.fillText(label, 0, 33)
  // 内阻标注（M5：真实电表内阻）
  const ir = comp.params.internalR
  if (ir !== undefined) {
    ctx.fillStyle = COLORS.orange
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.fillText((letter === 'V' ? 'Rv ' : 'RA ') + (ir >= 1000 ? (ir / 1000) + 'kΩ' : ir + 'Ω'), 0, 45)
  }
}

// ---------- 欧姆表（M5：多用电表欧姆档，本质是电流表+电池+调零电阻） ----------
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
  ctx.lineTo(-r - 4, 0)
  ctx.moveTo(44, 0)
  ctx.lineTo(r + 4, 0)
  ctx.stroke()
  // 表壳
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(0, -10, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // 反比刻度弧（左 ∞ → 右 0）
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(0, -10, r - 5, Math.PI * 0.75, Math.PI * 2.25)
  ctx.stroke()
  // 刻度：Rx → frac = Rmid/(Rmid+Rx)（反比）
  const ticks = [0, Rmid / 3, Rmid, Rmid * 3, Infinity]
  const tickLabel = (v) => (v === Infinity ? '∞' : v >= 1000 ? (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k' : String(Math.round(v)))
  ticks.forEach((v) => {
    const frac = v === Infinity ? 0 : Rmid / (Rmid + v)
    const ang = Math.PI * 0.75 + frac * Math.PI * 1.5
    const x0 = Math.cos(ang) * (r - 8)
    const y0 = -10 + Math.sin(ang) * (r - 8)
    const x1 = Math.cos(ang) * (r - 3)
    const y1 = -10 + Math.sin(ang) * (r - 3)
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    ctx.fillStyle = '#475569'
    ctx.font = '9px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(tickLabel(v), Math.cos(ang) * (r - 13), -10 + Math.sin(ang) * (r - 13))
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
  // 打表：红圈
  if (over) {
    ctx.strokeStyle = COLORS.red
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.arc(0, -10, r + 3, 0, Math.PI * 2)
    ctx.stroke()
  }
  // 字母 Ω
  ctx.fillStyle = COLORS.line
  ctx.font = 'bold 15px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Ω', 0, -10)
  // 中值标注
  ctx.fillStyle = COLORS.blue
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.fillText('中值 ' + (Rmid >= 1000 ? (Rmid / 1000) + 'k' : Rmid) + 'Ω', 0, 12)
  // 读数 / 状态
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (comp.state.tip) {
    ctx.fillStyle = COLORS.red
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.fillText(comp.state.tip, 0, 26)
  } else if (comp.state.zero) {
    ctx.fillStyle = '#16a34a'
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.fillText('✓ 已调零', 0, 26)
  } else if (comp.state.inf) {
    ctx.fillStyle = COLORS.dim
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.fillText('Rx = ∞', 0, 26)
  } else if (comp.state.reading !== undefined && comp.state.reading !== null && !Number.isNaN(comp.state.reading)) {
    ctx.fillStyle = COLORS.line
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.fillText('Rx = ' + (comp.state.reading >= 1000 ? (comp.state.reading / 1000).toFixed(1) + 'k' : Math.round(comp.state.reading)) + 'Ω', 0, 26)
  } else {
    ctx.fillStyle = COLORS.dim
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.fillText('未接入', 0, 26)
  }
  // 调零旋钮（底部，拖动改变 Rmid 1000~2000）
  const knobY = 40
  ctx.strokeStyle = COLORS.term
  ctx.lineWidth = 1.6
  ctx.fillStyle = '#f1f5f9'
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

// ---------- 滑动变阻器 ----------
function drawRheostat(ctx, comp) {
  const maxR = comp.params.maxR
  const slider = comp.params.slider
  const sxp = -40 + slider * 80 // 滑块 x
  // 下方电阻丝
  ctx.fillStyle = '#e2e8f0'
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.rect(-40, -12, 80, 14)
  ctx.fill()
  ctx.stroke()
  // 绕线纹理
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1
  for (let x = -38; x <= 38; x += 6) {
    ctx.beginPath()
    ctx.moveTo(x, -11)
    ctx.lineTo(x, 1)
    ctx.stroke()
  }
  // 上方金属杆
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-46, -30)
  ctx.lineTo(46, -30)
  ctx.stroke()
  // C D 引线
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(-46, -30)
  ctx.lineTo(-46, -12)
  ctx.moveTo(46, -30)
  ctx.lineTo(46, -12)
  ctx.stroke()
  // A B 引线
  ctx.beginPath()
  ctx.moveTo(-46, 2)
  ctx.lineTo(-46, 38)
  ctx.moveTo(46, 2)
  ctx.lineTo(46, 38)
  ctx.stroke()
  // 滑杆（滑块下方竖线）
  ctx.strokeStyle = COLORS.orange
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(sxp, -30)
  ctx.lineTo(sxp, -13)
  ctx.stroke()
  // 滑块箭头
  ctx.fillStyle = COLORS.orange
  ctx.beginPath()
  ctx.moveTo(sxp - 7, -13)
  ctx.lineTo(sxp + 7, -13)
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

// ---------- 单刀开关 ----------
function drawSwitch(ctx, comp) {
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

// ---------- 单刀双掷开关 ----------
function drawSwitch2(ctx, comp) {
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
