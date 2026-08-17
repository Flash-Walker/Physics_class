// ==========================================
// 力学公式工具集（初中全覆盖 + 高中进阶铺垫）
// 标注说明：【初中必学】课标要求掌握  【高中铺垫】进阶拓展内容
// 所有函数均为纯函数，无副作用
// ==========================================

// ==========================================
// 模块1：数值与矢量运算基础
// 【初中】数值处理  【高中铺垫】二维矢量运算
// ==========================================

/**
 * 限制数值范围
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * 数值保留指定小数位
 */
export function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * 角度转弧度
 */
export function degToRad(deg) {
  return deg * Math.PI / 180
}

/**
 * 弧度转角度
 */
export function radToDeg(rad) {
  return rad * 180 / Math.PI
}

// ---------- 二维矢量运算（高中铺垫） ----------

/**
 * 二维矢量的大小（模长）
 */
export function vectorMag(x, y) {
  return Math.sqrt(x * x + y * y)
}

/**
 * 二维矢量的方向角（与x轴正方向夹角，角度制）
 */
export function vectorAngle(x, y) {
  return radToDeg(Math.atan2(y, x))
}

/**
 * 矢量分解：将大小+角度 分解为 x、y 分量
 * 【初中】力的分解初步  【高中】正交分解
 */
export function resolveVector(magnitude, angleDeg) {
  const rad = degToRad(angleDeg)
  return {
    x: magnitude * Math.cos(rad),
    y: magnitude * Math.sin(rad)
  }
}

/**
 * 矢量合成：两个矢量求和
 * 【初中】同一直线二力合成  【高中】平行四边形定则
 */
export function addVectors(v1x, v1y, v2x, v2y) {
  return { x: v1x + v2x, y: v1y + v2y }
}

/**
 * 矢量点积（功的计算基础）
 * 【高中铺垫】
 */
export function dotProduct(v1x, v1y, v2x, v2y) {
  return v1x * v2x + v1y * v2y
}

// ==========================================
// 模块2：运动学公式
// 【初中】匀速直线运动  【高中铺垫】匀变速直线运动全套
// ==========================================

/**
 * 平均速度
 * 【初中】v = s / t
 */
export function avgVelocity(displacement, time) {
  if (time <= 0) return 0
  return displacement / time
}

/**
 * 匀变速：瞬时速度 v = v₀ + at
 * 【高中铺垫】
 */
export function velocityAt(v0, a, t) {
  return v0 + a * t
}

/**
 * 匀变速：位移 s = v₀t + ½at²
 * 【高中铺垫】
 */
export function displacementAt(v0, a, t) {
  return v0 * t + 0.5 * a * t * t
}

/**
 * 匀变速：速度位移公式 v² - v₀² = 2as
 * 【高中铺垫】
 */
export function velocityFromDisplacement(v0, a, s) {
  const vSq = v0 * v0 + 2 * a * s
  return Math.sqrt(Math.max(0, vSq))
}

/**
 * 中间时刻瞬时速度 = 全程平均速度
 * 【高中铺垫】
 */
export function midTimeVelocity(v0, v) {
  return (v0 + v) / 2
}

/**
 * 自由落体速度与位移
 * 【高中铺垫】
 */
export function freeFallVelocity(t, g = 9.8) {
  return g * t
}
export function freeFallDisplacement(t, g = 9.8) {
  return 0.5 * g * t * t
}

/**
 * 竖直上抛：最高点高度与时间
 * 【高中铺垫】
 */
export function verticalUpMaxHeight(v0, g = 9.8) {
  return (v0 * v0) / (2 * g)
}
export function verticalUpTimeToTop(v0, g = 9.8) {
  return v0 / g
}

/**
 * 环形跑道位置归一化
 */
export function normalizeRingPos(pos, circumference) {
  let p = pos % circumference
  if (p < 0) p += circumference
  return p
}

/**
 * 环形跑道两点最短弧长
 */
export function ringShortestDistance(pos1, pos2, circumference) {
  const diff = Math.abs(normalizeRingPos(pos1, circumference) - normalizeRingPos(pos2, circumference))
  return Math.min(diff, circumference - diff)
}

// ==========================================
// 模块3：常见力的计算
// 【初中】重力、弹力、摩擦力、浮力  【高中铺垫】受力分析基础
// ==========================================

/**
 * 重力 G = mg
 * 【初中】
 */
export function gravity(mass, g = 9.8) {
  return mass * g
}

/**
 * 胡克定律（弹簧弹力）F = kΔx
 * 【初中】
 */
export function springForce(k, deltaX) {
  return k * deltaX
}

/**
 * 滑动摩擦力 f = μN
 * 【初中】
 */
