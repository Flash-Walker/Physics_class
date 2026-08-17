// ==========================================
// 火车过桥问题 - 物理引擎
// 坐标系：桥头 x=0，桥尾 x=bridgeLength
// 火车初始停在桥头左侧（车头 = -(车长+20)，保证整车在桥外）
// 车尾完全越过桥尾 → 完全过桥，自动停止
// ==========================================

import { PhysicsEngine } from '../PhysicsEngine.js'
import { round } from '../physicsUtils.js'

export class TrainBridgeEngine extends PhysicsEngine {
  constructor(params = {}) {
    super(params)

    // 过桥阶段：approach 未到桥 / boarding 上桥中 / onBridge 完全在桥上 / leaving 车头出桥 / finished 完全过桥
    this.stage = 'approach'
    this.finished = false
  }

  /**
   * 初始化火车
   */
  initBodies() {
    this.clearBodies()
    const trainLength = this.params.trainLength || 50
    this.addBody({
      id: 'train',
      mass: 1,
      position: -(trainLength + 20), // 车头在桥头左侧，整车完全在桥外
      velocity: this.params.initialVelocity || 10,
      radius: 0.1
    })
    this._resetInitialState()
  }

  /**
   * 保存初始状态（用于重置）
   */
  _resetInitialState() {
    this._initialState = {
      bodies: this.bodies.map(b => ({
        position: b.position,
        velocity: b.velocity
      }))
    }
  }

  /**
   * 重写开始：已完成状态下点击开始 = 重新来一遍
   */
  start() {
    if (this.finished) this.reset()
    super.start()
  }

  /**
   * 重写单步：完全过桥后时间与物理全部冻结
   */
  step(dt = 0.1) {
    if (this.finished) return
    super.step(dt)
  }

  /**
   * 重写重置
   */
  reset() {
    super.reset()
    this.finished = false
    this.stage = 'approach'

    // 恢复火车初始状态
    if (this._initialState) {
      this.bodies.forEach((b, i) => {
        b.position = this._initialState.bodies[i].position
        b.velocity = this._initialState.bodies[i].velocity
        b.distanceTraveled = 0
        b.tailPosition = b.position - (this.params.trainLength || 50)
      })
    }

    // super.reset() 已在字段恢复前触发过一次更新,这里补一次,确保 UI 拿到完整状态
    this._triggerUpdate()
  }

  /**
   * 重写单步物理计算（运动学直接计算）
   */
  _stepPhysics(dt) {
    // 已完全过桥：火车停住，不再计算
    if (this.finished) return

    const body = this.getBody('train')
    if (!body) return

    const a = this.params.acceleration || 0
    const oldPos = body.position

    // 匀变速运动
    body.acceleration = a
    body.velocity += a * dt
    body.position += body.velocity * dt + 0.5 * a * dt * dt

    // 累计路程（火车单向行驶，路程 = 位移）
    body.distanceTraveled = (body.distanceTraveled || 0) + Math.abs(body.position - oldPos)

    // 更新车尾位置
    body.tailPosition = body.position - (this.params.trainLength || 50)

    // 阶段判定与结束检测
    this._updateStage(body)

    this._onStepEnd?.(dt)
  }

  /**
   * 更新过桥阶段，检测完全过桥
   */
  _updateStage(body) {
    const trainLength = this.params.trainLength || 50
    const bridgeLength = this.params.bridgeLength || 100
    const head = body.position
    const tail = head - trainLength

    if (tail >= bridgeLength) {
      // 完全过桥：精确停在车尾刚好离开桥尾的位置，自动结束
      body.position -= tail - bridgeLength
      body.tailPosition = bridgeLength
      this.finished = true
      this.stage = 'finished'
      this.pause()
      this._triggerEvent('finish', {
        time: round(this.totalTime, 3),
        headPosition: round(body.position, 3),
        totalDistance: round(body.distanceTraveled, 3)
      })
    } else if (head >= bridgeLength) {
      this.stage = 'leaving' // 车头出桥，车尾还在桥上
    } else if (tail > 0) {
      this.stage = 'onBridge' // 整车都在桥上
    } else if (head >= 0) {
      this.stage = 'boarding' // 车头上桥，车尾未上桥
    } else {
      this.stage = 'approach' // 还未到桥
    }
  }

  /**
   * 更新参数
   * - 速度实时生效（运行中调整立即改变火车速度）
   * - 长度类参数（车长/桥长）仅在非运行状态生效，并重新定位火车
   */
  updateParams(newParams) {
    super.updateParams(newParams)

    const body = this.getBody('train')

    // 速度实时生效
    if (body && newParams.initialVelocity !== undefined) {
      body.velocity = newParams.initialVelocity
    }

    // 长度类参数：非运行状态重新定位，运行中只改参数不瞬移
    if (body && this.state !== 'running') {
      if (newParams.trainLength !== undefined || newParams.bridgeLength !== undefined) {
        const trainLength = this.params.trainLength || 50
        body.position = -(trainLength + 20)
        body.tailPosition = body.position - trainLength
        this._resetInitialState()
      }
    }

    // 参数同步完成后立即刷新 UI 快照
    this._triggerUpdate()
  }

  /**
   * 扩展状态输出
   */
  getState() {
    const state = super.getState()
    state.stage = this.stage
    state.finished = this.finished
    const body = this.getBody('train')
    state.tailPosition = body ? round(body.tailPosition ?? body.position - (this.params.trainLength || 50), 3) : 0
    state.trainLength = this.params.trainLength
    state.bridgeLength = this.params.bridgeLength
    return state
  }
}
