<template>
  <div class="sound-wave-experiment">
    <ExperimentLayout
      :experiment-title="config.meta.name"
      :run-state="runState"
      @start="handleStart"
      @pause="handlePause"
      @reset="handleReset"
    >
      <!-- 左侧：参数控制 -->
      <template #control>
        <div class="sw-control">
          <p class="control-tip">🎤 对着麦克风说话/唱歌，或播放内置音频<br />实时观察声音的波形与频谱</p>

          <!-- 输入源切换 -->
          <div class="control-group">
            <div class="group-label">输入源</div>
            <div class="btn-row">
              <button class="style-btn" :class="{ active: inputSource === 'mic' }" @click="switchSource('mic')">🎤 麦克风</button>
              <button class="style-btn" :class="{ active: inputSource === 'file' }" @click="switchSource('file')">🎵 内置音频</button>
            </div>
            <div v-if="inputSource === 'mic'" class="mic-tip" :class="{ err: micError }">
              {{ micError || (micActive ? '✅ 麦克风采集中' : '点「开始」请求授权并开启麦克风') }}
            </div>
            <div v-if="inputSource === 'mic'" class="control-group sub">
              <div class="group-label">麦克风灵敏度（增益）</div>
              <input type="range" class="u-slider" min="0.5" max="3" step="0.1" v-model.number="micGain" @input="audioEngine.setMicGain(micGain)" />
              <div class="u-value">增益 ×<b>{{ micGain.toFixed(1) }}</b></div>
            </div>
          </div>

          <!-- 内置音频播放列表 -->
          <div v-if="inputSource === 'file'" class="control-group">
            <div class="group-label">音频列表（后续可扩充）</div>
            <div class="playlist">
              <button
                v-for="item in config.library"
                :key="item.id"
                class="track-btn"
                :class="{ active: currentEntryId === item.id }"
                @click="selectTrack(item)"
              >
                <span class="track-type">{{ typeLabel(item.type) }}</span>
                <span class="track-name">{{ item.name }}</span>
                <span v-if="currentEntryId === item.id && runState === 'running'" class="eq-icon">♪</span>
              </button>
            </div>
          </div>

          <!-- 视图切换 -->
          <div class="control-group">
            <div class="group-label">显示模式</div>
            <div class="btn-row">
              <button class="style-btn" :class="{ active: viewMode === 'wave' }" @click="viewMode = 'wave'">〰 波形</button>
              <button class="style-btn" :class="{ active: viewMode === 'spectrum' }" @click="viewMode = 'spectrum'">📊 频谱</button>
            </div>
          </div>

          <!-- 冻结 -->
          <div class="control-group">
            <label class="switch-row">
              <input type="checkbox" v-model="frozen" />
              <span>❄ 冻结画面（定格讲解用）</span>
            </label>
          </div>

          <p class="control-hint">💡 点「开始」：麦克风模式将请求授权并采集；音频模式将播放所选音频。波形/频谱实时刷新。</p>
        </div>
      </template>

      <!-- 中间：示波器画布 -->
      <template #canvas>
        <div class="scope-wrap" ref="scopeWrap">
          <canvas ref="scopeCanvas"></canvas>
          <div v-if="runState === 'idle'" class="scope-overlay">等待输入… 点击「开始」</div>
          <div v-if="canvasBadge" class="scope-badge" :class="{ rec: micActive && runState === 'running' }">{{ canvasBadge }}</div>
        </div>
      </template>

      <!-- 右侧：实时数据 -->
      <template #data>
        <div class="sw-data">
          <div class="data-group">
            <div class="group-title">🎛 输入源状态</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">输入源</div>
                <div class="card-value small">{{ sourceText }}</div>
              </div>
              <div class="data-card">
                <div class="card-label">当前内容</div>
                <div class="card-value small">{{ currentText }}</div>
              </div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">📊 实时数据</div>
            <div class="card-list">
              <div class="data-card">
                <div class="card-label">响度（RMS）</div>
                <div class="card-value">{{ levelPct }}<span class="card-unit">%</span></div>
                <div class="level-meter"><div class="meter-fill" :style="{ width: levelPct + '%' }"></div></div>
              </div>
              <div class="data-card">
                <div class="card-label">峰值频率 f</div>
                <div class="card-value">{{ peakFreq ? peakFreq : '—' }}<span v-if="peakFreq" class="card-unit">Hz</span></div>
              </div>
              <div class="data-card">
                <div class="card-label">周期 T = 1/f</div>
                <div class="card-value">{{ periodText }}</div>
              </div>
              <div class="data-card">
                <div class="card-label">波长 λ = v/f（v≈340 m/s）</div>
                <div class="card-value">{{ waveLenText }}</div>
              </div>
            </div>
          </div>

          <div class="data-group">
            <div class="group-title">🔊 频率区间</div>
            <div class="tone-tag">{{ toneDesc }}</div>
          </div>

          <div class="data-group">
            <div class="group-title">💡 观察提示</div>
            <div class="point-list">
              <div class="point-item">波形高度 ↔ 响度（振幅）</div>
              <div class="point-item">波形疏密 ↔ 音调（频率）</div>
              <div class="point-item">波形形状 ↔ 音色（乐器/人声）</div>
              <div v-if="viewMode === 'spectrum'" class="point-item">频谱：乐音呈离散谱线，噪音呈连续谱</div>
            </div>
          </div>
        </div>
      </template>

      <!-- 底部：实验原理 -->
      <template #theory>
        <div class="theory-content">
          <p><strong>实验原理：</strong>{{ config.theory.principle }}</p>
          <div class="formula-block">
            <h4>核心公式</h4>
            <ul>
              <li v-for="(fItem, i) in config.theory.formulas" :key="i">{{ fItem }}</li>
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import ExperimentLayout from '@/layouts/ExperimentLayout.vue'
import { soundWaveConfig } from '@/config/experiments/acoustics/sound-wave.js'
import { audioEngine } from '@/utils/audio/audioEngine.js'

