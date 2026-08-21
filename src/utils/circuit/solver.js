// ============================================================
// 电路求解器 - MNA（修改节点分析）
// 支持：理想电压源（电池/电池盒）、线性电阻（灯泡/电阻/变阻器）、
//       0V 电压源（电流表）、开路电压表、开关（断开=无边）
// 元件电气参数：
//   电池     E = params.voltage (V)
//   电池盒   E = params.cells * 1.5 (V)，未装电池不供电
//   灯泡     R = ratedV / ratedI（恒定电阻，额定可自定义）
//   电阻     R = params.resistance
//   变阻器   R = params.maxR * params.slider（滑片位置决定接入阻值）
//   电流表   0V 电压源（理想内阻 0），求解电流即读数
//   电压表   开路，读数 = 两端节点电压差
// ============================================================

// 高斯消元（全选主元）解 Ax = b，奇异返回 null
function gaussSolve(A, b) {
  const n = b.length
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r
    }
    if (Math.abs(A[piv][col]) < 1e-12) return null
    if (piv !== col) {
      const t = A[col]; A[col] = A[piv]; A[piv] = t
      const tb = b[col]; b[col] = b[piv]; b[piv] = tb
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = A[r][col] / A[col][col]
      if (Math.abs(f) < 1e-15) continue
      for (let c2 = col; c2 < n; c2++) A[r][c2] -= f * A[col][c2]
      b[r] -= f * b[col]
    }
  }
  const x = new Array(n)
  for (let i = 0; i < n; i++) x[i] = b[i] / A[i][i]
  return x
}

function unionFind(comps, wires, getTerminals, { closeSwitch = true } = {}) {
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
  for (const c of comps) for (const t of getTerminals(c)) parent[t.id] = t.id
  for (const w of wires) union(w.a.termId, w.b.termId)
  if (closeSwitch) {
    for (const c of comps) {
      if (c.type === 'switch' && c.params.closed) {
        const ts = getTerminals(c)
        union(ts[0].id, ts[1].id)
      } else if (c.type === 'switch2') {
        const all = getTerminals(c)
        const com = all.find((t) => !t.label)
        const arm = all.find((t) => (c.params.position === 'up' ? t.dy < 0 : t.dy > 0))
        if (com && arm) union(com.id, arm.id)
      }
    }
  }
  return { find, union }
}

