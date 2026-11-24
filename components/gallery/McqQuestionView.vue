<script setup>
const { t, locale } = useI18n()

const props = defineProps({
  question: { type: Object, required: true },
  isAnswerExpanded: { type: Boolean, default: false },
  cdnBase: { type: String, default: '' },
  r2DevUrl: { type: String, default: '' }
})

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
    <!-- MCQ Question Image: Full Width without side dock -->
    <div class="mcq-main-row">
      <div class="mcq-img-wrap">
        <img 
          v-if="question.image_path"
          :src="getImageUrl(question.image_path)" 
          alt="Multiple Choice Question"
          class="exam-mcq-image"
          loading="eager"
          decoding="async"
          @error="(e) => onImageError(e, question.image_path)"
        />
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
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  overflow: hidden;
}

.mcq-img-wrap {
  width: 100%;
  line-height: 0;
}

.exam-mcq-image {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.mcq-answer-reveal {
  margin-top: 14px;
  padding: 14px 18px;
  background: rgba(245, 240, 232, 0.6);
  border: 1px dashed var(--accent-primary);
  border-radius: var(--radius-base);
}

.mcq-answer-reveal h3 {
  margin: 0 0 6px 0;
  font-size: 0.88rem;
  color: var(--text-muted);
}

.answer-badge-large {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--accent-primary);
}
</style>