const config = soundWaveConfig

// 调试钩子（便于无头测试/排查，不影响功能）
if (typeof window !== 'undefined') window.__audioEngine = audioEngine

// ========== 交互状态 ==========
const inputSource = ref('mic')      // 输入源：mic 麦克风 | file 内置音频
const viewMode = ref('wave')        // 显示模式：wave 波形 | spectrum 频谱
const frozen = ref(false)           // 冻结画面
const micGain = ref(1)              // 麦克风增益
const micError = ref('')            // 麦克风错误提示
const micActive = ref(false)        // 麦克风是否采集中
const currentEntryId = ref(config.library[0] ? config.library[0].id : null)
const runState = ref('idle')        // idle / running / paused

// ========== 实时数据（约 0.1s 刷新一次） ==========
const levelPct = ref(0)
const peakFreq = ref(0)
const periodText = ref('—')
const waveLenText = ref('—')
const toneDesc = ref('—')

// ========== 画布 ==========
const scopeWrap = ref(null)
const scopeCanvas = ref(null)
let rafId = 0
let lastDataAt = 0

const canvasBadge = computed(() => {
  if (runState.value === 'paused') return '❄ 已冻结'
  if (micActive.value && runState.value === 'running') return '● REC 采集中'
  if (runState.value === 'running' && inputSource.value === 'file') {
    const cur = config.library.find((x) => x.id === currentEntryId.value)
    return cur ? '♪ 播放中：' + cur.name : '♪ 播放中'
  }
  return ''
})

const sourceText = computed(() => {
  if (inputSource.value === 'mic') return '麦克风（实时采集）'
  if (runState.value === 'running' || runState.value === 'paused') return '内置音频'
  return '未启动'
})

const currentText = computed(() => {
  if (inputSource.value === 'mic') return micActive.value ? '采集中…' : '—'
  const cur = config.library.find((x) => x.id === currentEntryId.value)
  return cur ? cur.name : '—'
})

const typeLabel = (t) => ({ song: '歌曲', instrument: '乐器', noise: '噪音' }[t] || '音频')

