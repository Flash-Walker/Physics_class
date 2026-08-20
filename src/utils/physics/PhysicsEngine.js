// ==========================================
// 物理引擎（力学基类 + 光学引擎）
// 力学：质点-力-积分模型，1D 运动学全覆盖
// 光学：光线模型 + 光学界面（平面镜/折射面/薄透镜），几何光学模拟
// 计算与渲染完全分离，纯逻辑层
// ==========================================

import {
  sumForces1D,
  accelerationFromForce,
  velocityAt,
  round,
  momentum,
  kineticEnergy,
  gravitationalPE,
  checkCollision1D,
  displacedVolume,
  buoyancyArchimedes,
  raySegmentIntersection,
  refractionAngle,
  pointDistance,
  normalizeAngle,
  degToRad
} from './physicsUtils.js'

export class PhysicsEngine {
  constructor(defaultParams = {}) {
    // ---------- 运行状态 ----------
    this.state = 'idle' // idle / running / paused

    // ---------- 时间系统 ----------
    this.totalTime = 0       // 累计运行时间 s
    this.deltaTime = 0       // 当前帧时间差 s
    this._lastTs = 0         // 上一帧时间戳 ms
    this._animId = null      // raf id

    // ---------- 全局环境参数 ----------
    this.params = {
      g: 9.8,                 // 重力加速度
      // 液体环境
      liquid: {
        enabled: false,
        density: 1000,        // 液体密度 kg/m³
        surfaceY: 1.0,        // 液面y坐标（向上为正）
        bottomY: 0            // 容器底部y坐标
      },
      // 重力场开关
      gravityEnabled: true,
      ...defaultParams
    }

    // ---------- 物体系统 ----------
    this.bodies = []
    this._initialBodies = [] // 初始状态快照，用于重置

    // ---------- 历史数据 ----------
    this.history = []
    this.maxHistory = 3000

    // ---------- 回调钩子 ----------
    this.onUpdate = null     // 每帧更新回调
    this.onEvent = null      // 通用事件回调
    this.onCollision = null  // 碰撞专用回调
  }

  // ==========================================
  // 物体管理
  // ==========================================

  /**
   * 添加物理物体
   * @param {Object} config
   * @param {string} config.id
   * @param {number} config.mass 质量 kg
   * @param {number} config.position 初始位置 m（一维坐标）
   * @param {number} config.velocity 初速度 m/s
   * @param {number} config.radius 碰撞半径 m
   * @param {Object} config.geometry 几何属性（浮力计算用）
   */
  addBody(config) {
    const body = {
      id: config.id,
      mass: config.mass ?? 1,
      position: config.position ?? 0,
      velocity: config.velocity ?? 0,
      acceleration: 0,
      radius: config.radius ?? 0.1,
      // 受力列表：{value, type}
      forces: [],
      // 几何属性
      geometry: {
        type: config.geometry?.type || 'cylinder',
        area: config.geometry?.area ?? 0.01,
        height: config.geometry?.height ?? 0.1
      },
      // 浮力实时状态
      buoyancy: {
        immersedDepth: 0,
        displacedVolume: 0,
        force: 0,
        state: 'air' // air / partial / full / bottom
      }
    }

    this.bodies.push(body)
    this._initialBodies.push(JSON.parse(JSON.stringify(body)))
    return body
  }

  getBody(id) {
    return this.bodies.find(b => b.id === id)
  }

  clearBodies() {
    this.bodies = []
    this._initialBodies = []
  }

  // ==========================================
  // 受力管理
  // ==========================================

  /**
   * 施加恒力
   */
  addForce(bodyId, value, type = 'external') {
    const body = this.getBody(bodyId)
    if (!body) return
    body.forces.push({ value, type })
  }

  /**
   * 移除指定类型的力
   */
  removeForcesByType(bodyId, type) {
    const body = this.getBody(bodyId)
    if (!body) return
    body.forces = body.forces.filter(f => f.type !== type)
  }

  clearForces(bodyId) {
    const body = this.getBody(bodyId)
    if (!body) return
    body.forces = []
  }

  /**
   * 计算物体合力（一维）
   */
  getNetForce(body) {
    return sumForces1D(body.forces.map(f => f.value))
  }

  // ==========================================
  // 浮力系统
  // ==========================================

