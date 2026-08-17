export const meetingConfig = {
  meta: {
    id: 'meeting',
    name: '相遇问题',
    chapter: 'mechanics',
    difficulty: '基础',
    description: '模拟直道与环形跑道下两物体的运动过程，观察相遇条件与相遇时刻',
    keywords: ['运动学', '匀速直线运动', '匀变速', '相遇']
  },

  controls: [
    {
      group: '物体甲（红色）',
      fields: [
        { key: 'vA', label: '初速度', type: 'slider', unit: 'm/s', default: 3, min: 0, max: 15, step: 0.1, precision: 1 },
        { key: 'aA', label: '加速度', type: 'slider', unit: 'm/s²', default: 0, min: -5, max: 5, step: 0.1, precision: 1, advanced: true },
        { key: 'posA', label: '起始位置', type: 'slider', unit: 'm', default: 0, min: 0, max: 100, step: 1, precision: 0 }
      ]
    },
    {
      group: '物体乙（蓝色）',
      fields: [
        { key: 'vB', label: '初速度', type: 'slider', unit: 'm/s', default: -2, min: -15, max: 0, step: 0.1, precision: 1 },
        { key: 'aB', label: '加速度', type: 'slider', unit: 'm/s²', default: 0, min: -5, max: 5, step: 0.1, precision: 1, advanced: true },
        { key: 'posB', label: '起始位置', type: 'slider', unit: 'm', default: 100, min: 0, max: 100, step: 1, precision: 0 }
      ]
    },
    {
      group: '场景设置',
      fields: [
        {
          key: 'trackType',
          label: '跑道类型',
          type: 'select',
          default: 'straight',
          options: [
            { value: 'straight', label: '直线跑道' },
            { value: 'ring', label: '环形跑道' }
          ]
        },
        { key: 'trackLength', label: '跑道长度', type: 'slider', unit: 'm', default: 100, min: 20, max: 400, step: 10, precision: 0 }
      ]
    }
  ],

  dataFields: [
    {
      group: '核心数据',
      display: 'card',
      fields: [
        { key: 'totalTime', label: '运行时间', unit: 's', precision: 2 },
        { key: 'distance', label: '两物体间距', unit: 'm', precision: 2, highlight: true },
        { key: 'meetCount', label: '相遇次数', unit: '次', precision: 0 }
      ]
    },
    {
      group: '物体实时状态',
      display: 'table',
      fields: [
        { key: 'position', label: '位置', unit: 'm', precision: 2 },
        { key: 'velocity', label: '速度', unit: 'm/s', precision: 2 },
        { key: 'acceleration', label: '加速度', unit: 'm/s²', precision: 2, advanced: true }
      ]
    },
    {
      group: '位移-时间图像',
      display: 'chart',
      xAxis: 'time',
      yAxis: ['position'],
      unit: 'm'
    }
  ],

  theory: {
    principle: '两个物体沿同一路径运动，当它们的位置相同时即发生相遇。相遇问题的核心是求解满足位置相等的时刻。',
    formulas: [
      '匀速直线运动位移：s = s₀ + vt',
      '匀变速直线运动位移：s = s₀ + v₀t + ½at²',
      '相遇条件：s₁(t) = s₂(t)'
    ],
    keyPoints: [
      '直道相向而行：相遇时间 = 初始距离 / 速度和',
      '环形跑道同向追及：每相遇一次，路程差增加一圈',
      '加速度为零时，退化为匀速直线运动模型'
    ],
    notes: '本模拟将物体视为质点，忽略空气阻力与物体尺寸。'
  }
}
