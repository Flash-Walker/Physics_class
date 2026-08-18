import { meetingConfig } from './experiments/mechanics/meeting.js'
import { trainBridgeConfig } from './experiments/mechanics/train-bridge.js'
import { forceCompositionConfig } from './experiments/mechanics/force-composition.js'

export const experimentConfigs = {
  'mechanics/meeting': meetingConfig,
  'mechanics/train-bridge': trainBridgeConfig,
  'mechanics/force-composition': forceCompositionConfig
  // 后续实验逐个添加，例如：
  // 'mechanics/buoyancy': buoyancyConfig
}

export function getExperimentConfig(chapterId, expId) {
  return experimentConfigs[`${chapterId}/${expId}`] || null
}
