// ==========================================
// 物理公式工具集（力学 + 光学全覆盖）
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

/**
 * 角度归一化到 (-180, 180] 区间
 * 【光学】光线方向角运算基础
 */
export function normalizeAngle(deg) {
  let a = deg % 360
  if (a > 180) a -= 360
  if (a <= -180) a += 360
  return a
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

// ==========================================
// 模块9：几何光学
// 【初中】光的直线传播/反射/折射/透镜成像  【高中铺垫】斯涅尔定律定量、全反射
// 约定：角度均指光线方向角（x轴正方向为0°，逆时针为正）；
//       入射角/折射角/反射角指与界面法线的夹角（锐角）
// ==========================================

// ---------- 光的直线传播与小孔成像 ----------

/**
 * 小孔成像：像高 = 物高 × 像距 / 物距（相似三角形）
 * 【初中核心】光沿直线传播
 * @param {number} objectHeight 物体高度
 * @param {number} objectDistance 物距（物体到小孔）
 * @param {number} imageDistance 像距（光屏到小孔）
 */
export function pinholeImageHeight(objectHeight, objectDistance, imageDistance) {
  if (objectDistance <= 0) return 0
  return (objectHeight * imageDistance) / objectDistance
}

// ---------- 光的反射与平面镜 ----------

/**
 * 反射定律：反射角 = 入射角
 * 【初中核心】
 */
export function reflectionAngle(incidentAngleDeg) {
  return incidentAngleDeg
}

/**
 * 平面镜成像：像点 = 物点关于镜面的对称点
 * 镜面由一点 (mirrorPointX, mirrorPointY) 与方向角 mirrorAngleDeg 确定
 * 【初中核心】像与物等大、到镜面距离相等、连线与镜面垂直
 * @returns {{x:number, y:number}} 像点坐标
 */
export function mirrorImagePoint(px, py, mirrorPointX, mirrorPointY, mirrorAngleDeg) {
  const rad = degToRad(mirrorAngleDeg)
  const ux = Math.cos(rad)
  const uy = Math.sin(rad)
  // 物点到镜面参考点的向量沿镜面方向的投影（垂足位置）
  const proj = (px - mirrorPointX) * ux + (py - mirrorPointY) * uy
  const footX = mirrorPointX + proj * ux
  const footY = mirrorPointY + proj * uy
  // 像点 = 2 × 垂足 − 物点
  return { x: 2 * footX - px, y: 2 * footY - py }
}

/**
 * 向量反射：入射向量 v 关于法线 n（单位向量）的反射
 * r = v − 2(v·n)n
 * 【初中】反射定律矢量形式  【高中铺垫】
 */
export function reflectVector(vx, vy, nx, ny) {
  const dot = vx * nx + vy * ny
  return { x: vx - 2 * dot * nx, y: vy - 2 * dot * ny }
}

// ---------- 光的折射（斯涅尔定律） ----------

/**
 * 斯涅尔定律：n₁·sinθ₁ = n₂·sinθ₂
 * 求折射角（θ 为与法线的夹角）
 * @param {number} n1 入射侧折射率
 * @param {number} n2 折射侧折射率
 * @param {number} incidentAngleDeg 入射角（度）
 * @returns {number|null} 折射角（度）；发生全反射时返回 null
 * 【初中】折射规律（空气→水/玻璃折射角<入射角）  【高中铺垫】定量计算
 */
export function refractionAngle(n1, n2, incidentAngleDeg) {
  const sinT2 = (n1 / n2) * Math.sin(degToRad(incidentAngleDeg))
  if (sinT2 > 1) return null // 全反射
  return radToDeg(Math.asin(sinT2))
}

/**
 * 全反射临界角：sinC = n₂ / n₁（光从光密介质 n₁ 射向光疏介质 n₂，且 n₁ > n₂）
 * @returns {number|null} 临界角（度）；不会发生全反射时返回 null
 * 【高中铺垫】
 */
export function criticalAngleDeg(n1, n2) {
  if (n1 <= n2) return null
  return radToDeg(Math.asin(n2 / n1))
}

/**
 * 光在介质中的传播速度 v = c / n
 * 【初中拓展】
 */
export function lightSpeedInMedium(refractiveIndex, c = 3e8) {
  return c / refractiveIndex
}

/**
 * 由入射角与折射角求相对折射率 n = sinθ₁ / sinθ₂（θ 为与法线的夹角）
 * 【高中铺垫】
 */
export function refractiveIndexFromAngles(incidentAngleDeg, refractedAngleDeg) {
  const s = Math.sin(degToRad(incidentAngleDeg)) / Math.sin(degToRad(refractedAngleDeg))
  return s
}

// ---------- 凸透镜成像 ----------

/**
 * 凸透镜成像公式：1/f = 1/u + 1/v  →  v = uf / (u − f)
 * @param {number} f 焦距（>0）
 * @param {number} u 物距（>0）
 * @returns {number} 像距；u = f 时返回 Infinity（不成像）；
 *                   u < f 时返回负值（虚像，与物同侧）
 * 【初中核心】
 */
export function lensImageDistance(f, u) {
  if (u <= 0) return 0
  const diff = u - f
  if (Math.abs(diff) < 1e-9) return Infinity
  return (u * f) / diff
}

/**
 * 凸透镜放大率 m = |v / u|
 * 【初中核心】
 */
export function lensMagnification(f, u) {
  const v = lensImageDistance(f, u)
  if (v === Infinity) return Infinity
  return Math.abs(v / u)
}

/**
 * 凸透镜成像高度（含方向）：h' = −(v/u) × h
 * 负值表示倒立
 * 【初中核心】
 */
export function lensImageHeight(objectHeight, f, u) {
  const v = lensImageDistance(f, u)
  if (v === Infinity) return 0
  return (-v / u) * objectHeight
}

/**
 * 凸透镜成像规律分类（初中五区）
 * @param {number} f 焦距
 * @param {number} u 物距
 * @returns {{type:'real'|'virtual'|'none', orientation:'upright'|'inverted'|'none', size:'reduced'|'same'|'magnified'|'none', application:string}}
 * 【初中核心】照相机 / 投影仪 / 放大镜 的应用判断
 */
export function classifyLensImage(f, u) {
  if (u > 2 * f) return { type: 'real', orientation: 'inverted', size: 'reduced', application: '照相机' }
  if (Math.abs(u - 2 * f) < 1e-9) return { type: 'real', orientation: 'inverted', size: 'same', application: '测焦距（u = v = 2f）' }
  if (u > f) return { type: 'real', orientation: 'inverted', size: 'magnified', application: '投影仪/幻灯机' }
  if (Math.abs(u - f) < 1e-9) return { type: 'none', orientation: 'none', size: 'none', application: '不成像（出射平行光）' }
  return { type: 'virtual', orientation: 'upright', size: 'magnified', application: '放大镜' }
}

/**
 * 由物距与像距求焦距（测焦距实验）：1/f = 1/u + 1/v
 * 【初中核心】
 */
export function lensFocalFromUV(u, v) {
  if (u <= 0 || v <= 0) return 0
  return (u * v) / (u + v)
}

// ---------- 光线几何（2D 射线求交，光学引擎与画布共用） ----------

/**
 * 线段求交
 * @param {{x,y}} p1 线段1端点
 * @param {{x,y}} p2 线段1端点
 * @param {{x,y}} p3 线段2端点
 * @param {{x,y}} p4 线段2端点
 * @returns {{x:number, y:number}|null} 交点或 null（平行/不相交）
 */
export function segmentIntersection(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x
  const d1y = p2.y - p1.y
  const d2x = p4.x - p3.x
  const d2y = p4.y - p3.y
  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-9) return null
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom
  const s = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom
  if (t < 0 || t > 1 || s < 0 || s > 1) return null
  return { x: p1.x + t * d1x, y: p1.y + t * d1y }
}

