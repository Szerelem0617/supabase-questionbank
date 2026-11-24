<script setup>
const { t, locale } = useI18n()

const props = defineProps({
  question: { type: Object, required: true },
  isAnswerExpanded: { type: Boolean, default: false },
  isCommentExpanded: { type: Boolean, default: false },
  comments: { type: Array, default: () => [] },
  newCommentText: { type: Object, default: () => ({}) },
  submittingComment: { type: Object, default: () => ({}) },
  cdnBase: { type: String, default: '' },
  r2DevUrl: { type: String, default: '' }
})

const emit = defineEmits([
  'toggle-answer',
  'toggle-comment',
  'toggle-fav',
  'toggle-like-comment',
  'add-comment'
])

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

    <!-- MCQ Discussion / Notes Drawer -->
    <transition name="slide-down">
      <div v-if="isCommentExpanded" class="mcq-notes-drawer">
        <div class="notes-drawer-header">
          <h5>💬 {{ locale === 'zh' ? '本题笔记与讨论' : 'Question Notes & Discussion' }} (Q{{ question.question_raw_number || '1' }})</h5>
          <button @click="emit('toggle-comment')" class="close-drawer-mini">&times;</button>
        </div>

        <div class="notes-messages-list">
          <div v-if="!comments || comments.length === 0" class="empty-notes">
            {{ t('singleQuestion.noComments') }}
          </div>
          <div v-for="c in comments" :key="c.id" class="notes-item">
            <div class="notes-author">
              <span class="author-name">{{ c.profiles?.display_name || c.author || t('singleQuestion.student') }}</span>
              <span class="notes-time">{{ c.time || (c.created_at ? new Date(c.created_at).toLocaleTimeString() : '刚刚') }}</span>
            </div>
            <div class="notes-body">{{ c.message }}</div>
            <div class="notes-item-footer">
              <button 
                class="hover-like-btn" 
                :class="{ 'is-liked': c.liked }"
                @click="emit('toggle-like-comment', c)"
                :title="t('singleQuestion.like')"
              >
                <span class="like-heart">{{ c.liked ? '❤️' : '🤍' }}</span>
                <span class="like-label">{{ c.liked ? (locale === 'zh' ? '已赞' : 'Liked') : (locale === 'zh' ? '赞同' : 'Like') }}</span>
                <span class="like-num">{{ c.likes || 0 }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="notes-input-row">
          <input 
            v-model="newCommentText[question.id]" 
            type="text" 
            :placeholder="t('singleQuestion.commentPlaceholder')" 
            @keyup.enter="emit('add-comment')"
          />
          <button 
            @click="emit('add-comment')" 
            :disabled="submittingComment[question.id]" 
            class="btn btn-primary btn-sm"
          >
            {{ submittingComment[question.id] ? (locale === 'zh' ? '发布中...' : 'Posting...') : t('singleQuestion.sendComment') }}
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.mcq-view {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid rgba(223, 219, 212, 0.4);
  border-radius: var(--radius-base);
  box-shadow: 0 1px 4px rgba(44, 47, 50, 0.03);
  overflow: hidden;
}

.mcq-main-row {
  width: 100%;
  background: var(--bg-surface);
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
  padding: 14px 18px;
  background: rgba(245, 240, 232, 0.6);
  border-top: 1px dashed var(--accent-primary);
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

/* MCQ Notes Drawer */
.mcq-notes-drawer {
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  padding: 14px 18px;
}

.notes-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.notes-drawer-header h5 {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-main);
}

.close-drawer-mini {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
}

.notes-messages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.empty-notes {
  font-size: 0.8rem;
  color: var(--text-muted);
  padding: 8px 0;
}

.notes-item {
  background: #ffffff;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 8px 12px;
}

.notes-author {
  display: flex;
  justify-content: space-between;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.notes-body {
  font-size: 0.84rem;
  color: var(--text-main);
  line-height: 1.5;
}

.notes-item-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

.hover-like-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface-subtle);
  color: var(--text-secondary);
  font-size: 0.72rem;
  cursor: pointer;
}

.hover-like-btn.is-liked {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.notes-input-row {
  display: flex;
  gap: 8px;
}

.notes-input-row input {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  font-size: 0.82rem;
  background: #ffffff;
  outline: none;
}

.notes-input-row input:focus {
  border-color: var(--border-focus);
}

/* Slide Transition */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s ease-out;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
