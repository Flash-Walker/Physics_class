// 光学引擎自测脚本（node 直接运行）
import {
  refractionAngle, criticalAngleDeg, mirrorImagePoint, reflectVector, reflectionAngle,
  lensImageDistance, lensMagnification, classifyLensImage, lensImageHeight,
  pinholeImageHeight, raySegmentIntersection, normalizeAngle, lensFocalFromUV
} from '../src/utils/physics/physicsUtils.js'
import { OpticsEngine } from '../src/utils/physics/PhysicsEngine.js'

let pass = 0, fail = 0
function assert(name, actual, expected, tol = 1e-6) {
  let ok
  if (expected === Infinity || expected === -Infinity) {
    ok = actual === expected
  } else if (Array.isArray(expected)) {
    ok = expected.length === actual.length && expected.every((v, i) => Math.abs(v - actual[i]) < tol)
  } else if (typeof expected === 'number') {
    ok = Math.abs(actual - expected) < tol
  } else {
    ok = JSON.stringify(actual) === JSON.stringify(expected)
  }
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name}: 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`) }
}

console.log('=== 模块9：几何光学 自测 ===')

// 折射：空气→水 45° 入射
assert('空气→水 45° 折射角≈32.1°', refractionAngle(1, 1.33, 45), 32.117, 0.01)
// 折射：水→空气（光密→光疏，折射角>入射角）
assert('水→空气 32° 折射角≈44.8°', refractionAngle(1.33, 1, 32), 44.815, 0.01)
// 全反射：水→空气 60° > 临界角
assert('水→空气 60° 全反射返回 null', refractionAngle(1.33, 1, 60), null)
// 临界角
assert('水→空气临界角≈48.75°', criticalAngleDeg(1.33, 1), 48.753, 0.01)
assert('空气→水无临界角', criticalAngleDeg(1, 1.33), null)

// 平面镜成像：竖直镜面 x=0，物点(2,3) → 像点(-2,3)
const img = mirrorImagePoint(2, 3, 0, 0, 90)
assert('竖直平面镜像点对称', [img.x, img.y], [-2, 3], 1e-9)
// 水平镜面 y=0（方向角0°），物点(2,3) → 像点(2,-3)
const img2 = mirrorImagePoint(2, 3, 0, 0, 0)
assert('水平平面镜像点对称', [img2.x, img2.y], [2, -3], 1e-9)
// 反射定律
assert('反射角=入射角', reflectionAngle(45), 45)
// reflectVector：水平镜面，入射(0.707,-0.707) → 反射(0.707,0.707)
const rv = reflectVector(0.70710678, -0.70710678, 0, 1)
assert('向量反射(法线向上)', [rv.x, rv.y], [0.70710678, 0.70710678], 1e-6)

// 凸透镜 f=10
assert('u=30 像距=15', lensImageDistance(10, 30), 15)
assert('u=20 像距=20', lensImageDistance(10, 20), 20)
assert('u=15 像距=30', lensImageDistance(10, 15), 30)
assert('u=10 不成像(Infinity)', lensImageDistance(10, 10), Infinity)
assert('u=5 虚像像距=-10', lensImageDistance(10, 5), -10)
assert('u=30 放大率 0.5', lensMagnification(10, 30), 0.5)
assert('u=5 放大率 2', lensMagnification(10, 5), 2)
assert('u=30 分类=照相机', classifyLensImage(10, 30).application, '照相机')
assert('u=20 分类=等大实像', classifyLensImage(10, 20).type + classifyLensImage(10, 20).size, 'realsame')
assert('u=15 分类=投影仪', classifyLensImage(10, 15).application, '投影仪/幻灯机')
assert('u=10 分类=不成像', classifyLensImage(10, 10).type, 'none')
assert('u=5 分类=放大镜(正立虚像)', classifyLensImage(10, 5).application, '放大镜')
assert('u=30 像高=-2(倒立缩小)', lensImageHeight(4, 10, 30), -2)
assert('u=15 像高=8(倒立放大)', lensImageHeight(4, 10, 15), -8)
assert('u=5 像高=8(正立放大)', lensImageHeight(4, 10, 5), 8)
assert('u=30,v=15 焦距=10', lensFocalFromUV(30, 15), 10)

// 小孔成像
assert('小孔成像像高', pinholeImageHeight(2, 1, 0.5), 1)

// 光线求交
const hit = raySegmentIntersection(0, 5, -90, { x: -10, y: 0 }, { x: 10, y: 0 })
assert('竖直下落光线与水平线段交点', [hit.x, hit.y], [0, 0], 1e-9)
assert('角度归一化', normalizeAngle(370), 10)
assert('角度归一化负值', normalizeAngle(-370), -10)

console.log('=== OpticsEngine 自测 ===')
const eng = new OpticsEngine()
eng.addObstacle({ id: 'mirror', type: 'mirror', p1: { x: -10, y: 0 }, p2: { x: 10, y: 0 } }) // 水平镜面
const inRay = eng.addRay({ id: 'in', origin: { x: -5, y: 5 }, angleDeg: -45 }) // 右下入射
const h = eng.traceRay(inRay)
assert('入射光线命中镜面', h && Math.abs(h.point.y) < 1e-9, true)
const refl = eng.reflectedRayConfig(inRay, h.point, 0)
assert('反射角=45°(方向45°)', refl.angleDeg, 45)
assert('反射光线 id', refl.id, 'in-reflected')

// 折射：水平界面，空气→水（n2=1.33），入射方向 -45°（右下）
const eng2 = new OpticsEngine()
eng2.addObstacle({ id: 'water', type: 'boundary', p1: { x: -10, y: 0 }, p2: { x: 10, y: 0 }, n2: 1.33 })
const in2 = eng2.addRay({ id: 'in2', origin: { x: -5, y: 5 }, angleDeg: -45 })
const h2 = eng2.traceRay(in2)
const refr = eng2.refractedRayConfig(in2, h2.point, 0, 1, 1.33)
assert('折射光线存在', refr !== null, true)
// 期望方向：右下偏折向法线 → 302.12°（归一化后即 -57.88°）
assert('折射方向≈302.1°(向法线偏折)', refr.angleDeg, -57.882, 0.01)

// 全反射：水→空气 60° 入射（> 临界角 48.75°）
const eng3 = new OpticsEngine()
eng3.addObstacle({ id: 'air', type: 'boundary', p1: { x: -10, y: 0 }, p2: { x: 10, y: 0 }, n2: 1 })
const in3 = eng3.addRay({ id: 'in3', origin: { x: 0, y: -5 }, angleDeg: 150 }) // 水底向上左，60°入射
const h3 = eng3.traceRay(in3)
assert('60°入射光线命中界面', h3 !== null, true)
const refr3 = eng3.refractedRayConfig(in3, h3.point, 0, 1.33, 1)
assert('60°入射全反射返回 null', refr3, null)

// 透镜三条特殊光线：f=10，透镜 x=0，物点(-30, 5)
const rays = eng.lensSpecialRays({ x: -30, y: 5 }, 0, 10)
assert('三条特殊光线齐备', rays.length, 3)
assert('平行光线出射过焦点', rays[0].segments[1].to.x, 10)
assert('焦点光线平行出射', Math.abs(rays[2].segments[1].from.y - rays[2].segments[1].to.y) < 1e-9, true)

// 传播动画步进（Node 无 rAF，直接调步进）
const eng4 = new OpticsEngine()
eng4.addRay({ id: 'a', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.5 })
eng4._stepPhysics(1)
assert('光线传播进度 0.5', eng4.getRay('a').progress, 0.5)
// 延迟
const eng5 = new OpticsEngine()
eng5.addRay({ id: 'b', origin: { x: 0, y: 0 }, angleDeg: 0, speed: 0.5, delay: 2 })
eng5._stepPhysics(1)
assert('延迟内不传播', eng5.getRay('b').progress, 0)
eng5._stepPhysics(1.5)
assert('延迟后开始传播', eng5.getRay('b').progress, 0.25)

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
