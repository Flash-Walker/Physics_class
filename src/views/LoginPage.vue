<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="title">登录</h1>
      <p class="subtitle">欢迎回到初中物理经典实验模拟平台</p>

      <!-- 服务端错误提示 -->
      <div v-if="serverError" class="server-error" role="alert">{{ serverError }}</div>

      <form @submit.prevent="handleSubmit" novalidate>
        <div class="field">
          <label class="field-label">用户名</label>
          <input
            v-model.trim="form.username"
            type="text"
            class="text-input"
            placeholder="请输入用户名"
            maxlength="20"
            @input="serverError = ''"
          />
        </div>

        <div class="field">
          <label class="field-label">密码</label>
          <input
            v-model="form.password"
            type="password"
            class="text-input"
            placeholder="请输入密码"
            maxlength="32"
            @keyup.enter="handleSubmit"
            @input="serverError = ''"
          />
        </div>

        <button type="submit" class="submit-btn" :disabled="submitting">
          {{ submitting ? '登录中…' : '登录' }}
        </button>

        <p class="register-link">
          还没有账号？<router-link to="/register">立即注册</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const form = reactive({ username: '', password: '' })
const serverError = ref('')
const submitting = ref(false)

async function handleSubmit() {
  serverError.value = ''
  if (!form.username || !form.password) {
    serverError.value = '请输入用户名和密码'
    return
  }
  submitting.value = true
  try {
    const result = await userStore.login(form.username, form.password)
    if (result.ok) {
      router.push('/')
    } else {
      serverError.value = result.message
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: calc(100vh - #{$header-height});
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 16px;
  background: linear-gradient(180deg, $color-bg 0%, #eef3f9 100%);
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: $color-card-bg;
  border-radius: $radius-lg;
  box-shadow: $shadow-panel;
  padding: 32px 36px 28px;
  box-sizing: border-box;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: $color-text-dark;
  text-align: center;
  margin: 0;
}

.subtitle {
  font-size: 13px;
  color: $color-text-muted;
  text-align: center;
  margin: 6px 0 24px;
}

.server-error {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: $color-danger;
  border-radius: $radius-sm;
  padding: 10px 12px;
  font-size: 13px;
  margin-bottom: 16px;
}

.field {
  margin-bottom: 18px;
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: $color-text-dark;
  margin-bottom: 8px;
}

.text-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  color: $color-text-dark;
  background: $color-card-bg;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    border-color: $color-tech-blue;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
  }
}

.submit-btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  color: $color-text-primary;
  background: linear-gradient(90deg, $color-tech-blue, $color-secondary);
  border: none;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.1s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:active:not(:disabled) {
    transform: scale(0.99);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.register-link {
  text-align: center;
  font-size: 13px;
  color: $color-text-muted;
  margin-top: 14px;

  a {
    color: $color-tech-blue;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

@media (max-width: $bp-mobile) {
  .login-page {
    padding: 20px 12px;
  }
  .login-card {
    padding: 24px 20px 22px;
  }
}
</style>