  _updateBuoyancy(body) {
    const { liquid } = this.params
    if (!liquid.enabled) return

    const { area, height: objH } = body.geometry
    const bottomY = body.position
    const topY = bottomY + objH

    // 计算浸入深度与状态
    let depth = 0
    if (topY <= liquid.surfaceY) {
      depth = objH
      body.buoyancy.state = 'full'
    } else if (bottomY < liquid.surfaceY) {
      depth = liquid.surfaceY - bottomY
      body.buoyancy.state = 'partial'
    } else {
      depth = 0
      body.buoyancy.state = 'air'
    }

    // 沉底处理
    if (bottomY <= liquid.bottomY) {
      body.position = liquid.bottomY
      body.buoyancy.state = 'bottom'
      // 触底反弹 + 能量损耗
      if (body.velocity < 0) {
        body.velocity = -body.velocity * 0.2
      }
    }

    // 计算排液体积与浮力
    const vol = displacedVolume(area, depth, objH)
    const fBuoy = buoyancyArchimedes(liquid.density, vol, this.params.g)

    body.buoyancy.immersedDepth = round(depth, 4)
    body.buoyancy.displacedVolume = round(vol, 6)
    body.buoyancy.force = round(fBuoy, 4)

    // 更新受力
    this.removeForcesByType(body.id, 'buoyancy')
    if (fBuoy > 0) {
      this.addForce(body.id, fBuoy, 'buoyancy')
    }
  }

  // ==========================================
  // 状态控制
  // ==========================================

  start() {
    if (this.state === 'running') return
    if (this.state === 'idle') this.reset()

    this.state = 'running'
    this._lastTs = performance.now()
    this._loop()
  }

  pause() {
    if (this.state !== 'running') return
    this.state = 'paused'
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    // 通知 UI 状态变化（暂停后徽标/数据立即刷新）
    this._triggerUpdate()
  }

  reset() {
    this.pause()
    this.state = 'idle'
    this.totalTime = 0
    this.deltaTime = 0
    this.history = []
    this._resetBodies()
    this._triggerUpdate()
  }

  /**
   * 单步调试
   */
  step(dt = 0.1) {
    this.deltaTime = dt
    this.totalTime += dt
    this._stepPhysics(dt)
    this._checkCollisions()
    this._recordHistory()
    this._triggerUpdate()
  }

  /**
   * 更新引擎参数（运行中实时生效，子类可扩展）
   */
  updateParams(newParams) {
    Object.assign(this.params, newParams)
  }

  // ==========================================
  // 主循环
  // ==========================================

  _loop() {
    if (this.state !== 'running') return

    const now = performance.now()
    const dt = Math.min((now - this._lastTs) / 1000, 0.05) // 最大步长50ms防跳帧
    this._lastTs = now

    if (dt > 0) {
      this.deltaTime = dt
      this.totalTime += dt
      this._stepPhysics(dt)
      this._checkCollisions()
      this._recordHistory()
      this._triggerUpdate()
    }

    this._animId = requestAnimationFrame(() => this._loop())
  }

  /**
   * 单步物理计算核心流程
   * 浮力更新 → 施加重力 → 求合力 → 牛二求加速度 → 更新速度 → 更新位置
   */
  _stepPhysics(dt) {
    for (const body of this.bodies) {
      // 1. 动态更新浮力
      this._updateBuoyancy(body)

      // 2. 更新重力（如果启用）
      if (this.params.gravityEnabled) {
        this.removeForcesByType(body.id, 'gravity')
        this.addForce(body.id, -body.mass * this.params.g, 'gravity')
      }

      // 3. 计算合力
      const netF = this.getNetForce(body)

      // 4. 牛顿第二定律
      body.acceleration = accelerationFromForce(netF, body.mass)

      // 5. 更新速度
      body.velocity = velocityAt(body.velocity, body.acceleration, dt)

      // 6. 更新位置（匀变速位移公式）
      body.position += body.velocity * dt + 0.5 * body.acceleration * dt * dt
    }

    // 子类扩展钩子
    this._onStepEnd?.(dt)
  }

  // ==========================================
  // 碰撞检测
  // ==========================================

