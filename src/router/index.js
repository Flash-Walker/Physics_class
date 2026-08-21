import { createRouter, createWebHistory } from 'vue-router'

import HomePage from '@/views/HomePage.vue'
import ChapterPage from '@/views/ChapterPage.vue'
import ExperimentPage from '@/views/ExperimentPage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
    meta: { title: '初中物理经典实验模拟平台' }
  },
  {
    path: '/chapter/:id',
    name: 'Chapter',
    component: ChapterPage,
    meta: { title: '章节实验列表' }
  },
  {
    path: '/experiment/:chapterId/:expId',
    name: 'Experiment',
    component: ExperimentPage,
    meta: { title: '实验模拟' }
  },
  // 兜底：未匹配路径回首页（避免空白页）
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  // base 与 vite.config 的 base 保持一致（部署在 /Physics_class/ 子路径下）
  history: createWebHistory('/Physics_class/'),
  routes
})

// 路由跳转后自动更新页面标题
router.afterEach((to) => {
  document.title = to.meta.title || '初中物理实验模拟'
})

export default router
