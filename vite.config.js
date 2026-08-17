import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 全局注入变量文件，所有组件可直接使用变量
        additionalData:`@use "@/assets/styles/variables.scss" as *;`
      }
    }
  },
  server: {
    port: 5173,
    open: false
  }
})