/**
 * 射线（起点 + 方向角）与线段求交
 * @param {number} ox 射线起点 x
 * @param {number} oy 射线起点 y
 * @param {number} angleDeg 射线方向角（度）
 * @param {{x,y}} p1 线段端点
 * @param {{x,y}} p2 线段端点
 * @returns {{x:number, y:number, distance:number}|null} 交点（含射线参数距离）或 null
 */
export function raySegmentIntersection(ox, oy, angleDeg, p1, p2) {
  const rad = degToRad(angleDeg)
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)
  const sx = p2.x - p1.x
  const sy = p2.y - p1.y
  const denom = dx * sy - dy * sx
  if (Math.abs(denom) < 1e-9) return null // 平行
  const t = ((p1.x - ox) * sy - (p1.y - oy) * sx) / denom
  const s = ((p1.x - ox) * dy - (p1.y - oy) * dx) / denom
  if (t < 0 || s < 0 || s > 1) return null
  return { x: ox + t * dx, y: oy + t * dy, distance: t }
}

/**
 * 两点间距离
 */
export function pointDistance(ax, ay, bx, by) {
  return Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay))
}

// ==========================================
// 模块10：热学与分子动理论
// 【初中】物态变化、分子热运动  【高中铺垫】理想气体微观模型
// ==========================================