  _checkCollisions() {
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const a = this.bodies[i]
        const b = this.bodies[j]
        if (checkCollision1D(a.position, b.position, a.radius, b.radius)) {
          this._triggerCollision(a, b)
        }
      }
    }
  }

  _triggerCollision(a, b) {
    this._handleCollision?.(a, b)
    if (typeof this.onCollision === 'function') {
      this.onCollision(a, b)
    }
    this._triggerEvent('collision', { bodyA: a, bodyB: b })
  }

  // ==========================================
  // 动量与能量实时计算
  // ==========================================

  getTotalMomentum() {
    return this.bodies.reduce((sum, b) => sum + momentum(b.mass, b.velocity), 0)
  }

  getTotalKineticEnergy() {
    return this.bodies.reduce((sum, b) => sum + kineticEnergy(b.mass, b.velocity), 0)
  }

  /**
   * 系统总重力势能（以y=0为参考面）
   */
  getTotalGravitationalPE() {
    return this.bodies.reduce((sum, b) => sum + gravitationalPE(b.mass, b.position, this.params.g), 0)
  }

  getTotalMechanicalEnergy() {
    return this.getTotalKineticEnergy() + this.getTotalGravitationalPE()
  }

  // ==========================================
  // 历史数据记录
  // ==========================================

  _recordHistory() {
    const item = {
      time: round(this.totalTime, 3),
      bodies: this.bodies.map(b => ({
        id: b.id,
        position: round(b.position, 3),
        velocity: round(b.velocity, 3),
        acceleration: round(b.acceleration, 4),
        distanceTraveled: round(b.distanceTraveled || 0, 3),
        netForce: round(this.getNetForce(b), 3),
        momentum: round(momentum(b.mass, b.velocity), 3),
        kineticEnergy: round(kineticEnergy(b.mass, b.velocity), 4),
        gravitationalPE: round(gravitationalPE(b.mass, b.position, this.params.g), 4),
        buoyancy: { ...b.buoyancy }
      })),
      totalMomentum: round(this.getTotalMomentum(), 3),
      totalKineticEnergy: round(this.getTotalKineticEnergy(), 4),
      totalMechanicalEnergy: round(this.getTotalMechanicalEnergy(), 4)
    }

    this.history.push(item)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }
  }

  // ==========================================
  // 子类可重写钩子
  // ==========================================

  _resetBodies() {
    this.bodies = this._initialBodies.map(b => JSON.parse(JSON.stringify(b)))
  }

  _onStepEnd(dt) {}

  _handleCollision(a, b) {}

  // ==========================================
  // 事件与状态输出
  // ==========================================

  _triggerEvent(name, data = {}) {
    if (typeof this.onEvent === 'function') {
      this.onEvent(name, data)
    }
  }

  _triggerUpdate() {
    if (typeof this.onUpdate === 'function') {
      this.onUpdate(this.getState())
    }
  }

  getState() {
    return {
      state: this.state,
      totalTime: round(this.totalTime, 3),
      bodies: this.bodies.map(b => ({ ...b })),
      totalMomentum: round(this.getTotalMomentum(), 3),
      totalKineticEnergy: round(this.getTotalKineticEnergy(), 4),
      totalMechanicalEnergy: round(this.getTotalMechanicalEnergy(), 4),
      history: [...this.history]
    }
  }

  destroy() {
    this.pause()
    this.onUpdate = null
    this.onEvent = null
    this.onCollision = null
    this.bodies = []
    this._initialBodies = []
    this.history = []
  }
}

// ==========================================
// 光学引擎（几何光学）
// 光线模型：光线 → 光学界面（平面镜/折射界面/薄透镜）→ 出射光线
// 复用基类状态机（idle/running/paused）与时间系统，驱动光线传播动画
// 计算与渲染分离：引擎维护光线几何与传播进度，绘制由实验组件完成
// ==========================================

export class OpticsEngine extends PhysicsEngine {
  constructor(defaultParams = {}) {
    super({
      gravityEnabled: false, // 光学场景无需力学计算
      ...defaultParams
    })
    this.rays = []        // 光线列表
    this.obstacles = []   // 光学界面列表
  }

  // ==========================================
  // 光学界面管理
  // ==========================================