export function slidingFriction(mu, normalForce) {
  return mu * normalForce
}

/**
 * 最大静摩擦力（近似等于滑动摩擦力）
 * 【初中】
 */
export function maxStaticFriction(mu, normalForce) {
  return mu * normalForce
}

// ---------- 压强与压力 ----------

/**
 * 固体压强 p = F / S
 * 【初中】
 */
export function solidPressure(force, area) {
  if (area <= 0) return 0
  return force / area
}

/**
 * 液体压强 p = ρgh
 * 【初中】
 */
export function liquidPressure(density, depth, g = 9.8) {
  return density * g * depth
}

/**
 * 压力差法求浮力 F浮 = F向上 - F向下
 * 【初中】
 */
export function buoyancyByPressure(pressureBottom, pressureTop, area) {
  return (pressureBottom - pressureTop) * area
}

// ---------- 浮力全套 ----------

/**
 * 阿基米德原理 F浮 = ρ液gV排
 * 【初中核心】
 */
export function buoyancyArchimedes(liquidDensity, displacedVolume, g = 9.8) {
  return liquidDensity * g * displacedVolume
}

/**
 * 称重法测浮力 F浮 = G - F示
 * 【初中】
 */
export function buoyancyByWeighing(gravity, showForce) {
  return gravity - showForce
}

/**
 * 柱体排液体积计算
 * 【初中】
 */
export function displacedVolume(area, immersedDepth, objectHeight) {
  const depth = Math.min(Math.max(0, immersedDepth), objectHeight)
  return area * depth
}

/**
 * 浮沉状态判断
 * 【初中核心】
 * @returns {'float'漂浮 | 'suspend'悬浮 | 'sink'下沉}
 */
export function floatState(gravity, maxBuoyancy) {
  if (gravity < maxBuoyancy) return 'float'
  if (Math.abs(gravity - maxBuoyancy) < 1e-6) return 'suspend'
  return 'sink'
}

/**
 * 漂浮时浸入深度
 * 漂浮条件：F浮 = G
 * 【初中】
 */
export function immersedDepthAtFloat(mass, baseArea, liquidDensity, g = 9.8) {
  return mass / (liquidDensity * baseArea)
}

/**
 * 漂浮时排液体积
 * 【初中】
 */
export function displacedVolumeAtFloat(mass, liquidDensity) {
  return mass / liquidDensity
}

/**
 * 沉底时容器底部支持力 N = G - F浮
 * 【初中】
 */
export function bottomSupportForce(gravity, buoyancy) {
  return Math.max(0, gravity - buoyancy)
}

// ==========================================
// 模块4：牛顿运动定律
// 【初中】二力平衡  【高中铺垫】牛顿第二定律定量
// ==========================================

/**
 * 一维多力求代数和
 * 【初中】同一直线二力合成
 */
export function sumForces1D(forces) {
  return forces.reduce((sum, f) => sum + f, 0)
}

/**
 * 牛顿第二定律 a = F合 / m
 * 【高中铺垫】
 */
export function accelerationFromForce(netForce, mass) {
  if (mass <= 0) return 0
  return netForce / mass
}

/**
 * 由质量加速度求合力 F合 = ma
 * 【高中铺垫】
 */
export function netForceFromAccel(mass, acceleration) {
  return mass * acceleration
}

/**
 * 超重/失重视重
 * 【高中铺垫】
 */
export function apparentWeight(mass, verticalAccel, g = 9.8) {
  return mass * (g + verticalAccel)
}

// ==========================================
// 模块5：动量与冲量（高中铺垫）
// 初中不做要求，全部为高中进阶预埋
// ==========================================

/**
 * 动量 p = mv
 */
export function momentum(mass, velocity) {
  return mass * velocity
}

/**
 * 冲量 I = Ft
 */
export function impulse(force, time) {
  return force * time
}

/**
 * 动量定理：末动量 = 初动量 + 合外力冲量
 */
export function momentumTheorem(mass, v0, netForce, t) {
  return mass * v0 + netForce * t
}

/**
 * 由动量定理求末速度
 */
export function velocityFromImpulse(mass, v0, netForce, t) {
  return v0 + (netForce * t) / mass
}

/**
 * 系统总动量（一维）
 */
export function totalMomentum1D(bodies) {
  return bodies.reduce((sum, b) => sum + b.mass * b.velocity, 0)
}

// ==========================================
// 模块6：功与机械能
// 【初中】功、功率、动能势能、机械效率
// 【高中铺垫】动能定理、机械能守恒
// ==========================================

/**
 * 功 W = Fs cosθ
 * 【初中】θ=0简化版  【高中】通用版
 */
export function work(force, displacement, angleDeg = 0) {
  return force * displacement * Math.cos(degToRad(angleDeg))
}

