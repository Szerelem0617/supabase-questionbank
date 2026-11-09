<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const { t, locale } = useI18n()

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
  }
})
</script>

<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="isOpen" class="help-modal-backdrop" @click.self="emit('close')">
        <div class="help-modal-card" role="dialog" aria-modal="true">
          <!-- Header -->
          <div class="help-modal-header">
            <div class="header-title-wrap">
              <span class="header-badge">i</span>
              <div>
                <h3 class="modal-title">{{ t('guide.title') }}</h3>
                <p class="modal-subtitle">{{ t('guide.subtitle') }}</p>
              </div>
            </div>
            <button class="btn-close" @click="emit('close')" :title="locale === 'zh' ? '关闭' : 'Close'">
              &times;
            </button>
          </div>

          <!-- Body with Visual Grid/List of Features -->
          <div class="help-modal-body">
            <!-- 1. Shortcuts -->
            <div class="guide-item">
              <div class="guide-icon-col">
                <span class="guide-icon">⌨️</span>
              </div>
              <div class="guide-content-col">
                <h4 class="guide-item-title">{{ t('guide.shortcutsTitle') }}</h4>
                <p class="guide-item-desc">{{ t('guide.shortcutsDesc') }}</p>
                <div class="shortcut-pills">
                  <span class="key-pill"><kbd>&larr;</kbd> {{ locale === 'zh' ? '上一题' : 'Prev Question' }}</span>
                  <span class="key-pill"><kbd>&rarr;</kbd> {{ locale === 'zh' ? '下一题' : 'Next Question' }}</span>
                  <span class="key-pill"><kbd>ESC</kbd> {{ locale === 'zh' ? '关闭弹窗' : 'Close Modal' }}</span>
                </div>
              </div>
            </div>

            <!-- 2. Dual Search -->
            <div class="guide-item">
              <div class="guide-icon-col">
                <span class="guide-icon">🔍</span>
              </div>
              <div class="guide-content-col">
                <h4 class="guide-item-title">{{ t('guide.searchTitle') }}</h4>
                <p class="guide-item-desc">{{ t('guide.searchDesc') }}</p>
                <div class="tip-tags">
                  <code class="tip-code">1</code>
                  <code class="tip-code">Q2</code>
                  <code class="tip-code">density + volume</code>
                  <code class="tip-code">qp:9702_s21_qp_23</code>
                </div>
              </div>
            </div>

            <!-- 3. Favorites -->
            <div class="guide-item">
              <div class="guide-icon-col">
                <span class="guide-icon">📁</span>
              </div>
              <div class="guide-content-col">
                <h4 class="guide-item-title">{{ t('guide.favTitle') }}</h4>
                <p class="guide-item-desc">{{ t('guide.favDesc') }}</p>
              </div>
            </div>

            <!-- 4. Mark Scheme & Notes -->
            <div class="guide-item">
              <div class="guide-icon-col">
                <span class="guide-icon">💡</span>
              </div>
              <div class="guide-content-col">
                <h4 class="guide-item-title">{{ t('guide.notesTitle') }}</h4>
                <p class="guide-item-desc">{{ t('guide.notesDesc') }}</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="help-modal-footer">
            <button class="btn-got-it" @click="emit('close')">
              {{ t('guide.gotIt') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.help-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(44, 47, 50, 0.45);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
  box-sizing: border-box;
}

.help-modal-card {
  width: 100%;
  max-width: 620px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  box-shadow: 0 16px 40px rgba(44, 47, 50, 0.18), 0 2px 6px rgba(44, 47, 50, 0.08);
  overflow: hidden;
}

.help-modal-header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-base);
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  border: 1px solid var(--accent-primary-border);
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 700;
  font-size: 1.1rem;
}

.modal-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 1.18rem;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.modal-subtitle {
  margin: 3px 0 0;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.6rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.btn-close:hover {
  color: var(--accent-primary);
  background: var(--bg-surface);
}

.help-modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.guide-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--border-subtle);
}

.guide-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.guide-icon-col {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-base);
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.guide-icon {
  font-size: 1.15rem;
}

.guide-content-col {
  flex: 1;
}

.guide-item-title {
  margin: 0 0 6px;
  font-family: var(--font-serif);
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--text-main);
}

.guide-item-desc {
  margin: 0 0 8px;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.shortcut-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.key-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: var(--text-muted);
  background: var(--bg-surface-subtle);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
}

kbd {
  display: inline-block;
  padding: 1px 5px;
  font-family: monospace;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-main);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
}

.tip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.tip-code {
  font-family: monospace;
  font-size: 0.78rem;
  color: var(--accent-primary);
  background: var(--accent-primary-light);
  border: 1px solid var(--accent-primary-border);
  padding: 2px 7px;
  border-radius: 4px;
}

.help-modal-footer {
  padding: 14px 24px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface-subtle);
  display: flex;
  justify-content: flex-end;
}

.btn-got-it {
  background: var(--accent-primary);
  color: #ffffff;
  border: none;
  padding: 8px 24px;
  border-radius: var(--radius-base);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: 0 2px 6px rgba(194, 65, 40, 0.2);
}

.btn-got-it:hover {
  background: #a93520;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(194, 65, 40, 0.28);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .help-modal-card {
  transition: transform 0.2s ease;
}

.modal-fade-enter-from .help-modal-card {
  transform: scale(0.96) translateY(8px);
}
</style>

