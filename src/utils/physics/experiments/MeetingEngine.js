import { PhysicsEngine } from '../PhysicsEngine.js'
import { round, normalizeRingPos, ringShortestDistance } from '../physicsUtils.js'

export class MeetingEngine extends PhysicsEngine {
  constructor(params = {}) {
    super(params)

    // 相遇统计
    this.meetCount = 0
    this.meetTimes = []
    this._meetThreshold = 0.15 // 相遇判定阈值（米）
    this._lastDistance = Infinity // 上一帧间距，用于判断是否穿越
  }

  /**
   * 初始化两个物体
   */
  initBodies() {
    this.clearBodies()
    this.addBody({
      id: 'A',
      mass: 1,
      position: this.params.posA || 0,
      velocity: this.params.vA || 0,
      radius: 0.3
    })
    this.addBody({
      id: 'B',
      mass: 1,
      position: this.params.posB || 100,
      velocity: this.params.vB || 0,
      radius: 0.3
    })
    this._resetInitialState()
  }

  /**
   * 保存初始状态（用于重置）
   */
  _resetInitialState() {
    this._initialState = {
      meetCount: 0,
      meetTimes: [],
      bodies: this.bodies.map(b => ({
        position: b.position,
        velocity: b.velocity
      }))
    }
  }

  /**
   * 重写重置
   */
  reset() {
    super.reset()
    this.meetCount = 0
    this.meetTimes = []
    this._lastDistance = Infinity

    // 恢复物体初始状态
    if (this._initialState) {
      this.bodies.forEach((b, i) => {
        b.position = this._initialState.bodies[i].position
        b.velocity = this._initialState.bodies[i].velocity
      })
    }
  }

  /**
   * 重写单步物理计算（运动学直接计算，不通过受力）
   */
  _stepPhysics(dt) {
    const aA = this.params.aA || 0
    const aB = this.params.aB || 0

    const bodyA = this.getBody('A')
    const bodyB = this.getBody('B')

    // 更新物体A
    bodyA.acceleration = aA
    bodyA.velocity += aA * dt
    bodyA.position += bodyA.velocity * dt + 0.5 * aA * dt * dt

    // 更新物体B
    bodyB.acceleration = aB
    bodyB.velocity += aB * dt
    bodyB.position += bodyB.velocity * dt + 0.5 * aB * dt * dt

    // 环形跑道位置归一化
    if (this.params.trackType === 'ring') {
      const len = this.params.trackLength || 100
      bodyA.position = normalizeRingPos(bodyA.position, len)
      bodyB.position = normalizeRingPos(bodyB.position, len)
    }

    this._onStepEnd?.(dt)
  }

  /**
   * 重写碰撞检测 → 改为相遇检测
   */
  _checkCollisions() {
    const bodyA = this.getBody('A')
    const bodyB = this.getBody('B')
    if (!bodyA || !bodyB) return

    let distance
    if (this.params.trackType === 'ring') {
      distance = ringShortestDistance(bodyA.position, bodyB.position, this.params.trackLength)
    } else {
      distance = Math.abs(bodyA.position - bodyB.position)
    }

    // 相遇判定：间距小于阈值 且 间距在缩小（穿越相遇点）
    if (distance <= this._meetThreshold && distance < this._lastDistance) {
      this.meetCount++
      this.meetTimes.push(round(this.totalTime, 3))
      this._triggerEvent('meet', {
        time: round(this.totalTime, 3),
        position: round((bodyA.position + bodyA.position) / 2, 3),
        count: this.meetCount
      })
    }

    this._lastDistance = distance
  }

  /**
   * 获取当前间距
   */
  getDistance() {
    const bodyA = this.getBody('A')
    const bodyB = this.getBody('B')
    if (!bodyA || !bodyB) return 0

    if (this.params.trackType === 'ring') {
      return ringShortestDistance(bodyA.position, bodyB.position, this.params.trackLength)
    }
    return Math.abs(bodyA.position - bodyB.position)
  }

  /**
   * 扩展状态输出
   */
  getState() {
    const state = super.getState()
    state.distance = round(this.getDistance(), 3)
    state.meetCount = this.meetCount
    state.meetTimes = [...this.meetTimes]
    return state
  }

  /**
   * 更新参数（运行中实时生效）
   */
  updateParams(newParams) {
    super.updateParams(newParams)
    // 暂停状态下更新参数时，同步更新物体初速度
    if (this.state !== 'running') {
      const bodyA = this.getBody('A')
      const bodyB = this.getBody('B')
      if (bodyA && newParams.vA !== undefined) bodyA.velocity = newParams.vA
      if (bodyA && newParams.posA !== undefined) bodyA.position = newParams.posA
      if (bodyB && newParams.vB !== undefined) bodyB.velocity = newParams.vB
      if (bodyB && newParams.posB !== undefined) bodyB.position = newParams.posB
      this._resetInitialState()
    }
  }
}
