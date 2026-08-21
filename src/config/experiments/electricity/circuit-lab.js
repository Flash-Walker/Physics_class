// 电学实验配置：电路搭建与欧姆定律（自由搭建虚拟电学实验室）
export const circuitLabConfig = {
  meta: {
    id: 'circuit-lab',
    name: '电路搭建与欧姆定律',
    chapter: 'electricity',
    difficulty: '进阶',
    description: '自由搭建电路：电池、灯泡、电阻、滑动变阻器、电压表、电流表与开关，连接导线后验证欧姆定律与串并联规律',
    keywords: ['电路', '欧姆定律', '串联', '并联', '电压表', '电流表', '滑动变阻器', '短路']
  },
  theory: {
    principle:
      '电路由电源、用电器、开关和导线组成。本实验提供可自由摆放与接线的元件，搭建任意电路后由求解器按基尔霍夫定律计算各元件电流与电压，灯泡亮度、电表读数随电路状态实时变化。',
    formulas: [
      { name: '欧姆定律', expr: 'I = U / R' },
      { name: '串联电路', expr: 'I 相同，U = U₁ + U₂，R = R₁ + R₂' },
      { name: '并联电路', expr: 'U 相同，I = I₁ + I₂，1/R = 1/R₁ + 1/R₂' },
      { name: '电功率', expr: 'P = UI = I²R = U²/R' }
    ],
    keyPoints: [
      '电压表必须与被测元件并联，电流表必须串联接入电路',
      '电流表不能直接并联在电源两端（相当于短路，会烧毁电表）',
      '选用量程时先估测，读数超过量程会损坏电表',
      '滑动变阻器接线"一上一下"，滑片位置决定接入阻值',
      '灯泡两端电压超过额定电压会烧毁（超亮后损坏）'
    ],
    notes: [
      '灯泡电阻视为恒定（不随温度变化），由额定电压与额定电流决定：R = U额/I额',
      '电压表内阻视为 10MΩ，电流表内阻视为 0.01Ω（理想电表近似）',
      '电池盒未装电池时相当于断路',
      '点击「提交电路」后电路生效，之后调整开关与滑动变阻器会实时重新计算'
    ]
  },
  defaults: {
    batteryVoltages: [1.5, 3, 9],
    batteryBoxCells: [1, 2, 4],
    bulb: { ratedV: 2.5, ratedI: 0.3 },
    bulbVRange: [0.5, 6],
    bulbIRange: [0.05, 1],
    resistor: { min: 1, max: 9999, def: 10 },
    rheostat: { min: 1, max: 10000, def: 20 },
    voltmeterRanges: [3, 15],
    ammeterRanges: [0.6, 3]
  }
}
