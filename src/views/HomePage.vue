<template>
  <div class="home-page">
    <!-- 页面标题区 -->
    <div class="page-hero">
      <h1>初中物理经典实验模拟平台</h1>
      <p class="subtitle">交互式可视化仿真 · 助力物理课堂教学</p>
	  <!-- ===== 新增：测试按钮 ===== -->
	      <button class="donate-btn" @click="showDonate = true">🎁 打赏作者</button>
    </div>

    <!-- 章节卡片网格 -->
    <div class="chapter-grid">
      <ChapterCard
        v-for="chapter in chapterList"
        :key="chapter.id"
        :id="chapter.id"
        :icon="chapter.icon"
        :title="chapter.title"
        :description="chapter.description"
        :experiment-count="chapter.count"
      />
    </div>
  </div>
    <!-- 打赏弹窗 -->
    <div v-if="showDonate" class="donate-mask" @click.self="showDonate = false">
      <div class="donate-modal">
        <button class="donate-close" @click="showDonate = false" aria-label="关闭">✕</button>
        <h3 class="donate-title">🎁 感谢支持</h3>
        <p class="donate-text">这个平台完全免费，如果它对您的学习或教学有帮助，<br>欢迎扫码打赏一杯奶茶～<br>您的支持是我持续更新的最大动力！</p>
        <img class="donate-qr" :src="donateQr" alt="微信收款码">
        <p class="donate-tip">微信扫一扫 · 感谢您的鼓励 ❤️</p>
      </div>
    </div>
</template>

<script setup>
import ChapterCard from '@/components/ChapterCard.vue'
import { ref } from 'vue'
import donateQr from '@/img/WeChatPayQR.png'


// ===== 打赏弹窗状态 =====
const showDonate = ref(false)

// 五大章节基础配置
const chapterList = [
  {
    id: 'mechanics',
    icon: '⚙️',
    title: '力学',
    description: '运动学、受力分析、杠杆滑轮、浮力等经典力学实验',
    count: 7
  },
  {
    id: 'heat',
    icon: '🔥',
    title: '热学',
    description: '物态变化、分子热运动与扩散、比热容、热机四冲程实验',
    count: 4
  },
  {
    id: 'acoustics',
    icon: '🔊',
    title: '声学',
    description: '声音波形与频谱观察、回声测距模拟实验',
    count: 2
  },
  {
    id: 'optics',
    icon: '💡',
    title: '光学',
    description: '光的反射折射、凸透镜成像、平面镜成像实验',
    count: 6
  },
  {
    id: 'electricity',
    icon: '⚡',
    title: '电学',
    description: '串并联电路、欧姆定律、电功率与焦耳定律实验',
    count: 1
  }
]
</script>

<style lang="scss" scoped>
.home-page {
  padding: 40px 0 60px;
}

.page-hero {
  text-align: center;
  margin-bottom: 48px;

  h1 {
    font-size: 34px;
    color: $color-primary;
    font-weight: 700;
    margin-bottom: 12px;
    letter-spacing: 1px;
  }

  .subtitle {
    font-size: 16px;
    color: $color-text-muted;
  }
}

.chapter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: $bp-mobile) {
  .home-page {
    padding: 20px 0 40px;
  }
  .page-hero {
    margin-bottom: 24px;
    h1 {
      font-size: 22px;
      letter-spacing: 0.5px;
    }
    .subtitle {
      font-size: 13px;
    }
  }
  .chapter-grid {
    gap: 14px;
  }
}
.donate-btn {
  margin-top: 20px;
  padding: 10px 28px;
  font-size: 15px;
  color: #fff;
  background: linear-gradient(135deg, #ff9a56, #ff6b6b);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(255, 107, 107, 0.35);
  transition: transform 0.2s, box-shadow 0.2s;
}
.donate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.45);
}
.donate-btn:active {
  transform: translateY(0);
}

/* 打赏弹窗 */
.donate-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.55);
}
.donate-modal {
  position: relative;
  width: 340px;
  max-width: 92vw;
  padding: 32px 28px 24px;
  background: #fff;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  animation: donate-pop 0.25s ease;
}
@keyframes donate-pop {
  from { transform: scale(0.88); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.donate-close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 30px;
  height: 30px;
  border: none;
  background: none;
  font-size: 16px;
  color: $color-text-muted;
  cursor: pointer;
  border-radius: 50%;
}
.donate-close:hover { background: #f0f0f0; }
.donate-title {
  font-size: 20px;
  color: $color-text-dark;
  margin-bottom: 12px;
}
.donate-text {
  font-size: 14px;
  line-height: 1.8;
  color: $color-text-muted;
  margin-bottom: 16px;
}
.donate-qr {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid #eee;
  background: #fafafa;
}
.donate-tip {
  margin-top: 14px;
  font-size: 12px;
  color: $color-text-muted;
}

@media (max-width: $bp-mobile) {
  .donate-btn {
    margin-top: 16px;
    padding: 9px 22px;
    font-size: 14px;
  }
  .donate-modal {
    padding: 26px 20px 20px;
  }
  .donate-qr {
    width: 170px;
    height: 170px;
  }
}
</style>
