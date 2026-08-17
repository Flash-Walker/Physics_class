<template>
  <div class="meeting-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧控制面板 -->
      <template #control>
        <ControlPanel
          :config="config.controls"
          v-model="params"
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
          :origin-x="0.05"
          :origin-y="0.5"
        />
      </template>

      <!-- 右侧数据面板 -->
      <template #data>
        <DataPanel
          :config="config.dataFields"
          :current-data="engineState"
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

    <!-- 相遇提示弹窗 -->
    <Transition name="fade">
      <div v-if="showMeetTip" class="meet-tip">
        ✨ 第 {{ meetTipData.count }} 次相遇！时刻：{{ meetTipData.time }}s
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
import { meetingConfig } from '@/config/experiments/mechanics/meeting.js'
import { MeetingEngine } from '@/utils/physics/experiments/MeetingEngine.js'

const config = meetingConfig

// 参数状态
const params = reactive({})
// 初始化默认参数
config.controls.forEach(group => {
  group.fields.forEach(f => {
    params[f.key] = f.default
  })
})

// 引擎状态
const engineState = ref({ bodies: [], history: [], distance: 0, meetCount: 0 })
let engine = null

// 画布缩放比例（根据跑道长度自适应）
const canvasScale = computed(() => {
  const length = params.trackLength || 100
  // 让跑道占画布宽度的90%
  return (window.innerWidth * 0.9 * 0.6) / length
})

// 相遇提示
const showMeetTip = ref(false)
const meetTipData = reactive({ count: 0, time: 0 })
let meetTimer = null

// ========== 引擎控制 ==========

const initEngine = () => {
  engine = new MeetingEngine({ ...params })
  engine.initBodies()

  engine.onUpdate = (state) => {
    engineState.value = state
  }

  engine.onEvent = (name, data) => {
    if (name === 'meet') {
      showMeetTip.value = true
      meetTipData.count = data.count
      meetTipData.time = data.time
      clearTimeout(meetTimer)
      meetTimer = setTimeout(() => {
        showMeetTip.value = false
      }, 1500)
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

const handleParamChange = (key, value) => {
  engine?.updateParams({ [key]: value })
}

// ========== 场景绘制 ==========

const drawScene = (ctx, state, utils) => {
  if (!state.bodies || state.bodies.length < 2) return

  const trackType = params.trackType
  const trackLength = params.trackLength

  if (trackType === 'straight') {
    drawStraightTrack(ctx, utils, trackLength)
  } else {
    drawRingTrack(ctx, utils, trackLength)
  }

  // 绘制物体
  state.bodies.forEach(body => {
    const color = body.id === 'A' ? '#f5222d' : '#1890ff'
    if (trackType === 'straight') {
      drawBodyStraight(ctx, utils, body, color)
    } else {
      drawBodyRing(ctx, utils, body, trackLength, color)
    }
  })
}

// 绘制直道
const drawStraightTrack = (ctx, utils, length) => {
  const start = utils.worldToCanvas(0, 0)
  const end = utils.worldToCanvas(length, 0)

  // 跑道线
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()

  // 刻度
  ctx.fillStyle = '#666'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  for (let i = 0; i <= length; i += Math.floor(length / 10)) {
    const pos = utils.worldToCanvas(i, 0)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y - 5)
    ctx.lineTo(pos.x, pos.y + 5)
    ctx.stroke()
    ctx.fillText(i + 'm', pos.x, pos.y + 20)
  }
}

// 绘制环形跑道
const drawRingTrack = (ctx, utils, length) => {
  const center = utils.worldToCanvas(length / 2, 0)
  const radius = (length / (2 * Math.PI)) * utils.scale
  // 调整y坐标，让圆居中
  const centerY = center.y

  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(center.x, centerY, radius, 0, Math.PI * 2)
  ctx.stroke()

  // 起点标记
  ctx.fillStyle = '#666'
  ctx.beginPath()
  ctx.arc(center.x, centerY - radius, 4, 0, Math.PI * 2)
  ctx.fill()
}

// 绘制直道物体
const drawBodyStraight = (ctx, utils, body, color) => {
  const pos = utils.worldToCanvas(body.position, 0)
  // 小球
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2)
  ctx.fill()
  // 标签
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(body.id, pos.x, pos.y)
}

// 绘制环形物体
const drawBodyRing = (ctx, utils, body, length, color) => {
  const center = utils.worldToCanvas(length / 2, 0)
  const radius = (length / (2 * Math.PI)) * utils.scale
  const centerY = center.y
  const angle = (body.position / length) * Math.PI * 2 - Math.PI / 2

  const x = center.x + radius * Math.cos(angle)
  const y = centerY + radius * Math.sin(angle)

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, 10, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#fff'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(body.id, x, y)
}

// ========== 生命周期 ==========

onMounted(() => {
  initEngine()
})

onUnmounted(() => {
  engine?.destroy()
  clearTimeout(meetTimer)
})
</script>

<style lang="scss" scoped>
.meeting-experiment {
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

.meet-tip {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  background: rgba(245, 166, 35, 0.95);
  color: #fff;
  border-radius: 20px;
  font-weight: 500;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
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
