<template>
  <div class="train-bridge-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="layoutRunState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧控制面板 -->
      <template #control>
        <ControlPanel
          :config="config.controls"
          :model-value="params"
          @update:model-value="mergeParams"
          @change="handleParamChange"
        />
      </template>

      <!-- 中间画布 -->
      <template #canvas>
        <ExperimentCanvas
          ref="canvasRef"
          :draw="drawScene"
          :state="engineState"
          :scale="canvasScale"
          :origin-x="originX"
          :origin-y="0.5"
          @resize="handleCanvasResize"
        />
      </template>

      <!-- 右侧数据面板 -->
      <template #data>
        <DataPanel
          :config="config.dataFields"
          :current-data="displayState"
          :history-data="engineState.history || []"
        />
      </template>

      <!-- 底部原理 -->
      <template #theory>
        <div class="theory-content">
          <p><strong>实验原理：</strong>{{ config.theory.principle }}</p>
          <div class="formula-block">
            <h4>核心公式</h4>
            <ul>
              <li v-for="(f, i) in config.theory.formulas" :key="i">{{ f }}</li>
            </ul>
          </div>
          <div class="keypoint-block">
            <h4>知识要点</h4>
            <ul>
              <li v-for="(k, i) in config.theory.keyPoints" :key="i">{{ k }}</li>
            </ul>
          </div>
          <p class="notes">说明：{{ config.theory.notes }}</p>
        </div>
      </template>
    </ExperimentLayout>

    <!-- 完全过桥提示弹窗 -->
    <Transition name="fade">
      <div v-if="showFinishTip" class="finish-tip">
        🏁 火车完全过桥！用时 {{ finishTipData.time }}s，总路程 {{ finishTipData.totalDistance }}m
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import ExperimentLayout from '@/layouts/ExperimentLayout.vue'
import ControlPanel from '@/components/ControlPanel.vue'
import DataPanel from '@/components/DataPanel.vue'
import ExperimentCanvas from '@/components/ExperimentCanvas.vue'
import { trainBridgeConfig } from '@/config/experiments/mechanics/train-bridge.js'
import { TrainBridgeEngine } from '@/utils/physics/experiments/TrainBridgeEngine.js'

const config = trainBridgeConfig

// 参数状态
const params = reactive({})
// 初始化默认参数
config.controls.forEach(group => {
  group.fields.forEach(f => {
    params[f.key] = f.default
  })
})

// 引擎状态
const engineState = ref({ bodies: [], history: [], stage: 'approach', finished: false })
let engine = null

// 画布实际显示宽度（px），由 ExperimentCanvas 回传
const canvasWidth = ref(600)
const handleCanvasResize = ({ width }) => {
  canvasWidth.value = width
}

// 可视范围：桥长 + 出发区(车长+30) + 过桥后余量(车长+30)
// 左端 = -(车长+30)，右端 = 桥长 + 车长 + 30
const viewRange = computed(() => {
  const bridgeLen = params.bridgeLength || 100
  const trainLen = params.trainLength || 50
  return bridgeLen + 2 * trainLen + 60
})

// 画布缩放比例：可视范围映射到画布宽度的 90%
const canvasScale = computed(() => {
  return (canvasWidth.value * 0.9) / viewRange.value
})

// 桥头(x=0)在画布中的位置比例
const originX = computed(() => {
  const trainLen = params.trainLength || 50
  return (trainLen + 30) / viewRange.value
})

// 引擎阶段 → 中文显示
const stageTextMap = {
  approach: '未到桥',
  boarding: '上桥中',
  onBridge: '完全在桥上',
  leaving: '车头出桥',
  finished: '完全过桥'
}

// 供数据面板显示的状态（stage 转中文）
const displayState = computed(() => {
  const s = engineState.value
  return { ...s, stage: stageTextMap[s.stage] || s.stage }
})

// 布局状态徽标：完成后显示"已完成"
const layoutRunState = computed(() => {
  return engineState.value.finished ? 'finished' : engineState.value.state
})

// 完全过桥提示
const showFinishTip = ref(false)
const finishTipData = reactive({ time: 0, totalDistance: 0 })
let finishTimer = null

// ========== 引擎控制 ==========

const initEngine = () => {
  engine = new TrainBridgeEngine({ ...params })
  engine.initBodies()

  engine.onUpdate = (state) => {
    engineState.value = state
  }

  engine.onEvent = (name, data) => {
    if (name === 'finish') {
      showFinishTip.value = true
      finishTipData.time = data.time
      finishTipData.totalDistance = data.totalDistance
      clearTimeout(finishTimer)
      finishTimer = setTimeout(() => {
        showFinishTip.value = false
      }, 2500)
    }
  }

  // 初始触发一次更新
  engine.reset()
}

