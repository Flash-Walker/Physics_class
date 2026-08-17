import meeting from './mechanics/meeting.js'
import buoyancy from './mechanics/buoyancy.js'

export const experimentConfigs = {
  'mechanics/meeting': meeting,
  'mechanics/buoyancy': buoyancy
  // 后续逐个添加
}

export function getExperimentConfig(chapterId, expId) {
  return experimentConfigs[`${chapterId}/${expId}`] || null
}
