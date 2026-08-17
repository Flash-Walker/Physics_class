<template>
  <div class="data-panel">
    <!-- 按分组渲染 -->
    <div v-for="group in config" :key="group.group" class="data-group">
      <div class="group-title">{{ group.group }}</div>

      <!-- 1. 数值卡片模式：展示核心物理量 -->
      <div v-if="group.display === 'card'" class="card-list">
        <div
          v-for="field in group.fields"
          :key="field.key"
          class="data-card"
          :class="{ highlight: field.highlight }"
        >
          <div class="card-label">{{ field.label }}</div>
          <div class="card-value">
            {{ formatValue(getCurrentValue(field.key), field.precision) }}
            <span class="card-unit">{{ field.unit }}</span>
          </div>
        </div>
      </div>

      <!-- 2. 表格模式：多物体状态对比 -->
      <div v-else-if="group.display === 'table'" class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>物体</th>
              <th v-for="field in group.fields" :key="field.key">
                {{ field.label }}({{ field.unit }})
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="body in currentData.bodies || []" :key="body.id">
              <td class="body-name">{{ body.id.toUpperCase() }}</td>
              <td v-for="field in group.fields" :key="field.key">
                {{ formatValue(body[field.key], field.precision) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 3. 图表模式：历史趋势折线图 -->
      <div v-else-if="group.display === 'chart'" class="chart-wrapper">
        <canvas ref="chartCanvas" class="chart-canvas"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  // 数据字段配置
  config: {
    type: Array,
    required: true
  },
  // 当前实时状态（物理引擎返回的 state）
  currentData: {
    type: Object,
    default: () => ({ bodies: [], totalTime: 0 })
  },
  // 历史数据数组
  historyData: {
    type: Array,
    default: () => []
  }
})

const chartCanvas = ref(null)

// ========== 工具方法 ==========

// 格式化数值精度
const formatValue = (value, precision = 2) => {
  if (value === null || value === undefined || isNaN(value)) return '--'
  return Number(value).toFixed(precision)
}

// 获取当前顶层字段值
const getCurrentValue = (key) => {
  return props.currentData[key]
}

// ========== 图表绘制 ==========

// 颜色配置（对应多物体）
const bodyColors = ['#f5222d', '#1890ff', '#52c41a', '#faad14', '#722ed1']

// 重绘图表
const redrawChart = () => {
  // v-for 内的模板 ref 会被收集为数组,取第一个元素
  const raw = chartCanvas.value
  const canvas = Array.isArray(raw) ? raw[0] : raw
  // 防御：canvas 未挂载或引用异常时跳过（如 v-else-if 分支切换期间）
  if (!canvas || typeof canvas.getContext !== 'function') return

  const ctx = canvas.getContext('2d')
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1

  // 适配高清屏
  canvas.width = rect.width * dpr
  canvas.height = 160 * dpr
  ctx.scale(dpr, dpr)

  const width = rect.width
  const height = 160
  const padding = { top: 10, right: 10, bottom: 20, left: 35 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  // 清空画布
  ctx.clearRect(0, 0, width, height)

  // 找当前图表分组配置
  const chartGroup = props.config.find(g => g.display === 'chart')
  if (!chartGroup || props.historyData.length < 2) {
    // 数据不足时显示提示
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('等待数据...', width / 2, height / 2)
    return
  }

  const xKey = chartGroup.xAxis || 'time'
  const yKeys = chartGroup.yAxis || []
  const bodies = props.currentData.bodies || []

  // 计算Y轴范围
  let yMin = Infinity
  let yMax = -Infinity
  props.historyData.forEach(item => {
    item.bodies.forEach(body => {
      yKeys.forEach(key => {
        const val = body[key]
        if (val < yMin) yMin = val
        if (val > yMax) yMax = val
      })
    })
  })

  // 留边距
  const yRange = yMax - yMin || 1
  yMin -= yRange * 0.1
  yMax += yRange * 0.1

  // X轴范围
  const xMin = props.historyData[0][xKey]
  const xMax = props.historyData[props.historyData.length - 1][xKey]
  const xRange = xMax - xMin || 1

  // 坐标转换函数
  const getX = (val) => padding.left + ((val - xMin) / xRange) * chartW
  const getY = (val) => padding.top + chartH - ((val - yMin) / (yMax - yMin)) * chartH

  // 画网格线
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()
  }

  // 画坐标轴
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.beginPath()
  ctx.moveTo(padding.left, padding.top)
  ctx.lineTo(padding.left, height - padding.bottom)
  ctx.lineTo(width - padding.right, height - padding.bottom)
  ctx.stroke()

  // 画Y轴刻度
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i
    const val = yMax - ((yMax - yMin) / 4) * i
    ctx.fillText(val.toFixed(1), padding.left - 4, y + 3)
  }

  // 画每条折线（每个物体一条）
  yKeys.forEach((yKey, keyIdx) => {
    bodies.forEach((body, bodyIdx) => {
      const color = bodyColors[bodyIdx % bodyColors.length]
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()

      props.historyData.forEach((item, idx) => {
        const bodyData = item.bodies.find(b => b.id === body.id)
        if (!bodyData) return

        const x = getX(item[xKey])
        const y = getY(bodyData[yKey])

        if (idx === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()
    })
  })
}

// 监听历史数据变化，重绘图表
watch(() => props.historyData.length, () => {
  nextTick(redrawChart)
}, { deep: false })

onMounted(() => {
  nextTick(redrawChart)
})
</script>

<style lang="scss" scoped>
.data-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow-y: auto;
}

.data-group {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
}

.group-title {
  font-size: 14px;
  font-weight: 500;
  color: $color-accent;
  margin-bottom: 10px;
}

/* ========== 数值卡片 ========== */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);

  &.highlight {
    border-color: $color-accent;
    background: rgba(245, 166, 35, 0.1);
  }
}

.card-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.card-value {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  line-height: 1.2;

  .card-unit {
    font-size: 12px;
    font-weight: normal;
    color: rgba(255, 255, 255, 0.5);
    margin-left: 4px;
  }
}

.data-card.highlight .card-value {
  color: $color-accent;
}

/* ========== 数据表格 ========== */
.data-table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.data-table th,
.data-table td {
  padding: 6px 8px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.data-table th {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  background: rgba(255, 255, 255, 0.03);
}

.data-table td {
  color: rgba(255, 255, 255, 0.9);
}

.body-name {
  font-weight: 600;
  color: $color-accent !important;
}

/* ========== 图表 ========== */
.chart-wrapper {
  width: 100%;
}

.chart-canvas {
  width: 100%;
  height: 160px;
  display: block;
}
</style>