  /**
   * 添加光学界面
   * @param {Object} config
   * @param {string} config.id 界面 id
   * @param {string} config.type 界面类型
   *   'mirror'   - 平面镜（反射）
   *   'boundary' - 两种介质分界面（折射 + 反射）
   *   'lens'     - 薄透镜（竖直线，配 center 与 f）
   * @param {{x:number, y:number}} [config.p1] 界面端点1（mirror/boundary）
   * @param {{x:number, y:number}} [config.p2] 界面端点2（mirror/boundary）
   * @param {number} [config.n2] boundary 界面另一侧折射率（默认 1.5）
   * @param {{x:number, y:number}} [config.center] lens 透镜中心
   * @param {number} [config.f] lens 焦距（默认 5）
   * @param {string} [config.label] 界面标签（如"平面镜""水面"）
   */
  addObstacle(config) {
    const obstacle = {
      id: config.id,
      type: config.type,
      p1: config.p1 ? { ...config.p1 } : null,
      p2: config.p2 ? { ...config.p2 } : null,
      n2: config.n2 ?? 1.5,
      center: config.center ? { ...config.center } : null,
      f: config.f ?? 5,
      label: config.label ?? ''
    }
    this.obstacles.push(obstacle)
    return obstacle
  }

  clearObstacles() {
    this.obstacles = []
  }

  // ==========================================
  // 光线管理
  // ==========================================

  /**
   * 添加光线
   * @param {Object} config
   * @param {string} config.id 光线 id（唯一）
   * @param {{x:number, y:number}} config.origin 光线起点
   * @param {number} config.angleDeg 传播方向角（度，x轴正方向为0°，逆时针为正）
   * @param {string} [config.color] 光线颜色（默认金黄）
   * @param {number} [config.width] 线宽（默认 2）
   * @param {number} [config.speed] 传播动画速度 0~1/秒（默认 0.6）
   * @param {number} [config.delay] 延迟启动秒数（默认 0）
   * @param {boolean} [config.dashed] 虚线（延长线/虚像辅助线，默认 false）
   * @param {number} [config.maxLength] 光线最大追踪长度（默认 1000）
   * @param {boolean} [config.autoTrace] 是否自动追踪界面交点（默认 true）
   */
  addRay(config) {
    const ray = {
      id: config.id,
      origin: { x: config.origin?.x ?? 0, y: config.origin?.y ?? 0 },
      angleDeg: config.angleDeg ?? 0,
      color: config.color ?? '#ffd54f',
      width: config.width ?? 2,
      speed: config.speed ?? 0.6,
      delay: config.delay ?? 0,
      dashed: config.dashed ?? false,
      maxLength: config.maxLength ?? 1000,
      autoTrace: config.autoTrace ?? true,
      progress: 0,       // 0~1 传播动画进度
      elapsed: 0,        // 已运行时间（含延迟）
      segments: [],      // 追踪结果线段 [{from, to}]
      totalLength: 0,    // 路径总长
      hit: null,         // 最近交点信息 {obstacle, point, distance}
      completed: false
    }
    this.rays.push(ray)
    return ray
  }

  getRay(id) {
    return this.rays.find(r => r.id === id)
  }

  clearRays() {
    this.rays = []
  }

  /**
   * 追踪单条光线：找最近界面交点并生成路径
   * 平面镜/折射界面：线段求交；薄透镜：与竖直透镜平面求交
   * @param {Object} ray 光线对象
   * @returns {null | {obstacle:Object, point:{x,y}, distance:number}} 命中信息
   */
  traceRay(ray) {
    const rad = degToRad(ray.angleDeg)
    const dirX = Math.cos(rad)
    const dirY = Math.sin(rad)

    let nearest = null
    for (const ob of this.obstacles) {
      let hit = null
      if (ob.type === 'lens' && ob.center) {
        // 薄透镜：与竖直透镜平面 x = center.x 求交
        if (Math.abs(dirX) < 1e-9) continue // 平行于透镜平面则不交
        const t = (ob.center.x - ray.origin.x) / dirX
        if (t <= 0) continue
        hit = { x: ray.origin.x + t * dirX, y: ray.origin.y + t * dirY, distance: t }
      } else if (ob.p1 && ob.p2) {
        hit = raySegmentIntersection(ray.origin.x, ray.origin.y, ray.angleDeg, ob.p1, ob.p2)
      }
      if (hit && (!nearest || hit.distance < nearest.distance)) {
        nearest = { obstacle: ob, point: hit, distance: hit.distance }
      }
    }

    const end = nearest
      ? nearest.point
      : { x: ray.origin.x + dirX * ray.maxLength, y: ray.origin.y + dirY * ray.maxLength }

    ray.segments = [{ from: { ...ray.origin }, to: { ...end } }]
    ray.totalLength = pointDistance(ray.origin.x, ray.origin.y, end.x, end.y)
    ray.hit = nearest
    return nearest
  }