const handleStart = () => {
  engine?.start()
}

const handlePause = () => {
  engine?.pause()
}

const handleReset = () => {
  engine?.reset()
}

// 合并参数更新（保持 params 响应式对象引用不变）
const mergeParams = (newParams) => {
  Object.assign(params, newParams)
}

const handleParamChange = (key, value) => {
  engine?.updateParams({ [key]: value })
}

// ========== 场景绘制 ==========

const drawScene = (ctx, state, utils) => {
  if (!state.bodies || state.bodies.length < 1) return

  // 地面参考线
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
  ctx.lineWidth = 1
  const ground = utils.worldToCanvas(0, 0)
  ctx.beginPath()
  ctx.moveTo(0, ground.y)
  ctx.lineTo(utils.canvasWidth || ground.x * 2, ground.y)
  ctx.stroke()

  drawBridge(ctx, utils)
  drawTrain(ctx, utils, state)
}

// 绘制桥梁（红色直线，长度随桥长参数变化）
const drawBridge = (ctx, utils) => {
  const bridgeLen = params.bridgeLength || 100
  const start = utils.worldToCanvas(0, 0)
  const end = utils.worldToCanvas(bridgeLen, 0)

  // 红色桥身
  ctx.strokeStyle = '#f5222d'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()

  // 桥头 / 桥尾标记
  ctx.fillStyle = '#f5222d'
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('桥头', start.x, start.y - 16)
  ctx.fillText('桥尾', end.x, end.y - 16)

  // 桥面刻度（每 10m）
  ctx.strokeStyle = 'rgba(245, 34, 45, 0.5)'
  ctx.lineWidth = 1
  ctx.font = '10px sans-serif'
  for (let i = 10; i < bridgeLen; i += 10) {
    const pos = utils.worldToCanvas(i, 0)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y - 5)
    ctx.lineTo(pos.x, pos.y + 5)
    ctx.stroke()
    if (i % 20 === 0) {
      ctx.fillStyle = 'rgba(245, 34, 45, 0.7)'
      ctx.fillText(i + 'm', pos.x, pos.y - 26)
    }
  }
}

// 绘制火车（蓝色矩形，长度随车长参数变化）
const drawTrain = (ctx, utils, state) => {
  const body = state.bodies[0]
  const trainLen = params.trainLength || 50

  const head = utils.worldToCanvas(body.position, 0)
  const tail = utils.worldToCanvas(body.position - trainLen, 0)
  const thickness = 14

  // 车身
  ctx.fillStyle = '#1890ff'
  ctx.fillRect(tail.x, head.y - thickness / 2, Math.max(head.x - tail.x, 2), thickness)
  ctx.strokeStyle = '#0e5a9e'
  ctx.lineWidth = 1.5
  ctx.strokeRect(tail.x, head.y - thickness / 2, Math.max(head.x - tail.x, 2), thickness)

  // 车窗装饰（等距小方块）
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
  const windowCount = Math.max(1, Math.floor(trainLen / 10))
  const winW = 4
  for (let i = 0; i < windowCount; i++) {
    const wx = tail.x + ((i + 0.5) / windowCount) * (head.x - tail.x)
    ctx.fillRect(wx - winW / 2, head.y - thickness / 2 + 2, winW, thickness - 4)
  }

  // 车头指示（小三角）
  ctx.fillStyle = '#0e5a9e'
  ctx.beginPath()
  ctx.moveTo(head.x, head.y - thickness / 2 - 2)
  ctx.lineTo(head.x + 6, head.y)
  ctx.lineTo(head.x, head.y + thickness / 2 + 2)
  ctx.closePath()
  ctx.fill()

  // 车头 / 车尾标签
  ctx.fillStyle = '#1890ff'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('车头', head.x, head.y + thickness / 2 + 16)
  ctx.fillText('车尾', tail.x, head.y + thickness / 2 + 16)
}

// ========== 生命周期 ==========

onMounted(() => {
  initEngine()
})

onUnmounted(() => {
  engine?.destroy()
  clearTimeout(finishTimer)
})
</script>

<style lang="scss" scoped>
.train-bridge-experiment {
  position: relative;
  width: 100%;
  height: 100%;
}

.theory-content {
  line-height: 1.8;
  font-size: 14px;
  color: $color-text-dark;

  h4 {
    margin: 12px 0 6px;
    color: $color-primary;
    font-size: 15px;
  }

  ul {
    margin: 0;
    padding-left: 20px;
  }

  .notes {
    margin-top: 12px;
    color: #999;
    font-size: 13px;
  }
}

.finish-tip {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  background: rgba(82, 196, 26, 0.95);
  color: #fff;
  border-radius: 20px;
  font-weight: 500;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
  white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
