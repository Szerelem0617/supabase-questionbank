<script setup>
const { t, locale } = useI18n()

const props = defineProps({
  question: { type: Object, required: true },
  isAnswerExpanded: { type: Boolean, default: false },
  isFav: { type: Boolean, default: false },
  cdnBase: { type: String, default: '' },
  r2DevUrl: { type: String, default: '' }
})

const emit = defineEmits(['toggle-answer', 'toggle-fav'])

function getImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${props.cdnBase}/${cleanPath}`
}

function onImageError(e, path) {
  if (!e || !e.target || !path) return
  const fallbackBase = props.r2DevUrl || 'https://pub-b20547c0488b456f8b6c033d9a7a1ca1.r2.dev'
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const fallbackUrl = `${fallbackBase}/${cleanPath}`
  if (e.target.src !== fallbackUrl) {
    e.target.src = fallbackUrl
  }
}
</script>

<template>
  <div class="mcq-view">
    <div class="mcq-main-row">
      <div class="mcq-img-wrap">
        <img 
          v-if="question.image_path"
          :src="getImageUrl(question.image_path)" 
          alt="Multiple Choice Question"
          class="exam-subq-image"
          loading="eager"
          decoding="async"
          @error="(e) => onImageError(e, question.image_path)"
        />
      </div>

      <!-- MCQ Right Dock (Clean Icon-Only Buttons) -->
      <div class="subq-action-dock">
        <button 
          @click="emit('toggle-answer')" 
          class="dock-btn"
          :class="{ 'dock-btn-active': isAnswerExpanded }"
          :title="isAnswerExpanded ? t('favoritesView.hideAnswer') : t('favoritesView.viewAnswer')"
        >
          <span class="dock-icon">💡</span>
        </button>

        <button 
          @click="emit('toggle-fav')" 
          class="dock-btn"
          :class="{ 'dock-btn-fav-active': isFav }"
          :title="isFav ? t('favoritesView.unfavorite') : t('singleQuestion.favMcq')"
        >
          <span class="dock-icon">{{ isFav ? '★' : '☆' }}</span>
        </button>
      </div>
    </div>

    <!-- MCQ Answer Revelation -->
    <div v-if="isAnswerExpanded" class="mcq-answer-reveal">
      <h3>{{ t('singleQuestion.mcqAnswer') }}</h3>
      <div class="answer-badge-large">{{ question.ms_details || (locale === 'zh' ? '暂未录入答案' : 'Answer not recorded') }}</div>
    </div>
  </div>
</template>

<style scoped>
.mcq-view {
  display: flex;
  flex-direction: column;
}

.mcq-main-row {
  display: flex;
  align-items: flex-start;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  overflow: hidden;
}

.mcq-img-wrap {
  flex: 1;
  line-height: 0;
}

.exam-subq-image {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.subq-action-dock {
  width: 48px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 4px;
  background: var(--bg-surface-subtle);
  border-left: 1px dashed var(--border-subtle);
  user-select: none;
}

.dock-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 2px 4px;
}

.dock-marks {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent-primary);
  line-height: 1;
}

.dock-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.16s ease;
  color: var(--text-secondary);
  padding: 0;
}

.dock-btn:hover {
  border-color: var(--border-focus);
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  transform: translateY(-1px);
}

.dock-icon {
  font-size: 15px;
  line-height: 1;
}

.dock-btn-active {
  background: var(--accent-primary-light) !important;
  border-color: var(--accent-primary) !important;
  color: var(--accent-primary) !important;
  font-weight: 700;
}

.dock-btn-fav-active {
  background: var(--accent-primary-light) !important;
  border-color: var(--accent-primary) !important;
  color: var(--accent-primary) !important;
  font-weight: 800;
}

.dock-btn-fav-active .dock-icon {
  color: var(--accent-primary);
}

.dock-icon {
  font-size: 0.95rem;
}

.dock-label {
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.mcq-answer-reveal {
  margin-top: 16px;
  padding: 16px 20px;
  background: rgba(245, 240, 232, 0.6);
  border: 1px dashed var(--accent-primary);
  border-radius: var(--radius-base);
}

.mcq-answer-reveal h3 {
  margin: 0 0 8px 0;
  font-size: 0.92rem;
  color: var(--text-muted);
}

.answer-badge-large {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--accent-primary);
}
</style>

