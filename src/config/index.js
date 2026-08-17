import { meetingConfig } from './experiments/mechanics/meeting.js'

export const experimentConfigs = {
  'mechanics/meeting': meetingConfig
  // 后续实验逐个添加，例如：
  // 'mechanics/buoyancy': buoyancyConfig
}

export function getExperimentConfig(chapterId, expId) {
  return experimentConfigs[`${chapterId}/${expId}`] || null
}