/**
 * 功率 P = W / t
 * 【初中】
 */
export function powerByWork(work, time) {
  if (time <= 0) return 0
  return work / time
}

/**
 * 功率 P = Fv
 * 【初中拓展/高中】
 */
export function powerByVelocity(force, velocity) {
  return force * velocity
}

/**
 * 动能 Ek = ½mv²
 * 【初中】定性了解  【高中】定量计算
 */
export function kineticEnergy(mass, velocity) {
  return 0.5 * mass * velocity * velocity
}

/**
 * 重力势能 Ep = mgh
 * 【初中】定性了解  【高中】定量计算
 */
export function gravitationalPE(mass, height, g = 9.8) {
  return mass * g * height
}

/**
 * 弹性势能 Ep弹 = ½kΔx²
 * 【高中铺垫】
 */
export function elasticPE(k, deltaX) {
  return 0.5 * k * deltaX * deltaX
}

/**
 * 动能定理：合外力做功 = 动能变化量
 * 【高中铺垫】
 */
export function workEnergyTheorem(mass, v0, v) {
  return kineticEnergy(mass, v) - kineticEnergy(mass, v0)
}

/**
 * 机械能 = 动能 + 重力势能 + 弹性势能
 * 【高中铺垫】验证机械能守恒
 */
export function mechanicalEnergy(mass, velocity, height, k = 0, deltaX = 0, g = 9.8) {
  return kineticEnergy(mass, velocity) + gravitationalPE(mass, height, g) + elasticPE(k, deltaX)
}

/**
 * 机械效率 η = W有用 / W总
 * 【初中核心】
 */
export function efficiency(usefulWork, totalWork) {
  if (totalWork <= 0) return 0
  return usefulWork / totalWork
}

// ==========================================
// 模块7：碰撞与相互作用（高中铺垫）
// ==========================================

/**
 * 一维碰撞位置检测
 */
export function checkCollision1D(posA, posB, radiusA = 0, radiusB = 0) {
  return Math.abs(posA - posB) <= radiusA + radiusB
}

/**
 * 完全弹性碰撞（一维）
 * 动量守恒 + 动能守恒
 */
export function elasticCollision1D(m1, m2, v1, v2) {
  const total = m1 + m2
  return {
    v1After: ((m1 - m2) * v1 + 2 * m2 * v2) / total,
    v2After: ((m2 - m1) * v2 + 2 * m1 * v1) / total
  }
}

/**
 * 完全非弹性碰撞（一维）
 * 碰撞后共速，动量守恒
 */
export function inelasticCollision1D(m1, m2, v1, v2) {
  return (m1 * v1 + m2 * v2) / (m1 + m2)
}

/**
 * 恢复系数 e = |分离速度| / |接近速度|
 * 【高中拓展】
 */
export function restitutionCoefficient(v1Before, v2Before, v1After, v2After) {
  const approach = v1Before - v2Before
  const separation = v2After - v1After
  if (Math.abs(approach) < 1e-6) return 1
  return Math.abs(separation / approach)
}

// ==========================================
// 模块8：简单机械
// 【初中核心】杠杆、滑轮、斜面
// ==========================================

/**
 * 杠杆平衡条件 F₁L₁ = F₂L₂
 * 传入任意三个量，返回第四个量
 * 【初中核心】
 */
export function leverBalance({ f1 = null, l1 = null, f2 = null, l2 = null }) {
  if (f1 === null) return (f2 * l2) / l1
  if (l1 === null) return (f2 * l2) / f1
  if (f2 === null) return (f1 * l1) / l2
  if (l2 === null) return (f1 * l1) / f2
  return 0
}

/**
 * 滑轮组：理想状态拉力 F = G / n
 * 【初中】
 */
export function pulleyIdealTension(gravity, ropeCount) {
  return gravity / ropeCount
}

/**
 * 滑轮组：计动滑轮重 F = (G物 + G动) / n
 * 【初中】
 */
export function pulleyTensionWithPulley(gravity, pulleyGravity, ropeCount) {
  return (gravity + pulleyGravity) / ropeCount
}

/**
 * 滑轮组：绳子自由端移动距离 s = nh
 * 【初中】
 */
export function pulleyRopeDistance(height, ropeCount) {
  return height * ropeCount
}

/**
 * 斜面：理想状态拉力 F = Gh / L
 * 【初中】
 */
export function inclineIdealForce(gravity, height, length) {
  return (gravity * height) / length
}

/**
 * 斜面机械效率
 * 【初中】
 */
export function inclineEfficiency(gravity, height, force, length) {
  const useful = gravity * height
  const total = force * length
  return efficiency(useful, total)
}
