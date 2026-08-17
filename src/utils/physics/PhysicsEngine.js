// ==========================================
// 力学物理引擎基类（初中完整版 + 高中兼容架构）
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
  buoyancyArchimedes
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