export function solveCircuit(comps, wires, getTerminals) {
  // ---- 1. 端子合并（导线 + 闭合开关 + 变阻器滑杆 C/D） ----
  const { find, union } = unionFind(comps, wires, getTerminals)
  for (const c of comps) {
    if (c.type === 'rheostat') {
      const terms = getTerminals(c)
      const tC = terms.find((t) => t.label === 'C')
      const tD = terms.find((t) => t.label === 'D')
      if (tC && tD) union(tC.id, tD.id)
    }
  }

  // ---- 2. 元件边分类 ----
  const voltSrc = []    // 电池（电压源）
  const ampMeters = []  // 电流表（0V 电压源）
  const resEdges = []   // 电阻类
  const voltMeters = [] // 电压表（开路）
  for (const c of comps) {
    const ts = getTerminals(c).map((t) => find(t.id))
    const a = ts[0]
    const b = ts[ts.length - 1]
    switch (c.type) {
      case 'battery':
        voltSrc.push({ comp: c, a, b, E: c.params.voltage })
        break
      case 'batteryBox':
        if (c.params.loaded !== false) {
          voltSrc.push({ comp: c, a, b, E: (c.params.cells || 1) * 1.5 })
        }
        break
      case 'bulb': {
        const rv = c.params.ratedV || 2.5
        const ri = c.params.ratedI || 0.3
        resEdges.push({ comp: c, a, b, R: rv / ri, ratedV: rv })
        break
      }
      case 'resistor':
        resEdges.push({ comp: c, a, b, R: Math.max(c.params.resistance, 1e-3) })
        break
      case 'rheostat': {
        // 滑杆 C/D 已合并；接入阻值按实际接线端判断
        const terms = getTerminals(c)
        const used = new Set()
        for (const w of wires) {
          if (w.a.compId === c.id) used.add(w.a.termId.slice(w.a.termId.indexOf(':') + 1))
          if (w.b.compId === c.id) used.add(w.b.termId.slice(w.b.termId.indexOf(':') + 1))
        }
        const maxR = c.params.maxR
        const sl = c.params.slider || 0
        const hasRod = used.has('C') || used.has('D')
        const hasA = used.has('A')
        const hasB = used.has('B')
        let R
        let na = null
        let nb = null
        if (hasA && hasB && !hasRod) {
          // 接电阻丝两端：全阻值
          R = maxR
          na = find(terms.find((t) => t.label === 'A').id)
          nb = find(terms.find((t) => t.label === 'B').id)
        } else if (hasA && hasRod) {
          // A-滑杆：滑片位置决定
          R = maxR * sl
          na = find(terms.find((t) => t.label === 'A').id)
          nb = find(terms.find((t) => t.label === 'C').id)
        } else if (hasB && hasRod) {
          R = maxR * (1 - sl)
          na = find(terms.find((t) => t.label === 'B').id)
          nb = find(terms.find((t) => t.label === 'C').id)
        } else if (hasRod) {
          // 只接滑杆：近似短路
          R = 1e-3
          na = nb = find(terms.find((t) => t.label === 'C').id)
        } else {
          // 未接线：默认 A-滑杆
          R = maxR * sl
          na = find(terms.find((t) => t.label === 'A').id)
          nb = find(terms.find((t) => t.label === 'C').id)
        }
        resEdges.push({ comp: c, a: na, b: nb, R: Math.max(R, 1e-3) })
        break
      }
      case 'ammeter':
        ampMeters.push({ comp: c, a, b })
        break
      case 'voltmeter':
        voltMeters.push({ comp: c, a, b })
        break
      case 'switch':
      case 'switch2':
        break // 断开=无边；闭合已合并
    }
  }

  // ---- 3. 短路检测：电池两端被导线直连 ----
  for (const vs of voltSrc) {
    if (vs.a === vs.b) return { ok: false, err: '⚠️ 电源短路！导线直接连在电源两端' }
  }
  if (!voltSrc.length) return { ok: false, err: '电路中没有电源' }

  // ---- 4. 断路预检测：电池两端经导电元件是否连通 ----
  {
    const uf = unionFind(comps, wires, getTerminals)
    for (const e of resEdges) uf.union(e.a, e.b)
    for (const e of ampMeters) uf.union(e.a, e.b)
    const vs0 = voltSrc[0]
    if (uf.find(vs0.a) !== uf.find(vs0.b)) {
      return { ok: false, err: '电路断路：开关未闭合或接线不完整' }
    }
  }

  // ---- 5. MNA 组装 ----
  const ref = voltSrc[0].b // 参考节点 = 第一个电源负极
  // 节点集只收导电元件引用的节点（悬空端子不参与，避免奇异）
  const nodeSet = new Set()
  const touch = (nd) => { if (nd !== ref) nodeSet.add(nd) }
  for (const e of resEdges) {
    if (e.a !== e.b) { touch(e.a); touch(e.b) }
  }
  for (const s of voltSrc) { touch(s.a); touch(s.b) }
  for (const s of ampMeters) { touch(s.a); touch(s.b) }
  const idx = new Map()
  let n = 0
  for (const nd of nodeSet) idx.set(nd, n++)
  const srcs = [...voltSrc, ...ampMeters]
  const m = n + srcs.length
  const A = Array.from({ length: m }, () => new Array(m).fill(0))
  const z = new Array(m).fill(0)
  // 电导矩阵
  for (const e of resEdges) {
    if (e.a === e.b) continue // 被导线短接，不参与
    const g = 1 / e.R
    const ia = idx.get(e.a)
    const ib = idx.get(e.b)
    if (ia !== undefined) { A[ia][ia] += g; if (ib !== undefined) A[ia][ib] -= g }
    if (ib !== undefined) { A[ib][ib] += g; if (ia !== undefined) A[ib][ia] -= g }
  }
  // 电压源行（电池 E / 电流表 0V）+ 耦合列
  srcs.forEach((s, k) => {
    const row = n + k
    const ia = idx.get(s.a)
    const ib = idx.get(s.b)
    if (ia !== undefined) { A[row][ia] += 1; A[ia][row] += 1 }
    if (ib !== undefined) { A[row][ib] -= 1; A[ib][row] -= 1 }
    z[row] = s.E || 0
  })

  const x = gaussSolve(A, z)
  if (!x) return { ok: false, err: '电路异常：可能存在短路或接法错误' }

  const V = (nd) => (nd === ref ? 0 : x[idx.get(nd)] || 0)

  // ---- 6. 提取结果 ----
  const results = new Map()     // 电阻类 + 电源：{U, I, P}
  const bulbStates = new Map()  // 灯泡五态
  const meters = new Map()      // 电表读数 {reading, unit}
  for (const e of resEdges) {
    const U = Math.abs(V(e.a) - V(e.b))
    const I = U / e.R
    results.set(e.comp.id, { U, I, P: U * I })
    if (e.comp.type === 'bulb') {
      const ratio = U / e.ratedV
      let state = 'off'
      if (ratio >= 1.6) state = 'burnt'
      else if (ratio >= 1.15) state = 'bright'
      else if (ratio >= 0.9) state = 'on'
      else if (ratio >= 0.5) state = 'dim'
      bulbStates.set(e.comp.id, state)
    }
  }
  srcs.forEach((s, k) => {
    const Isrc = x[n + k]
    if (s.comp.type === 'ammeter') {
      meters.set(s.comp.id, { reading: Math.abs(Isrc), unit: 'A' })
    } else {
      results.set(s.comp.id, { U: s.E, I: Math.abs(Isrc), P: s.E * Math.abs(Isrc) })
    }
  })
  for (const vm of voltMeters) {
    meters.set(vm.comp.id, { reading: Math.abs(V(vm.a) - V(vm.b)), unit: 'V' })
  }
  return {
    ok: true,
    results,
    bulbStates,
    meters,
    totalI: Math.abs(x[n]) // 干路电流（第一个电源）
  }
}