// ========== 按钮事件 ==========
const handleStart = async () => {
  // 暂停后点击「开始」= 恢复
  if (runState.value === 'paused') {
    await audioEngine.resume()
    runState.value = 'running'
    frozen.value = false
    return
  }
  if (inputSource.value === 'mic') {
    micError.value = ''
    try {
      await audioEngine.startMic()
      micActive.value = true
      runState.value = 'running'
      frozen.value = false
    } catch (e) {
      micActive.value = false
      micError.value = friendlyMicError(e)
      runState.value = 'idle'
    }
  } else {
    const entry = config.library.find((x) => x.id === currentEntryId.value)
    if (!entry) {
      alert('请先在列表中选择一段音频')
      return
    }
    try {
      await audioEngine.playFile(entry)
      runState.value = 'running'
      frozen.value = false
    } catch (e) {
      alert('播放失败：' + e.message)
      runState.value = 'idle'
    }
  }
}

const handlePause = () => {
  if (runState.value !== 'running') return
  audioEngine.pause()
  frozen.value = true
  runState.value = 'paused'
}

const handleReset = () => {
  audioEngine.stop()
  micActive.value = false
  frozen.value = false
  runState.value = 'idle'
  levelPct.value = 0
  peakFreq.value = 0
  periodText.value = '—'
  waveLenText.value = '—'
  toneDesc.value = '—'
}

// 切换输入源：停止当前采集/播放
const switchSource = (m) => {
  if (inputSource.value === m) return
  inputSource.value = m
  audioEngine.stop()
  micActive.value = false
  micError.value = ''
  frozen.value = false
  runState.value = 'idle'
}

// 选择音频条目；运行中则立即切换播放
const selectTrack = async (item) => {
  currentEntryId.value = item.id
  if (inputSource.value === 'file' && runState.value === 'running') {
    audioEngine.stopFile()
    try {
      await audioEngine.playFile(item)
      runState.value = 'running'
      frozen.value = false
    } catch (e) {
      alert('播放失败：' + e.message)
      runState.value = 'idle'
    }
  }
}

const friendlyMicError = (e) => {
  if (e && e.name === 'NotAllowedError') return '❌ 麦克风权限被拒绝：请点击地址栏左侧的权限图标允许后重试，或改用「内置音频」'
  if (e && e.name === 'NotFoundError') return '❌ 未检测到麦克风设备，可改用「内置音频」'
  if (e && e.name === 'NotReadableError') return '❌ 麦克风被其他程序占用，请关闭后重试'
  if (e && e.message) return '❌ ' + e.message
  return '❌ 无法访问麦克风（需 HTTPS 或 localhost 环境）'
}

// ========== 示波器绘制 ==========
const drawFrame = () => {
  rafId = requestAnimationFrame(drawFrame)
  if (frozen.value) return // 冻结：保留最后一帧
  const cv = scopeCanvas.value
  if (!cv) return
  const ctx = cv.getContext('2d')
  const W = cv.width
  const H = cv.height
  if (W === 0 || H === 0) return

  // 背景
  ctx.fillStyle = '#0b1220'
  ctx.fillRect(0, 0, W, H)

  // 网格
  drawGrid(ctx, W, H)

  const active = audioEngine.mode === 'mic' || audioEngine.mode === 'file'
  if (!active) return

  if (viewMode.value === 'wave') drawWaveform(ctx, W, H)
  else drawSpectrum(ctx, W, H)

  // 数据面板节流刷新（约 10Hz）
  const now = performance.now()
  if (now - lastDataAt > 100) {
    lastDataAt = now
    updateData()
  }
  // 歌曲自然播完 → 状态归位
  if (runState.value === 'running' && inputSource.value === 'file' && audioEngine.mode === 'idle') {
    runState.value = 'idle'
  }
}

const drawGrid = (ctx, W, H) => {
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  const step = 40
  ctx.beginPath()
  for (let x = step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H) }
  for (let y = step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y) }
  ctx.stroke()
  // 中线（振幅零点）
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.beginPath()
  ctx.moveTo(0, H / 2)
  ctx.lineTo(W, H / 2)
  ctx.stroke()
}

