<template>
  <div class="register-page">
    <div class="register-card">
      <h1 class="title">注册账号</h1>
      <p class="subtitle">加入初中物理经典实验模拟平台</p>

      <!-- 服务端错误提示 -->
      <div v-if="serverError" class="server-error" role="alert">{{ serverError }}</div>

      <form @submit.prevent="handleSubmit" novalidate>
        <!-- 头像 -->
        <div class="field">
          <label class="field-label">头像</label>
          <div class="avatar-row">
            <div
              class="avatar-item avatar-default"
              :class="{ selected: avatar === 'default' }"
              title="默认头像"
              @click="avatar = 'default'"
            >👤</div>
            <div
              v-for="a in PRESET_AVATARS"
              :key="a"
              class="avatar-item"
              :class="{ selected: avatar === a }"
              @click="avatar = a"
            >{{ a }}</div>
            <button type="button" class="avatar-upload" @click="triggerUpload">📷 上传</button>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              hidden
              @change="onFileChange"
            />
          </div>
          <p class="avatar-preview-line">
            <template v-if="isCustomAvatar">
              <img :src="avatar" class="avatar-preview-img" alt="已上传头像" />
              <span>已上传自定义头像（自动压缩 ≤200KB）</span>
            </template>
            <template v-else>点击选择预设头像，或上传本地图片</template>
          </p>
        </div>

        <!-- 用户名 -->
        <div class="field">
          <label class="field-label">用户名</label>
          <input
            v-model.trim="form.username"
            type="text"
            class="text-input"
            :class="{ invalid: errors.username }"
            placeholder="2~20 位中文/字母/数字/下划线"
            maxlength="20"
            @input="errors.username = ''"
          />
          <p v-if="errors.username" class="field-error">{{ errors.username }}</p>
        </div>

        <!-- 密码 -->
        <div class="field">
          <label class="field-label">密码</label>
          <input
            v-model="form.password"
            type="password"
            class="text-input"
            :class="{ invalid: errors.password }"
            placeholder="至少 8 位，且包含字母和数字"
            maxlength="32"
            @input="errors.password = ''"
          />
          <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
        </div>

        <!-- 确认密码 -->
        <div class="field">
          <label class="field-label">确认密码</label>
          <input
            v-model="form.confirm"
            type="password"
            class="text-input"
            :class="{ invalid: errors.confirm }"
            placeholder="再次输入密码"
            maxlength="32"
            @input="errors.confirm = ''"
          />
          <p v-if="errors.confirm" class="field-error">{{ errors.confirm }}</p>
        </div>

        <!-- 性别 -->
        <div class="field">
          <label class="field-label">性别</label>
          <div class="radio-row">
            <label v-for="g in GENDER_OPTIONS" :key="g.value" class="radio-item">
              <input v-model="form.gender" type="radio" :value="g.value" />
              <span>{{ g.label }}</span>
            </label>
          </div>
          <p v-if="errors.gender" class="field-error">{{ errors.gender }}</p>
        </div>

        <!-- 出生年月日 -->
        <div class="field">
          <label class="field-label">出生年月日</label>
          <input
            v-model="form.birthday"
            type="date"
            class="text-input"
            :class="{ invalid: errors.birthday }"
            :min="'1900-01-01'"
            :max="todayStr"
            @input="errors.birthday = ''"
          />
          <p v-if="errors.birthday" class="field-error">{{ errors.birthday }}</p>
        </div>

        <!-- 职业 -->
        <div class="field">
          <label class="field-label">职业</label>
          <select
            v-model="form.occupation"
            class="text-input"
            :class="{ invalid: errors.occupation }"
            @change="errors.occupation = ''"
          >
            <option value="" disabled>请选择职业</option>
            <option v-for="o in OCCUPATION_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <p v-if="errors.occupation" class="field-error">{{ errors.occupation }}</p>
        </div>

        <!-- 隐私说明 -->
        <p class="privacy-note">
          温馨提示：注册信息中的性别、出生年月日仅用于平台统计与功能优化，不会公开展示给其他用户；请放心填写。
        </p>

        <button type="submit" class="submit-btn" :disabled="submitting">
          {{ submitting ? '注册中…' : '注册' }}
        </button>
        <p class="login-link">
          已有账号？<router-link to="/login">去登录</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/index.js'
import { useUserStore } from '@/stores/user.js'

const router = useRouter()
const userStore = useUserStore()

