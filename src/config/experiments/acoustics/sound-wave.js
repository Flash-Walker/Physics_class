// ==========================================
// 声音的波形与频谱 - 实验配置
// ==========================================

// 内置音频库（扩展方法：把音频文件放入 public/audio/ 后，在 library 里加一行即可）
// type: 'song' 歌曲 | 'instrument' 乐器 | 'noise' 噪音
// generator: 'white' 白噪音 | 'pink' 粉噪音 —— 程序生成，无需文件
export const soundWaveConfig = {
  meta: {
    id: 'sound-wave',
    name: '声音的波形与频谱',
    chapter: 'acoustics',
    difficulty: '基础',
    description: '用麦克风发声或播放内置音频，实时观察声音的波形与频谱',
    keywords: ['声学', '波形', '频谱', '响度', '音调', '音色', '示波器', 'FFT']
  },

  // ========== 内置音频播放列表 ==========
  library: [
    { id: 'test', name: '测试音频（占位）', file: 'audio/testAudio.mp3', type: 'song', loop: false },
    // —— 后续音频扩展示例（放入 public/audio/ 后取消注释即可）——
    // { id: 'song-1', name: '歌曲片段一', file: 'audio/song-1.mp3', type: 'song', loop: false },
    // { id: 'piano', name: '钢琴音色', file: 'audio/piano.mp3', type: 'instrument', loop: false },
    // { id: 'guitar', name: '吉他音色', file: 'audio/guitar.mp3', type: 'instrument', loop: false },
    { id: 'white', name: '白噪音（程序生成）', generator: 'white', type: 'noise', loop: true },
    { id: 'pink', name: '粉噪音（程序生成）', generator: 'pink', type: 'noise', loop: true }
  ],

  theory: {
    principle: '声音由物体振动产生，以声波的形式传播。示波器把声音信号随时间的变化显示出来：横轴是时间，纵轴是振幅。响度由振幅决定，音调由频率决定，音色由波形（谐波成分）决定。频谱（FFT 变换）则显示声音在各个频率上的能量分布：乐音呈离散的谱线，噪音呈连续的谱。',
    formulas: [
      '频率与周期：f = 1 / T（T 为周期，单位 s）',
      '波长：λ = v / f（空气中声速 v ≈ 340 m/s）',
      '响度 ∝ 振幅的平方（RMS 有效值）'
    ],
    keyPoints: [
      '人耳能听到的频率范围约 20 ~ 20000 Hz；低于 20 Hz 为次声波，高于 20000 Hz 为超声波',
      '音调高 → 频率大 → 波形密集；音调低 → 频率小 → 波形稀疏',
      '响度大 → 振幅大 → 波形高；响度小 → 振幅小 → 波形矮',
      '音色不同 → 波形形状不同（泛音/谐波成分不同），同一音调的声音也能听出不同乐器',
      '频谱图：乐音是几根离散谱线（基频 + 泛音），噪音是连续一片',
      '白噪音：所有频率能量均匀；粉噪音：低频能量更足，听起来更"闷"'
    ],
    notes: '本实验支持两种输入：① 麦克风实时采集（需要浏览器授权，请点击"允许"）；② 内置音频播放（白噪音/粉噪音由程序生成，无需文件）。切换"波形/频谱"视图观察差异，可点"冻结"定格画面便于讲解。'
  }
}