  /** 重新追踪所有光线（界面/参数变化后调用） */
  traceAll() {
    this.rays.forEach(r => {
      if (r.autoTrace) this.traceRay(r)
    })
  }

  // ==========================================
  // 出射光线生成（反射 / 折射）
  // ==========================================

  /**
   * 反射光线配置：入射光线关于镜面的反射
   * 反射定律：反射光线与镜面夹角 = 入射光线与镜面夹角
   * @param {Object} incident 入射光线对象
   * @param {{x:number, y:number}} hitPoint 镜面交点
   * @param {number} mirrorAngleDeg 镜面方向角（度）
   * @param {Object} [extra] 覆盖默认配置（id/color/width/speed/delay/dashed/maxLength）
   * @returns {Object} 可直接传给 addRay 的配置
   */
  reflectedRayConfig(incident, hitPoint, mirrorAngleDeg, extra = {}) {
    // 方向关于镜面线对称：r = 2×镜面角 − 入射角
    const outDeg = normalizeAngle(2 * mirrorAngleDeg - incident.angleDeg)
    return {
      id: extra.id ?? `${incident.id}-reflected`,
      origin: { ...hitPoint },
      angleDeg: outDeg,
      color: extra.color ?? incident.color,
      width: extra.width ?? incident.width,
      speed: extra.speed ?? incident.speed,
      delay: extra.delay ?? incident.delay,
      dashed: extra.dashed ?? false,
      maxLength: extra.maxLength ?? incident.maxLength
    }
  }

  /**
   * 折射光线配置：入射光线经过界面后的折射（斯涅尔定律）
   * 自动判定入射侧（法线指向入射光线所在侧），全反射时返回 null
   * @param {Object} incident 入射光线对象
   * @param {{x:number, y:number}} hitPoint 界面交点
   * @param {number} boundaryAngleDeg 界面方向角（度）
   * @param {number} n1 入射侧折射率
   * @param {number} n2 折射侧折射率
   * @param {Object} [extra] 覆盖默认配置
   * @returns {Object|null} 折射光线配置；全反射时返回 null
   */
  refractedRayConfig(incident, hitPoint, boundaryAngleDeg, n1, n2, extra = {}) {
    const inDeg = incident.angleDeg
    // 法线方向（垂直界面），若指向入射光线前进方向则翻转 180°（法线指向入射侧）
    let normalDeg = boundaryAngleDeg + 90
    const dot = Math.cos(degToRad(normalDeg)) * Math.cos(degToRad(inDeg)) +
                Math.sin(degToRad(normalDeg)) * Math.sin(degToRad(inDeg))
    if (dot > 0) normalDeg = normalizeAngle(normalDeg + 180)

    // 入射角 = 光线与法线的锐角（法线指向入射侧时差值可能为钝角，取补角）
    let incAngle = Math.abs(normalizeAngle(inDeg - normalDeg))
    if (incAngle > 90) incAngle = 180 - incAngle
    const refrAngle = refractionAngle(n1, n2, incAngle)
    if (refrAngle === null) return null // 全反射

    // 折射光线：穿过界面后，与法线夹角 refrAngle，偏转方向与入射光线在法线同侧
    const inwardDeg = normalizeAngle(normalDeg + 180) // 指向介质内部
    const side = normalizeAngle(inDeg - inwardDeg) >= 0 ? 1 : -1
    const outDeg = normalizeAngle(inwardDeg + side * refrAngle)

    return {
      id: extra.id ?? `${incident.id}-refracted`,
      origin: { ...hitPoint },
      angleDeg: outDeg,
      color: extra.color ?? incident.color,
      width: extra.width ?? incident.width,
      speed: extra.speed ?? incident.speed,
      delay: extra.delay ?? incident.delay,
      dashed: extra.dashed ?? false,
      maxLength: extra.maxLength ?? incident.maxLength
    }
  }

