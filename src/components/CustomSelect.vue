<template>
  <div class="custom-select-wrapper" ref="selectRef">
    <div 
      class="custom-select-display" 
      :class="{ 'is-open': isOpen }"
      @click="openDropdown"
    >
      <input 
        v-if="allowInput"
        type="text"
        v-model="inputValue"
        class="custom-input"
        :placeholder="placeholder"
        @input="onInputChange"
        @focus="isOpen = true"
      />
      <span v-else-if="selectedOption" class="selected-text">{{ selectedOption.label }}</span>
      <span v-else class="placeholder-text">{{ placeholder }}</span>
      <ChevronDown :size="16" class="dropdown-icon" :class="{ 'rotated': isOpen }" @click.stop="isOpen = !isOpen" />
    </div>

    <Transition name="dropdown">
      <div v-if="isOpen" class="custom-select-dropdown">
        <div 
          v-for="option in options" 
          :key="option.value"
          class="custom-select-option"
          :class="{ 'is-selected': modelValue === option.value }"
          @click="selectOption(option)"
        >
          {{ option.label }}
          <Check v-if="modelValue === option.value" :size="14" class="check-icon" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ChevronDown, Check } from '@lucide/vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  options: { type: Array, required: true }, // { label: string, value: any }
  placeholder: { type: String, default: 'Seleccionar...' },
  allowInput: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const selectRef = ref(null)
const inputValue = ref('')

const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue)
})

import { watch } from 'vue'

watch(() => props.modelValue, (newVal) => {
  if (props.allowInput) {
    const opt = props.options.find(o => o.value === newVal)
    inputValue.value = opt ? opt.label : (newVal || '')
  }
}, { immediate: true })

function openDropdown() {
  if (!isOpen.value) {
    isOpen.value = true
  }
}

function selectOption(option) {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  if (props.allowInput) inputValue.value = option.label
  isOpen.value = false
}

function onInputChange() {
  emit('update:modelValue', inputValue.value)
  emit('change', inputValue.value)
}

function handleClickOutside(event) {
  if (selectRef.value && !selectRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>

<style scoped>
.custom-select-wrapper {
  position: relative;
  width: 100%;
}

.custom-select-display {
  width: 100%;
  padding: 0.5rem 0.5rem 0.5rem 0;
  border-bottom: 2px solid hsl(var(--color-text) / 0.15);
  background-color: transparent;
  color: hsl(var(--color-text));
  font-family: inherit;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all var(--transition-fast);
}

.custom-select-display:hover {
  border-bottom-color: hsl(var(--color-primary) / 0.5);
}

.custom-select-display.is-open {
  border-bottom-color: hsl(var(--color-primary));
}

.custom-input {
  width: 100%;
  border: none;
  background: transparent;
  color: hsl(var(--color-text));
  font-family: inherit;
  font-weight: 500;
  font-size: 1rem;
  outline: none;
}

.placeholder-text {
  color: hsl(var(--color-text-muted));
}

.dropdown-icon {
  color: hsl(var(--color-text-muted));
  transition: transform 0.2s;
}

.dropdown-icon.rotated {
  transform: rotate(180deg);
}

.custom-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background-color: hsl(var(--color-surface));
  border-radius: 12px;
  box-shadow: 0 10px 30px hsl(0 0% 0% / 0.25);
  border: 1px solid hsl(var(--color-text) / 0.1);
  max-height: 250px;
  overflow-y: auto;
  z-index: 100;
  padding: 0.5rem;
}

.custom-select-option {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  transition: background-color 0.15s;
  color: hsl(var(--color-text));
}

.custom-select-option:hover {
  background-color: hsl(var(--color-text) / 0.05);
}

.custom-select-option.is-selected {
  background-color: hsl(var(--color-primary) / 0.15);
  color: hsl(var(--color-primary));
}

.check-icon {
  color: hsl(var(--color-primary));
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Custom Scrollbar for Dropdown */
.custom-select-dropdown::-webkit-scrollbar {
  width: 6px;
}
.custom-select-dropdown::-webkit-scrollbar-track {
  background: transparent;
}
.custom-select-dropdown::-webkit-scrollbar-thumb {
  background-color: hsl(var(--color-text) / 0.2);
  border-radius: 10px;
}
</style>