/**
 * 热运动强度：温度映射到 0~1（决定分子运动剧烈程度）
 * 【初中】温度越高分子热运动越剧烈
 * @param {number} T 当前温度 ℃
 * @param {number} tMin 温度下限 ℃（映射为 0）
 * @param {number} tMax 温度上限 ℃（映射为 1）
 */
export function thermalIntensity(T, tMin, tMax) {
  return clamp((T - tMin) / (tMax - tMin), 0, 1)
}

/**
 * 无规则热运动一步：速度大小向目标速率收敛 + 方向随机旋转（布朗运动模型）
 * 【初中】分子在永不停息地做无规则运动；温度越高运动越快
 * 设计要点：
 *  - 速度大小 ≈ targetSpeed（由温度决定），快速收敛，保证"温度高→运动快"直观可见
 *  - 方向每帧随机旋转（慢换向），轨迹为平滑弯曲的随机游走，扩散自然
 *  - 注意：不能再用"强阻尼+随机加速度"——阻尼会把稳态速度压到目标值的 1/5 以下
 * @param {{x,y,vx,vy}} p 粒子对象（含 x/y/vx/vy，会被修改）
 * @param {number} dt 帧时间差 s
 * @param {number} targetSpeed 目标速率 px/s（由温度决定）
 * @param {number} [turnRate=3] 方向随机旋转速率 rad/s（越大运动越"抖动"）
 */
export function applyThermalMotion(p, dt, targetSpeed, turnRate = 3) {
  // 速度大小向目标速率收敛（避免强阻尼导致速度远低于目标）
  const sp = Math.hypot(p.vx, p.vy)
  if (sp > 0.001) {
    const k = Math.min(1, dt * 10)
    const scale = 1 + (targetSpeed / sp - 1) * k
    p.vx *= scale
    p.vy *= scale
  } else {
    const theta = Math.random() * Math.PI * 2
    p.vx = Math.cos(theta) * targetSpeed
    p.vy = Math.sin(theta) * targetSpeed
  }
  // 方向随机旋转（布朗运动换向）
  const rot = (Math.random() - 0.5) * turnRate * dt
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  const vx = p.vx * cos - p.vy * sin
  p.vy = p.vx * sin + p.vy * cos
  p.vx = vx
  // 位移
  p.x += p.vx * dt
  p.y += p.vy * dt
}

/**
 * 矩形边界反弹（弹性碰撞，可设恢复系数）
 * @returns {boolean} 是否发生碰撞
 */
export function bounceInBox(p, x0, y0, x1, y1, restitution = 0.8) {
  let hit = false
  if (p.x < x0 + p.size) { p.x = x0 + p.size; p.vx = Math.abs(p.vx) * restitution; hit = true }
  if (p.x > x1 - p.size) { p.x = x1 - p.size; p.vx = -Math.abs(p.vx) * restitution; hit = true }
  if (p.y < y0 + p.size) { p.y = y0 + p.size; p.vy = Math.abs(p.vy) * restitution; hit = true }
  if (p.y > y1 - p.size) { p.y = y1 - p.size; p.vy = -Math.abs(p.vy) * restitution; hit = true }
  return hit
}

/**
 * 晶格振动：粒子在锚点附近做正弦振动（固态分子模型）
 * 【初中】固态分子只能在平衡位置附近振动
 * @param {{ax,ay,x,y,vx,vy,ph}} p 粒子对象（含锚点 ax/ay 与相位 ph）
 * @param {number} clock 模拟时钟 s（振动相位随时间变化）
 * @param {number} amplitude 振动幅度 px（温度越高越大）
 */
export function latticeVibrate(p, clock, amplitude) {
  p.x = p.ax + Math.sin(clock * 2.1 + p.ph) * amplitude
  p.y = p.ay + Math.cos(clock * 1.9 + p.ph * 1.6) * amplitude * 0.85
  p.vx = 0
  p.vy = 0
}

/**
 * 统计指定状态的粒子数
 * @param {Array} particles 粒子数组（含 st 状态字段）
 * @param {string} state 状态：solid / liquid / gas / snow
 */
export function countByState(particles, state) {
  let n = 0
  for (const p of particles) if (p.st === state) n++
  return n
}

// ==========================================
// 模块11：扩散统计
// 【初中】分子热运动与扩散：混合度 / 扩散度 / 平均速率
// 所有函数均为纯函数，无副作用
// ==========================================