  // ==========================================
  // 薄透镜三条特殊光线（凸透镜成像实验）
  // ==========================================

  /**
   * 薄透镜三条特殊光线路径（主光轴为 y=0 水平线，透镜为 x=lensX 竖直线）
   * ① 平行于主光轴 → 折射后过焦点 F'
   * ② 过光心 → 方向不变
   * ③ 过焦点 F → 折射后平行于主光轴
   * 注：u < f 成虚像时，组件需自行绘制出射光线的反向延长线（虚线）找像点
   * @param {{x:number, y:number}} tip 物点（物体顶端，y ≠ 0）
   * @param {number} lensX 透镜平面 x 坐标
   * @param {number} f 焦距（> 0）
   * @param {Object} [opts]
   * @param {number} [opts.length] 出射光线延伸长度（默认 400）
   * @returns {Array<{id:string, color:string, segments:Array<{from:{x,y}, to:{x,y}}>}>}
   */
  lensSpecialRays(tip, lensX, f, opts = {}) {
    const L = opts.length ?? 400
    const colors = ['#e74c3c', '#2e9e44', '#1890ff']
    const results = []
    if (Math.abs(tip.y) < 1e-6) return results // 物点在主光轴上：退化为一条直线，交由组件处理

    // ① 平行光线：水平入射 → 透镜 → 过焦点 F'（lensX + f, 0）
    results.push({
      id: 'ray-parallel',
      color: colors[0],
      segments: [
        { from: { x: tip.x, y: tip.y }, to: { x: lensX, y: tip.y } },
        { from: { x: lensX, y: tip.y }, to: { x: lensX + f, y: 0 } }
      ]
    })

    // ② 过光心：直线穿过，方向不变
    const dx2 = lensX - tip.x
    const dy2 = -tip.y
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1
    const ux2 = dx2 / len2
    const uy2 = dy2 / len2
    results.push({
      id: 'ray-center',
      color: colors[1],
      segments: [
        { from: { x: tip.x, y: tip.y }, to: { x: lensX + ux2 * L, y: uy2 * L } }
      ]
    })

    // ③ 过焦点 F（lensX - f, 0）→ 透镜 → 平行出射
    const dx3 = tip.x - (lensX - f)
    const dy3 = tip.y
    const len3 = Math.sqrt(dx3 * dx3 + dy3 * dy3) || 1
    const ux3 = dx3 / len3
    const uy3 = dy3 / len3
    if (Math.abs(ux3) > 1e-6) {
      const t3 = (lensX - tip.x) / ux3 // 到达透镜平面的射线参数
      const hitY3 = tip.y + uy3 * t3
      results.push({
        id: 'ray-focus',
        color: colors[2],
        segments: [
          { from: { x: tip.x, y: tip.y }, to: { x: lensX, y: hitY3 } },
          { from: { x: lensX, y: hitY3 }, to: { x: lensX + L, y: hitY3 } }
        ]
      })
    }

    return results
  }

  // ==========================================
  // 光学场景步进：推进光线传播动画（不进行力学积分）
  // ==========================================

  _stepPhysics(dt) {
    for (const ray of this.rays) {
      if (ray.completed) continue
      ray.elapsed += dt
      if (ray.elapsed < ray.delay) continue
      // 只计算本帧内延迟结束之后的传播时间
      const activeTime = Math.min(dt, ray.elapsed - ray.delay)
      ray.progress = Math.min(1, ray.progress + ray.speed * activeTime)
      if (ray.progress >= 1) ray.completed = true
    }
  }

  // ==========================================
  // 重置与状态输出
  // ==========================================

  reset() {
    super.reset()
    this.rays.forEach(r => {
      r.progress = 0
      r.elapsed = 0
      r.completed = false
    })
    this.traceAll()
  }

  getState() {
    const base = super.getState()
    return {
      ...base,
      rays: this.rays.map(r => ({
        id: r.id,
        progress: r.progress,
        completed: r.completed,
        segments: r.segments,
        totalLength: r.totalLength,
        hit: r.hit,
        color: r.color,
        width: r.width,
        dashed: r.dashed
      }))
    }
  }
}