// —— 常量（与后端校验规则一致）——
const USERNAME_RE = /^[\u4e00-\u9fa5A-Za-z0-9_]{2,20}$/
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/
const PRESET_AVATARS = ['🧑‍🏫', '👩‍🏫', '🧑‍🎓', '👩‍🎓', '🐱', '🐶', '🚀', '🌟']
const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'secret', label: '保密' }
]
const OCCUPATION_OPTIONS = [
  { value: 'student', label: '学生' },
  { value: 'teacher', label: '教师' },
  { value: 'other', label: '其他' }
]

// —— 表单状态 ——
const form = reactive({
  username: '',
  password: '',
  confirm: '',
  gender: '',
  birthday: '',
  occupation: ''
})
const errors = reactive({})
const avatar = ref('default')
const serverError = ref('')
const submitting = ref(false)
const fileInput = ref(null)

const todayStr = new Date().toISOString().slice(0, 10)
const isCustomAvatar = () => avatar.value.startsWith('data:')

function triggerUpload() {
  fileInput.value?.click()
}

// 本地图片压缩转 base64（≤200KB，最长边 256px）
function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('图片不能超过 2MB'))
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX_EDGE = 256
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        let dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        for (let q = 0.8; q > 0.3 && dataUrl.length * 0.75 > 200 * 1024; q -= 0.15) {
          dataUrl = canvas.toDataURL('image/jpeg', q)
        }
        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('图片解析失败'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

async function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    avatar.value = await compressImage(file)
    serverError.value = ''
  } catch (err) {
    serverError.value = err.message || '头像上传失败'
  } finally {
    e.target.value = ''
  }
}

// —— 前端校验（与后端规则一致）——
function validate() {
  errors.username = !form.username
    ? '请输入用户名'
    : !USERNAME_RE.test(form.username)
      ? '用户名需为 2~20 位中文/字母/数字/下划线'
      : ''
  errors.password = !form.password
    ? '请输入密码'
    : !PASSWORD_RE.test(form.password)
      ? '密码需至少 8 位且包含字母和数字'
      : ''
  errors.confirm = form.confirm !== form.password ? '两次输入的密码不一致' : ''
  errors.gender = !form.gender ? '请选择性别' : ''
  errors.birthday = !form.birthday ? '请选择出生年月日' : ''
  errors.occupation = !form.occupation ? '请选择职业' : ''
  return Object.values(errors).every((v) => !v)
}

async function handleSubmit() {
  serverError.value = ''
  if (!validate()) return
  submitting.value = true
  try {
    const { data } = await api.post('/api/auth/register', {
      username: form.username,
      password: form.password,
      avatar: avatar.value,
      gender: form.gender,
      birthday: form.birthday,
      occupation: form.occupation
    })
    if (data.code === 0) {
      userStore.setLogin(data.data)
      router.push('/')
    } else {
      serverError.value = data.message || '注册失败'
    }
  } catch (e) {
    serverError.value = e.response?.data?.message || '网络异常，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.register-page {
  min-height: calc(100vh - #{$header-height});
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 16px;
  background: linear-gradient(180deg, $color-bg 0%, #eef3f9 100%);
}

.register-card {
  width: 100%;
  max-width: 480px;
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

  &.invalid {
    border-color: $color-danger;
  }
}

.field-error {
  font-size: 12px;
  color: $color-danger;
  margin-top: 6px;
}

// —— 头像区 ——
.avatar-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.avatar-item {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid $color-border;
  background: $color-bg;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;

  &:hover {
    border-color: $color-tech-blue;
    transform: scale(1.06);
  }

  &.selected {
    border-color: $color-tech-blue;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.25);
  }
}

.avatar-upload {
  height: 44px;
  padding: 0 14px;
  border: 2px dashed $color-tech-blue;
  border-radius: 22px;
  background: transparent;
  color: $color-tech-blue;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(74, 144, 226, 0.08);
  }
}

.avatar-preview-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: $color-text-muted;
  margin-top: 8px;
}

.avatar-preview-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid $color-border;
}

// —— 性别 ——
.radio-row {
  display: flex;
  gap: 18px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: $color-text-dark;
  cursor: pointer;

  input {
    accent-color: $color-tech-blue;
    width: 16px;
    height: 16px;
  }
}

// —— 隐私说明 ——
.privacy-note {
  font-size: 12px;
  color: $color-text-muted;
  line-height: 1.6;
  background: $color-bg;
  border-radius: $radius-sm;
  padding: 10px 12px;
  margin: 4px 0 20px;
}

// —— 提交按钮 ——
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

.login-link {
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
  .register-page {
    padding: 20px 12px;
  }
  .register-card {
    padding: 24px 20px 22px;
  }
}
</style>