/**
 * 混合度 / 扩散度：把区域划成网格，统计两类粒子浓度分布方差并归一化
 * 【初中】扩散是自发过程：粒子从浓度高的地方向浓度低的地方运动，最终均匀分布
 * 原理：完全分离时格子间浓度差异最大（方差最大），完全均匀时方差为 0。
 *       mixingDegree = 1 - 方差 / 最大可能方差 → 0（未混合）~ 1（完全均匀）
 * @param {Array} particles 粒子数组（含 x/y 坐标）
 * @param {function|string} isKindA 判断"种类 A"：函数 (p)=>bool，或粒子字段名
 * @param {{x0:number,y0:number,x1:number,y1:number}} bounds 统计区域
 * @param {number} [gridCols=8] 网格列数（行数按区域比例自适应）
 * @returns {number} 0~1 的混合度（1 = 完全均匀）
 */
export function mixingDegree(particles, isKindA, bounds, gridCols = 8) {
  const { x0, y0, x1, y1 } = bounds
  if (x1 - x0 < 4 || y1 - y0 < 4) return 0
  const pred = typeof isKindA === 'function' ? isKindA : (p) => p[isKindA]
  const cols = Math.max(2, gridCols)
  let rows = Math.max(2, Math.round(cols * ((y1 - y0) / (x1 - x0))))
  // 行数强制为偶数：避免网格行恰好跨过"上下分界"（如双瓶隔板）导致初始值不干净
  if (rows % 2 === 1) rows += 1

  let totalA = 0
  let total = 0
  for (const p of particles) {
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue
    total++
    if (pred(p)) totalA++
  }
  if (total < 4 || totalA === 0 || totalA === total) return 0
  const pa = totalA / total // 全局比例

  // 各格子内 A 的占比
  const cellCount = cols * rows
  let varSum = 0
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const cx0 = x0 + ((x1 - x0) * c) / cols
      const cx1 = x0 + ((x1 - x0) * (c + 1)) / cols
      const cy0 = y0 + ((y1 - y0) * r) / rows
      const cy1 = y0 + ((y1 - y0) * (r + 1)) / rows
      let na = 0
      let nt = 0
      for (const p of particles) {
        if (p.x >= cx0 && p.x < cx1 && p.y >= cy0 && p.y < cy1) {
          nt++
          if (pred(p)) na++
        }
      }
      if (nt > 0) {
        const d = na / nt - pa // 该格子占比与全局占比的偏差
        varSum += d * d
      } else {
        // 空格子：该格 A 占比为 0（粒子尚未到达 = 未混合，同样携带信息）
        varSum += pa * pa
      }
    }
  }
  const variance = varSum / cellCount
  // 最大可能方差：每格要么全 A 要么全 B（伯努利方差上界）
  const varMax = pa * (1 - pa)
  if (varMax <= 1e-6) return 0
  return clamp(1 - variance / varMax, 0, 1)
}

/**
 * 粒子平均速率（px/s）
 * 【初中】温度越高分子运动越剧烈 → 平均速率越大
 * @param {Array} particles 粒子数组（含 vx/vy）
 * @param {function} [filter] 可选筛选函数 (p)=>bool
 * @returns {number} 平均速率 px/s
 */
export function avgSpeed(particles, filter = null) {
  let sum = 0
  let n = 0
  for (const p of particles) {
    if (filter && !filter(p)) continue
    sum += Math.hypot(p.vx, p.vy)
    n++
  }
  return n ? sum / n : 0
}

/* ===== 模块 12：四冲程热机循环 ===== */
// 曲轴转角 theta 约定：0~720° 为一个完整工作循环（4 冲程 × 180°）
// 冲程顺序：intake(吸气 0-180) → compress(压缩 180-360) → power(做功 360-540) → exhaust(排气 540-720)
const STROKE_NAMES = ['intake', 'compress', 'power', 'exhaust']

/**
 * 由曲轴转角判定当前冲程
 * @param {number} theta 曲轴转角（度），会自动归一化到 [0, 720)
 * @returns {'intake'|'compress'|'power'|'exhaust'}
 */
export function pistonPhase(theta) {
  const t = ((theta % 720) + 720) % 720
  return STROKE_NAMES[Math.floor(t / 180)]
}

/**
 * 由曲轴转角计算活塞位置
 * @param {number} theta 曲轴转角（度）
 * @returns {number} 0=上止点（缸盖侧），1=下止点
 */
export function pistonPos(theta) {
  const t = ((theta % 720) + 720) % 720
  const phase = Math.floor(t / 180)
  const k = (t - phase * 180) / 180 // 冲程内进度 0→1
  // 吸气/做功：下行；压缩/排气：上行
  return phase === 0 || phase === 2 ? k : 1 - k
}

