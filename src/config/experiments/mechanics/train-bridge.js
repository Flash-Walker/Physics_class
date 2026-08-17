// ==========================================
// 火车过桥问题 - 实验配置
// 核心模型：桥头 x=0，桥尾 x=bridgeLength
// 火车从桥头左侧驶来，车尾完全离开桥尾即"完全过桥"
// ==========================================

export const trainBridgeConfig = {
  meta: {
    id: 'train-bridge',
    name: '火车过桥问题',
    chapter: 'mechanics',
    difficulty: '基础',
    description: '模拟火车通过桥梁的全过程，理解"完全过桥"与"完全在桥上"的路程计算',
    keywords: ['运动学', '匀速直线运动', '匀变速', '路程', '过桥']
  },

  controls: [
    {
      group: '火车参数',
      fields: [
        { key: 'trainLength', label: '火车长度', type: 'slider', unit: 'm', default: 50, min: 10, max: 100, step: 5, precision: 0 },
        { key: 'initialVelocity', label: '初速度', type: 'slider', unit: 'm/s', default: 10, min: 1, max: 30, step: 1, precision: 0 }
      ]
    },
    {
      group: '桥梁参数',
      fields: [
        { key: 'bridgeLength', label: '桥长', type: 'slider', unit: 'm', default: 100, min: 20, max: 200, step: 5, precision: 0 }
      ]
    },
    {
      group: '运动参数',
      fields: [
        { key: 'acceleration', label: '加速度', type: 'slider', unit: 'm/s²', default: 0, min: -2, max: 2, step: 0.1, precision: 1 }
      ]
    }
  ],

  dataFields: [
    {
      group: '核心数据',
      display: 'card',
      fields: [
        { key: 'totalTime', label: '运行时间', unit: 's', precision: 2 },
        { key: 'stage', label: '当前阶段', unit: '', precision: 0 },
        { key: 'tailPosition', label: '车尾位置', unit: 'm', precision: 2, highlight: true }
      ]
    },
    {
      group: '火车实时状态',
      display: 'table',
      fields: [
        { key: 'position', label: '车头位置', unit: 'm', precision: 2 },
        { key: 'tailPosition', label: '车尾位置', unit: 'm', precision: 2 },
        { key: 'distanceTraveled', label: '路程', unit: 'm', precision: 2 },
        { key: 'velocity', label: '速度', unit: 'm/s', precision: 2 },
        { key: 'acceleration', label: '加速度', unit: 'm/s²', precision: 2, advanced: true }
      ]
    },
    {
      group: '路程-时间图像',
      display: 'chart',
      xAxis: 'time',
      yAxis: ['distanceTraveled'],
      unit: 'm'
    }
  ],

  theory: {
    principle: '火车过桥问题的关键在于：火车有长度，不能当作质点。判断"完全过桥"要看车尾是否离开桥尾，此时火车实际行驶的路程等于桥长与车长之和。',
    formulas: [
      '完全过桥：路程 s = L桥 + L车',
      '完全在桥上：路程 s = L桥 - L车',
      '匀速直线运动：s = vt，即 t = s / v',
      '匀变速直线运动：s = v₀t + ½at²'
    ],
    keyPoints: [
      '车头到达桥头 = 开始上桥；车头离开桥尾 ≠ 完全过桥',
      '车尾离开桥尾才算完全过桥，路程 = 桥长 + 车长',
      '火车完全在桥上时，路程 = 桥长 - 车长（车头已过桥尾、车尾已过桥头）',
      '画示意图时先画桥、再画火车，标出车头车尾位置是解题关键'
    ],
    notes: '本模拟将火车视为刚体（长度不变），忽略空气阻力与铁轨摩擦。'
  }
}