const drawWaveform = (ctx, W, H) => {
  const data = audioEngine.getWaveform()
  if (!data) return
  const midY = H / 2
  const step = Math.max(1, Math.floor(data.length / W))
  ctx.save()
  ctx.strokeStyle = '#00e5ff'
  ctx.lineWidth = 2
  ctx.shadowColor = 'rgba(0,229,255,0.55)'
  ctx.shadowBlur = 8
  ctx.beginPath()
  for (let x = 0; x < W; x++) {
    const idx = Math.min(data.length - 1, x * step)
    const y = midY - data[idx] * (H * 0.42)
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.restore()
}

const drawSpectrum = (ctx, W, H) => {
  const data = audioEngine.getSpectrum()
  if (!data) return
  const BAR_N = 96
  const barW = W / BAR_N
  const peakIdx = peakFreq.value > 0 ? Math.round((peakFreq.value * data.length * 2) / (audioEngine.ctx.sampleRate || 48000)) : -1
  for (let i = 0; i < BAR_N; i++) {
    // 每组取最大值（1024 bin → 96 条）
    const from = Math.floor((i / BAR_N) * data.length)
    const to = Math.floor(((i + 1) / BAR_N) * data.length)
    let max = 0
    for (let j = from; j < to; j++) if (data[j] > max) max = data[j]
    const h = (max / 255) * H * 0.9
    const x = i * barW + 1
    const grad = ctx.createLinearGradient(0, H, 0, H - h)
    grad.addColorStop(0, i === peakIdx ? '#ffd21f' : '#00e5ff')
    grad.addColorStop(1, i === peakIdx ? '#ff8c42' : '#3d6bff')
    ctx.fillStyle = grad
    ctx.fillRect(x, H - h, Math.max(1, barW - 2), h)
  }
  // 频率刻度
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  const sr = audioEngine.ctx ? audioEngine.ctx.sampleRate : 48000
  ctx.fillText('0', 4, H - 6)
  ctx.fillText(Math.round(sr / 4) + ' Hz', W * 0.25 - 24, H - 6)
  ctx.fillText(Math.round(sr / 2) + ' Hz', W * 0.5 - 24, H - 6)
  ctx.fillText(Math.round((sr * 3) / 4) + ' Hz', W * 0.75 - 24, H - 6)
  ctx.fillText(Math.round(sr / 2) + ' Hz', W - 44, H - 6)
}

const updateData = () => {
  levelPct.value = Math.round(audioEngine.getLevel() * 100)
  const f = audioEngine.getPeakFreq()
  peakFreq.value = f
  if (f > 0) {
    periodText.value = (1000 / f).toFixed(2) + ' ms'
    waveLenText.value = (340 / f).toFixed(2) + ' m'
    toneDesc.value = describeTone(f)
  } else {
    periodText.value = '—'
    waveLenText.value = '—'
    toneDesc.value = '—'
  }
}

const describeTone = (f) => {
  if (f < 20) return '🔻 次声波（< 20 Hz，人耳听不见）'
  if (f < 200) return '🔉 低频（20–200 Hz，声音低沉）'
  if (f <= 2000) return '🔊 中频（200–2000 Hz，人声/乐音主要区）'
  if (f <= 20000) return '🔺 高频（2000–20000 Hz，声音尖亮）'
  return '🔺 超声波（> 20000 Hz，人耳听不见）'
}

// ========== 画布尺寸自适应（含 DPR 高清） ==========
let resizeObs = null
const resizeCanvas = () => {
  const wrap = scopeWrap.value
  const cv = scopeCanvas.value
  if (!wrap || !cv) return
  const dpr = window.devicePixelRatio || 1
  const w = wrap.clientWidth
  const h = wrap.clientHeight
  if (w === 0 || h === 0) return
  cv.width = Math.round(w * dpr)
  cv.height = Math.round(h * dpr)
  cv.style.width = w + 'px'
  cv.style.height = h + 'px'
}

// 输入源切换时若处于运行状态，先停止（由 switchSource 处理）
watch(viewMode, () => { /* 视图即时生效，无需额外处理 */ })

onMounted(() => {
  resizeCanvas()
  resizeObs = new ResizeObserver(resizeCanvas)
  if (scopeWrap.value) resizeObs.observe(scopeWrap.value)
  rafId = requestAnimationFrame(drawFrame)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  if (resizeObs) resizeObs.disconnect()
  audioEngine.stop()
})
</script>

<style lang="scss" scoped>
.sound-wave-experiment {
  width: 100%;
  height: 100%;
}

/* ========== 左栏控制 ========== */
.control-tip {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
  margin-bottom: 12px;
}

.control-group {
  margin-bottom: 14px;
}

.control-group.sub {
  margin-top: 10px;
  padding-left: 10px;
  border-left: 2px solid rgba(255, 255, 255, 0.12);
}

.group-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 8px;
}

