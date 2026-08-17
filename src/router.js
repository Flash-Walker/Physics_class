// src/router.js
import { createRouter, createWebHistory } from 'vue-router';
import HomePage from './views/HomePage.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
  },
  // 添加其他路由
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
