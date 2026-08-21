import { meetingConfig } from './experiments/mechanics/meeting.js'
import { trainBridgeConfig } from './experiments/mechanics/train-bridge.js'
import { forceCompositionConfig } from './experiments/mechanics/force-composition.js'
import { leverConfig } from './experiments/mechanics/lever.js'
import { pulleyConfig } from './experiments/mechanics/pulley.js'
import { buoyancyConfig } from './experiments/mechanics/buoyancy.js'
import { efficiencyConfig } from './experiments/mechanics/efficiency.js'
import { straightLineConfig } from './experiments/optics/straight-line.js'
import { reflectionConfig } from './experiments/optics/reflection.js'
import { mirrorConfig } from './experiments/optics/mirror.js'
import { refractionConfig } from './experiments/optics/refraction.js'
import { convexLensConfig } from './experiments/optics/convex-lens.js'
import { dispersionConfig } from './experiments/optics/dispersion.js'
import { soundWaveConfig } from './experiments/acoustics/sound-wave.js'

export const experimentConfigs = {
  'mechanics/meeting': meetingConfig,
  'mechanics/train-bridge': trainBridgeConfig,
  'mechanics/force-composition': forceCompositionConfig,
  'mechanics/lever': leverConfig,
  'mechanics/pulley': pulleyConfig,
  'mechanics/buoyancy': buoyancyConfig,
  'mechanics/efficiency': efficiencyConfig,
  // 光学实验
  'optics/straight-line': straightLineConfig,
  'optics/reflection': reflectionConfig,
  'optics/mirror': mirrorConfig,
  'optics/refraction': refractionConfig,
  'optics/convex-lens': convexLensConfig,
  'optics/dispersion': dispersionConfig,
  // 声学实验
  'acoustics/sound-wave': soundWaveConfig
  // 后续实验逐个添加，例如：
  // 'mechanics/buoyancy': buoyancyConfig
}

export function getExperimentConfig(chapterId, expId) {
  return experimentConfigs[`${chapterId}/${expId}`] || null
}
