import { meetingConfig } from './experiments/mechanics/meeting.js'
import { trainBridgeConfig } from './experiments/mechanics/train-bridge.js'
import { forceCompositionConfig } from './experiments/mechanics/force-composition.js'
import { leverConfig } from './experiments/mechanics/lever.js'
import { pulleyConfig } from './experiments/mechanics/pulley.js'
import { buoyancyConfig } from './experiments/mechanics/buoyancy.js'
import { efficiencyConfig } from './experiments/mechanics/efficiency.js'

export const experimentConfigs = {
  'mechanics/meeting': meetingConfig,
  'mechanics/train-bridge': trainBridgeConfig,
  'mechanics/force-composition': forceCompositionConfig,
  'mechanics/lever': leverConfig,
  'mechanics/pulley': pulleyConfig,
  'mechanics/buoyancy': buoyancyConfig,
  'mechanics/efficiency': efficiencyConfig
  // 后续实验逐个添加，例如：
  // 'mechanics/buoyancy': buoyancyConfig
}

export function getExperimentConfig(chapterId, expId) {
  return experimentConfigs[`${chapterId}/${expId}`] || null
}
