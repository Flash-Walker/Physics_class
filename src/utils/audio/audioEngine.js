// ==========================================
// 音频引擎（声学实验共用）
// 统一管线：输入源（麦克风 / 音频文件 / 程序生成噪音）
//          → AudioContext → AnalyserNode → 波形/频谱数据
// 对外提供：时域波形、频域频谱、响度(RMS)、峰值频率
// ==========================================

class AudioEngine {
  constructor() {
    this.ctx = null
    this.analyser = null
    this.masterGain = null

    // 麦克风链路
    this.micStream = null
    this.micSource = null
    this.micGain = null

    // 文件/噪音播放
    this.activeSource = null    // AudioBufferSourceNode（文件与生成噪音统一用 buffer source）
    this.currentEntry = null    // 当前播放条目
    this._startedAt = 0         // 本次播放起始时间（用于暂停续播）
    this._resumeOffset = 0      // 暂停时的播放偏移（秒）

    // 状态：'idle' | 'mic' | 'file' | 'paused'
    this.mode = 'idle'
    this.fftSize = 2048
    this._levelSmooth = 0
  }

  // ---------- 初始化 ----------
  // 懒创建 AudioContext（必须在用户手势中调用，否则会被浏览器挂起）
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return this.ctx
    }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) throw new Error('当前浏览器不支持 Web Audio API')
    this.ctx = new Ctx()
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = this.fftSize
    this.analyser.smoothingTimeConstant = 0.75
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 1
    this.analyser.connect(this.masterGain)
    this.masterGain.connect(this.ctx.destination)
    return this.ctx
  }

  // ---------- 麦克风 ----------
  // 请求麦克风权限并接入分析器；失败抛出 DOMException（由组件层转成友好提示）
  async startMic() {
    this.ensure()
    this.stopFile()
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('当前环境不支持麦克风采集（需 HTTPS 或 localhost）')
    }
    // 关闭降噪/回声消除/自动增益，保留原始波形（教学更真实）
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    })
    this.stopMic()
    this.micStream = stream
    this.micSource = this.ctx.createMediaStreamSource(stream)
    this.micGain = this.ctx.createGain()
    this.micGain.gain.value = 1
    this.micSource.connect(this.micGain)
    this.micGain.connect(this.analyser)
    this.mode = 'mic'
    return true
  }

  stopMic() {
    if (this.micSource) { try { this.micSource.disconnect() } catch (e) { /* noop */ } this.micSource = null }
    if (this.micGain) { try { this.micGain.disconnect() } catch (e) { /* noop */ } this.micGain = null }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop())
      this.micStream = null
    }
    if (this.mode === 'mic') this.mode = 'idle'
  }

  setMicGain(v) {
    if (this.micGain) this.micGain.gain.value = v
  }

  // ---------- 文件 / 生成噪音 ----------
  // entry: { id, name, file? | generator?, type, loop }
  // 统一用 decodeAudioData + AudioBufferSourceNode（无 DOM 依赖，暂停/续播可控）
  async playFile(entry) {
    this.ensure()
    this.stopFile()
    this.stopMic()
    this._resumeOffset = 0
    await this._spawnSource(entry, 0)
    this.mode = 'file'
    return true
  }

  // 创建播放源（playFile 与 resume 共用）
  async _spawnSource(entry, offsetSec) {
    let buffer
    if (entry.generator) {
      // 程序生成噪音（白/粉），无需音频文件
      buffer = this.generateNoise(entry.generator)
    } else {
      const base = import.meta.env.BASE_URL || '/'
      const resp = await fetch(base + entry.file)
      if (!resp.ok) throw new Error('音频加载失败：' + entry.file)
      const arr = await resp.arrayBuffer()
      buffer = await this.ctx.decodeAudioData(arr)
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = !!entry.loop
    src.connect(this.analyser)
    src.start(0, offsetSec)
    this.activeSource = src
    this.currentEntry = entry
    this._startedAt = this.ctx.currentTime - offsetSec
    src.onended = () => {
      if (this.activeSource === src) {
        this.activeSource = null
        if (this.mode === 'file') this.mode = 'idle' // 歌曲自然播完
      }
    }
  }

  stopFile() {
    if (this.activeSource) {
      this.activeSource.onended = null
      try { this.activeSource.stop() } catch (e) { /* noop */ }
      this.activeSource = null
    }
    this._resumeOffset = 0
    if (this.mode === 'file' || this.mode === 'paused') this.mode = 'idle'
    this.currentEntry = null
  }

  // ---------- 暂停 / 恢复 / 停止 ----------
  pause() {
    if (this.mode === 'file' && this.activeSource) {
      // 非循环音源记录续播偏移（循环音源如噪音直接从 0 恢复即可）
      if (!this.activeSource.loop) {
        this._resumeOffset = this.ctx.currentTime - this._startedAt
      }
      this.activeSource.onended = null
      try { this.activeSource.stop() } catch (e) { /* noop */ }
      this.activeSource = null
      this.mode = 'paused'
    } else if (this.mode === 'mic') {
      this.mode = 'paused' // 麦克风保持采集，由组件层冻结画面
    }
  }

  async resume() {
    if (this.mode !== 'paused') return
    if (this.currentEntry) {
      const entry = this.currentEntry
      const off = this._resumeOffset || 0
      this._resumeOffset = 0
      await this._spawnSource(entry, off)
      this.mode = 'file'
    } else if (this.micStream) {
      this.mode = 'mic'
    }
  }

  stop() {
    this.stopFile()
    this.stopMic()
    this.mode = 'idle'
  }

  // ---------- 噪音生成 ----------
  generateNoise(type) {
    const seconds = 2
    const len = Math.floor(this.ctx.sampleRate * seconds)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    if (type === 'white') {
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    } else {
      // Paul Kellet 粉噪音近似
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852
        b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.016898
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
        b6 = w * 0.115926
      }
    }
    return buf
  }

  // ---------- 数据读取（每帧调用） ----------
  getWaveform() {
    if (!this.analyser) return null
    const arr = new Float32Array(this.analyser.fftSize)
    this.analyser.getFloatTimeDomainData(arr)
    return arr
  }

  getSpectrum() {
    if (!this.analyser) return null
    const arr = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(arr)
    return arr
  }

  // 响度（RMS，峰值保持平滑），返回 0~1
  getLevel() {
    const w = this.getWaveform()
    if (!w) return 0
    let sum = 0
    for (let i = 0; i < w.length; i++) sum += w[i] * w[i]
    const rms = Math.sqrt(sum / w.length)
    this._levelSmooth = Math.max(rms, this._levelSmooth * 0.9)
    return Math.min(1, this._levelSmooth * 1.8)
  }

  // 频谱峰值频率（Hz），无有效信号返回 0
  getPeakFreq() {
    const s = this.getSpectrum()
    if (!s || !this.ctx) return 0
    let max = 0
    let idx = 0
    for (let i = 1; i < s.length; i++) {
      if (s[i] > max) { max = s[i]; idx = i }
    }
    if (max < 8) return 0
    return Math.round((idx * this.ctx.sampleRate) / this.analyser.fftSize)
  }
}

export const audioEngine = new AudioEngine()
