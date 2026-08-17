import { PhysicsEngine } from '../PhysicsEngine.js'
import { round, normalizeRingPos, ringShortestDistance } from '../physicsUtils.js'

export class MeetingEngine extends PhysicsEngine {
  constructor(params = {}) {
    super(params)

    // 相遇统计
    this.meetCount = 0
    this.meetTimes = []
    this._meetThreshold = 0.15 // 相遇判定阈值（米）
    this._lastDistance = null // 上一帧间距（环形用），null=首帧不判定
    this._lastSignedDist = null // 上一帧有向距离（直道用，A位置-B位置）
    this._armed = true // 相遇检测保险：相遇后需离开阈值范围才重新启用，防止重复计数
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
    this._lastDistance = null
    this._lastSignedDist = null
    this._armed = true

    // 恢复物体初始状态
    if (this._initialState) {
      this.bodies.forEach((b, i) => {
        b.position = this._initialState.bodies[i].position
        b.velocity = this._initialState.bodies[i].velocity
        b.distanceTraveled = 0
      })
    }

    // super.reset() 已在字段恢复前触发过一次更新,这里补一次,确保 UI 拿到完整状态
    this._triggerUpdate()
  }

  /**
   * 重写单步物理计算（运动学直接计算，不通过受力）
   * 直道：到达两端端点后折返（速度反向、大小不变）
   * 环形：位置循环归一化
   */
  _stepPhysics(dt) {
    const aA = this.params.aA || 0
    const aB = this.params.aB || 0

    const bodyA = this.getBody('A')
    const bodyB = this.getBody('B')

    // 记录旧位置（用于路程累计，需在折返/归一化之前计算位移）
    const oldPosA = bodyA.position
    const oldPosB = bodyB.position

    // 更新物体A
    bodyA.acceleration = aA
    bodyA.velocity += aA * dt
    bodyA.position += bodyA.velocity * dt + 0.5 * aA * dt * dt

    // 更新物体B
    bodyB.acceleration = aB
    bodyB.velocity += aB * dt
    bodyB.position += bodyB.velocity * dt + 0.5 * aB * dt * dt

    const trackLen = this.params.trackLength || 100

    // 累计路程（位移绝对值；环形跨过起点时取较短弧长）
    const travelA = this._travelDistance(oldPosA, bodyA.position, trackLen)
    const travelB = this._travelDistance(oldPosB, bodyB.position, trackLen)
    bodyA.distanceTraveled = (bodyA.distanceTraveled || 0) + travelA
    bodyB.distanceTraveled = (bodyB.distanceTraveled || 0) + travelB

    if (this.params.trackType === 'ring') {
      // 环形跑道：位置归一化
      bodyA.position = normalizeRingPos(bodyA.position, trackLen)
      bodyB.position = normalizeRingPos(bodyB.position, trackLen)
    } else {
      // 直道：越过端点后反射折返（速度大小不变、方向相反）
      // 用镜像反射而非简单夹取，避免浮点误差导致折返时刻延迟、位置漂移
      const bounce = (body) => {
        if (body.position < 0) {
          body.position = -body.position
          body.velocity = Math.abs(body.velocity)
        } else if (body.position > trackLen) {
          body.position = 2 * trackLen - body.position
          body.velocity = -Math.abs(body.velocity)
        }
      }
      bounce(bodyA)
      bounce(bodyB)
    }

    this._onStepEnd?.(dt)
  }

  /**
   * 计算本帧实际走过的路程
   * 直道：位移绝对值；环形：取较短弧长（避免跨起点时把大半圈误算进去）
   */
  _travelDistance(oldPos, newPos, trackLen) {
    const delta = Math.abs(newPos - oldPos)
    if (this.params.trackType === 'ring' && trackLen > 0) {
      return Math.min(delta, trackLen - delta)
    }
    return delta
  }

  /**
   * 重写碰撞检测 → 改为相遇检测
   * 直道：有向距离符号翻转判定穿越（高速下不漏判）
   * 环形：进入阈值范围 或 阈值内间距持续缩小
   * 保险机制：相遇后必须离开阈值范围才允许下一次计数，避免重复/抖动误报
   */
  _checkCollisions() {
    const bodyA = this.getBody('A')
    const bodyB = this.getBody('B')
    if (!bodyA || !bodyB) return

    const isRing = this.params.trackType === 'ring'
    let distance
    let met = false

    if (isRing) {
      distance = ringShortestDistance(bodyA.position, bodyB.position, this.params.trackLength)

      if (this._lastDistance !== null && this._armed) {
        // 从阈值外进入阈值内 = 擦肩穿越
        const entered = this._lastDistance >= this._meetThreshold && distance <= this._meetThreshold
        // 初始就在阈值内且间距仍在缩小 = 正在接近
        const shrinking = distance <= this._meetThreshold && distance < this._lastDistance
        met = entered || shrinking
      }
      this._lastDistance = distance
    } else {
      const s = bodyA.position - bodyB.position

      if (this._lastSignedDist !== null && this._armed) {
        // 有向距离符号翻转 = 两物体交错而过
        const crossed = this._lastSignedDist * s < 0
        // 距离小于阈值且仍在缩小 = 正在接近
        const touched = Math.abs(s) <= this._meetThreshold && Math.abs(s) < Math.abs(this._lastSignedDist)
        met = crossed || touched
      }
      this._lastSignedDist = s
      distance = Math.abs(s)
    }

    if (met) {
      this.meetCount++
      this.meetTimes.push(round(this.totalTime, 3))
      this._armed = false
      this._triggerEvent('meet', {
        time: round(this.totalTime, 3),
        position: round((bodyA.position + bodyB.position) / 2, 3),
        count: this.meetCount
      })
    } else if (distance > this._meetThreshold) {
      // 离开阈值范围后重新启用检测
      this._armed = true
    }
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
   * 更新参数
   * - 速度实时生效（运行中调整立即改变物体速度）
   * - 起始位置仅在非运行状态生效（避免运行中瞬移）
   * - 非运行状态下同步重置基准快照
   */
  updateParams(newParams) {
    super.updateParams(newParams)

    const bodyA = this.getBody('A')
    const bodyB = this.getBody('B')

    // 速度实时生效
    if (bodyA && newParams.vA !== undefined) bodyA.velocity = newParams.vA
    if (bodyB && newParams.vB !== undefined) bodyB.velocity = newParams.vB

    // 起始位置与基准快照：仅在未运行时同步
    if (this.state !== 'running') {
      if (bodyA && newParams.posA !== undefined) bodyA.position = newParams.posA
      if (bodyB && newParams.posB !== undefined) bodyB.position = newParams.posB
      this._resetInitialState()
    }

    // 参数同步完成后立即刷新 UI 快照（画布/数据面板显示最新状态）
    this._triggerUpdate()
  }
}
