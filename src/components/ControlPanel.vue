<template>
  <div class="control-panel">
    <!-- 参数分组 -->
    <div v-for="group in config" :key="group.group" class="control-group">
      <div class="group-header" @click="toggleGroup(group.group)">
        <span>{{ group.group }}</span>
        <span class="toggle-icon">{{ collapsedGroups[group.group] ? '+' : '−' }}</span>
      </div>

      <div v-show="!collapsedGroups[group.group]" class="group-body">
        <!-- 遍历字段，按类型渲染控件 -->
        <div
          v-for="field in visibleFields(group.fields)"
          :key="field.key"
          class="field-item"
        >
          <div class="field-label">
            <span>{{ field.label }}</span>
            <span v-if="field.unit" class="field-unit">{{ field.unit }}</span>
          </div>

          <!-- 滑块型 -->
          <div v-if="field.type === 'slider'" class="slider-wrapper">
            <input
              type="range"
              :min="field.min"
              :max="field.max"
              :step="field.step"
              :value="modelValue[field.key]"
              class="slider-input"
              @input="updateField(field.key, Number($event.target.value))"
            />
            <input
              type="number"
              :min="field.min"
              :max="field.max"
              :step="field.step"
              :value="Number(modelValue[field.key]).toFixed(field.precision || 0)"
              class="number-input"
              @change="updateField(field.key, Number($event.target.value))"
            />
          </div>

          <!-- 下拉选择型 -->
          <select
            v-else-if="field.type === 'select'"
            :value="modelValue[field.key]"
            class="select-input"
            @change="updateField(field.key, $event.target.value)"
          >
            <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>

          <!-- 开关型 -->
          <div v-else-if="field.type === 'switch'" class="switch-wrapper">
            <label class="switch">
              <input
                type="checkbox"
                :checked="modelValue[field.key]"
                @change="updateField(field.key, $event.target.checked)"
              />
              <span class="slider-round"></span>
            </label>
            <span class="switch-label">
              {{ modelValue[field.key] ? '开启' : '关闭' }}
            </span>
          </div>

          <!-- 纯数字输入型 -->
          <input
            v-else-if="field.type === 'number'"
            type="number"
            :min="field.min"
            :max="field.max"
            :step="field.step || 0.1"
            :value="modelValue[field.key]"
            class="number-input full-width"
            @change="updateField(field.key, Number($event.target.value))"
          />
        </div>
      </div>
    </div>

    <!-- 底部操作区 -->
    <div class="panel-footer">
      <button class="reset-btn" @click="resetDefaults">
        恢复默认值
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

const props = defineProps({
  // 控制面板配置数组
  config: {
    type: Array,
    required: true
  },
  // 当前参数值对象（父组件 v-model 传入）
  modelValue: {
    type: Object,
    required: true
  },
  // 是否显示高级/拓展参数（初中模式可关闭）
  showAdvanced: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// 分组折叠状态
const collapsedGroups = reactive({})

// 初始化分组默认展开
props.config.forEach(group => {
  collapsedGroups[group.group] = group.collapsed || false
})

// 切换分组折叠
const toggleGroup = (groupName) => {
  collapsedGroups[groupName] = !collapsedGroups[groupName]
}

// 过滤掉不显示的高级参数
const visibleFields = (fields) => {
  if (props.showAdvanced) return fields
  return fields.filter(f => !f.advanced)
}

// 更新单个字段
const updateField = (key, value) => {
  const newValue = { ...props.modelValue, [key]: value }
  emit('update:modelValue', newValue)
  emit('change', key, value)
}

// 计算所有字段的默认值
const defaultValues = computed(() => {
  const defaults = {}
  props.config.forEach(group => {
    group.fields.forEach(field => {
      defaults[field.key] = field.default
    })
  })
  return defaults
})

// 一键恢复默认值
const resetDefaults = () => {
  emit('update:modelValue', { ...defaultValues.value })
}
</script>

<style lang="scss" scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.control-group {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px;
  cursor: pointer;
  font-weight: 500;
  color: $color-accent;
  font-size: 14px;
  user-select: none;

  &:hover {
    color: lighten($color-accent, 10%);
  }
}

.toggle-icon {
  font-size: 16px;
  opacity: 0.8;
}

.group-body {
  padding: 4px 0 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

.field-unit {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

/* 滑块样式 */
.slider-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-input {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: $color-accent;
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
      transform: scale(1.2);
    }
  }
}

.number-input {
  width: 60px;
  padding: 4px 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  font-size: 12px;
  text-align: right;
  outline: none;

  &:focus {
    border-color: $color-accent;
  }

  &.full-width {
    width: 100%;
  }
}

/* 下拉选择 */
.select-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  font-size: 13px;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: $color-accent;
  }
}

/* 开关样式 */
.switch-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider-round {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.2);
    transition: 0.3s;
    border-radius: 22px;

    &:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }
  }

  input:checked + .slider-round {
    background-color: $color-accent;
  }

  input:checked + .slider-round:before {
    transform: translateX(18px);
  }
}

.switch-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

/* 底部按钮 */
.panel-footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.reset-btn {
  width: 100%;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: $color-accent;
    color: $color-accent;
  }
}
</style>
