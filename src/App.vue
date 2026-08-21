<template>
  <div class="app-container">
    <NavHeader />
    <main class="page-main">
      <router-view />
    </main>
    <Footer />
  </div>
</template>

<script setup>
import NavHeader from '@/components/NavHeader.vue'
import Footer from '@/components/Footer.vue'
</script>

<style lang="scss">
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: "Source Han Sans CN", "思源黑体", "Microsoft YaHei", sans-serif;
  background-color: $color-bg;
  color: $color-text-dark;
  line-height: 1.5;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1;
  width: 100%;
  max-width: $content-max-width;
  margin: 0 auto;
  padding: 0 24px;
}

/* ===== 移动端全局适配 ===== */
* {
  -webkit-tap-highlight-color: transparent;
}

@media (max-width: $bp-mobile) {
  .page-main {
    padding: 0 12px;
  }
}
</style>
