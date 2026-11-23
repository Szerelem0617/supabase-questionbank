<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  theme: {
    type: String,
    default: 'light'
  },
  size: {
    type: String,
    default: 'normal' // 'normal' | 'compact' | 'flexible'
  }
})

const emit = defineEmits(['update:modelValue', 'verify', 'expired', 'error'])

const config = useRuntimeConfig()
const siteKey = config.public.turnstileSiteKey || '0x4AAAAAAGOTULWOrL-G5t3M'

const containerRef = ref(null)
const widgetId = ref(null)
const isLoading = ref(true)

function loadTurnstileScript() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (window.turnstile) return resolve(true)

    const existingScript = document.getElementById('cf-turnstile-script')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true))
      return
    }

    const script = document.createElement('script')
    script.id = 'cf-turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
}

async function renderWidget() {
  if (!containerRef.value) return
  const ready = await loadTurnstileScript()
  if (!ready || !window.turnstile) return

  try {
    if (widgetId.value) {
      window.turnstile.remove(widgetId.value)
      widgetId.value = null
    }

    widgetId.value = window.turnstile.render(containerRef.value, {
      sitekey: siteKey,
      theme: props.theme,
      size: props.size,
      callback: (token) => {
        isLoading.value = false
        emit('update:modelValue', token)
        emit('verify', token)
      },
      'expired-callback': () => {
        emit('update:modelValue', '')
        emit('expired')
      },
      'error-callback': (err) => {
        isLoading.value = false
        emit('update:modelValue', '')
        emit('error', err)
      }
    })
    isLoading.value = false
  } catch (err) {
    console.warn('[Turnstile] Render error:', err)
    isLoading.value = false
  }
}

function reset() {
  emit('update:modelValue', '')
  if (widgetId.value && window.turnstile) {
    try {
      window.turnstile.reset(widgetId.value)
    } catch (e) {
      console.warn('[Turnstile] Reset failed, re-rendering:', e)
      renderWidget()
    }
  }
}

defineExpose({
  reset
})

onMounted(() => {
  renderWidget()
})

onBeforeUnmount(() => {
  if (widgetId.value && window.turnstile) {
    try {
      window.turnstile.remove(widgetId.value)
      widgetId.value = null
    } catch (e) {
      // ignore cleanup errors
    }
  }
})
</script>

<template>
  <div class="turnstile-wrapper">
    <div ref="containerRef" class="turnstile-container"></div>
  </div>
</template>

<style scoped>
.turnstile-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 65px;
  margin: 10px 0;
}

.turnstile-container {
  display: inline-block;
  min-height: 65px;
}
</style>