/**
 * 活塞冲程内进度（用于粒子/温度曲线插值）
 * @param {number} theta 曲轴转角（度）
 * @returns {number} 当前冲程内进度 0→1
 */
export function strokeProgress(theta) {
  const t = ((theta % 720) + 720) % 720
  return (t % 180) / 180
}

/**
 * 气门状态表：由冲程判定进/排气门开合
 * @param {'intake'|'compress'|'power'|'exhaust'} phase
 * @returns {{intakeOpen: boolean, exhaustOpen: boolean}}
 */
export function valveState(phase) {
  return {
    intakeOpen: phase === 'intake',
    exhaustOpen: phase === 'exhaust'
  }
}

/* ===== 模块 13：比热容与热传递 ===== */
// 教材：人教版九年级上册 §13.3 比热容
// 模型约定：加热器功率 P(W) × 时间 t(s) × 效率 η → 液体实际吸收热量 Q = ηPt
// 升温：ΔT = Q / (c·m)；自然冷却用牛顿冷却定律：dT/dt = -k(T-T_env)/(c·m)

/**
 * 吸收热量：Q = η·P·t
 * @param {number} powerW 加热器功率（瓦）
 * @param {number} timeS 加热时间（秒）
 * @param {number} eta 能量传输效率 0~1
 * @returns {number} 实际进入液体的热量（焦耳）
 */
export function heatAbsorbed(powerW, timeS, eta = 1) {
  return eta * powerW * timeS
}

/**
 * 升温幅度：ΔT = Q / (c·m)
 * @param {number} heatJ 吸收的热量（焦耳）
 * @param {number} massKg 液体质量（千克）
 * @param {number} specificHeat 比热容（J/(kg·℃)）
 * @returns {number} 温度升高（℃）
 */
export function tempRise(heatJ, massKg, specificHeat) {
  if (massKg <= 0 || specificHeat <= 0) return 0
  return heatJ / (massKg * specificHeat)
}

/**
 * 加热后的温度：T = T₀ + ηPt/(c·m)
 * @param {number} t0 初始温度（℃）
 * @param {number} powerW 加热器功率（瓦）
 * @param {number} timeS 加热时间（秒）
 * @param {number} massKg 液体质量（千克）
 * @param {number} specificHeat 比热容（J/(kg·℃)）
 * @param {number} eta 能量传输效率 0~1
 * @returns {number} 加热后的温度（℃）
 */
export function tempAfterHeating(t0, powerW, timeS, massKg, specificHeat, eta = 1) {
  return t0 + tempRise(heatAbsorbed(powerW, timeS, eta), massKg, specificHeat)
}

/**
 * 由实验数据反算比热容：c = Q / (m·ΔT)
 * @param {number} heatJ 吸收的热量（焦耳）
 * @param {number} massKg 液体质量（千克）
 * @param {number} deltaT 温度升高（℃）
 * @returns {number} 比热容（J/(kg·℃)）
 */
export function specificHeatFromData(heatJ, massKg, deltaT) {
  if (massKg <= 0 || deltaT <= 0) return 0
  return heatJ / (massKg * deltaT)
}

/**
 * 牛顿冷却一步：T -= k·(T-T_env)/(c·m)·dt
 * @param {number} temp 当前温度（℃）
 * @param {number} envTemp 环境温度（℃）
 * @param {number} lossCoeff 散热系数 k（W/℃，即每摄氏度温差每秒散失的热量）
 * @param {number} massKg 液体质量（千克）
 * @param {number} specificHeat 比热容（J/(kg·℃)）
 * @param {number} dt 时间步长（秒）
 * @returns {number} 冷却后的温度（℃）
 */
export function coolStep(temp, envTemp, lossCoeff, massKg, specificHeat, dt) {
  if (massKg <= 0 || specificHeat <= 0) return temp
  const dT = -(lossCoeff * (temp - envTemp) / (massKg * specificHeat)) * dt
  return temp + dT
}

/**
 * 昼夜温差（生活应用场景）：一个加热-冷却周期后的温度波动幅度
 * @param {number} t0 起始温度（℃）
 * @param {number} peakTemp 白天加热达到的最高温（℃）
 * @param {number} nightTemp 夜晚冷却后的最低温（℃）
 * @returns {number} 昼夜温差 = 最高温 - 最低温（℃）
 */
export function dayNightRange(peakTemp, nightTemp) {
  return Math.max(0, peakTemp - nightTemp)
}