.btn-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.style-btn {
  flex: 1;
  padding: 7px 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;

  &:hover {
    border-color: $color-tech-blue;
  }

  &.active {
    background: $color-tech-blue;
    border-color: $color-tech-blue;
    color: #fff;
  }
}

.u-slider {
  width: 100%;
  accent-color: $color-tech-blue;
  cursor: pointer;
}

.u-value {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;

  b {
    color: $color-accent;
  }
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  margin-bottom: 6px;

  input {
    accent-color: $color-tech-blue;
    cursor: pointer;
  }
}

.mic-tip {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: $color-success;
  background: rgba(82, 196, 26, 0.1);
  border: 1px solid rgba(82, 196, 26, 0.3);
  border-radius: 8px;
  padding: 6px 10px;

  &.err {
    color: #ff7875;
    background: rgba(255, 77, 79, 0.1);
    border-color: rgba(255, 77, 79, 0.35);
  }
}

.playlist {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.track-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  text-align: left;

  &:hover {
    border-color: $color-tech-blue;
  }

  &.active {
    border-color: $color-tech-blue;
    background: rgba(74, 144, 226, 0.18);
  }
}

.track-type {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

.track-name {
  flex: 1;
}

.eq-icon {
  color: $color-tech-blue;
  animation: eq-blink 1s infinite;
}

@keyframes eq-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}

.control-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  margin-top: 10px;
}

/* ========== 示波器画布 ========== */
.scope-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 380px;
  border-radius: 10px;
  overflow: hidden;
  background: #0b1220;
  border: 1px solid rgba(0, 229, 255, 0.25);
  box-shadow: inset 0 0 40px rgba(0, 229, 255, 0.06);
}

.scope-wrap canvas {
  display: block;
}

.scope-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
  letter-spacing: 2px;
}

.scope-badge {
  position: absolute;
  top: 10px;
  left: 12px;
  font-size: 12px;
  color: rgba(0, 229, 255, 0.9);
  background: rgba(0, 229, 255, 0.1);
  border: 1px solid rgba(0, 229, 255, 0.3);
  border-radius: 10px;
  padding: 2px 10px;
  pointer-events: none;

  &.rec {
    color: #ff4d4f;
    background: rgba(255, 77, 79, 0.1);
    border-color: rgba(255, 77, 79, 0.35);
  }
}

/* ========== 右栏数据 ========== */
.data-group {
  margin-bottom: 14px;
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  color: $color-accent;
  margin-bottom: 8px;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-card {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 8px 12px;
}

.card-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2px;
}

.card-value {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  font-family: Consolas, monospace;

  &.small {
    font-size: 14px;
    font-family: inherit;
    font-weight: 500;
  }
}

.card-unit {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
  margin-left: 2px;
}

.level-meter {
  margin-top: 6px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #52c41a, #ffd21f, #ff4d4f);
  transition: width 0.1s linear;
}

.tone-tag {
  font-size: 13px;
  color: #fff;
  background: rgba(74, 144, 226, 0.15);
  border: 1px solid rgba(74, 144, 226, 0.35);
  border-radius: 8px;
  padding: 8px 10px;
  line-height: 1.5;
}

.point-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.point-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
  padding-left: 10px;
  position: relative;

  &::before {
    content: '·';
    position: absolute;
    left: 2px;
    color: $color-tech-blue;
  }
}

/* ========== 底部原理 ========== */
.theory-content {
  p {
    margin-bottom: 8px;
  }

  .formula-block,
  .keypoint-block {
    margin: 10px 0;

    h4 {
      font-size: 14px;
      color: $color-primary;
      margin-bottom: 6px;
    }

    ul {
      padding-left: 20px;

      li {
        font-size: 13px;
        line-height: 1.8;
      }
    }
  }

  .notes {
    font-size: 13px;
    color: $color-text-muted;
  }
}
</style>
