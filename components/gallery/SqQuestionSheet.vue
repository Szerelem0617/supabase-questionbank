<script setup>
const { t, locale } = useI18n()

const props = defineProps({
  groupQuestions: { type: Array, default: () => [] },
  expandedAnswers: { type: Object, default: () => ({}) },
  expandedComments: { type: Object, default: () => ({}) },
  isShortSubQ: { type: Object, default: () => ({}) },
  subQComments: { type: Object, default: () => ({}) },
  newCommentText: { type: Object, default: () => ({}) },
  submittingComment: { type: Object, default: () => ({}) },
  isSubQFav: { type: Function, required: true },
  cdnBase: { type: String, default: '' },
  r2DevUrl: { type: String, default: '' }
})

const emit = defineEmits([
  'toggle-answer',
  'toggle-comment',
  'toggle-subq-fav',
  'add-subq-comment',
  'toggle-like-comment',
  'subq-image-load'
])

function getImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/seed-questions/')) return path
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
  <div class="seamless-paper-sheet">
    <div 
      v-for="(subQ, idx) in groupQuestions" 
      :key="subQ.id" 
      :id="`subq-row-${subQ.id}`"
      class="subq-row-container"
    >
      <!-- Subquestion Row (Left Image, Right Action Dock) -->
      <div class="subq-main-row">
        <!-- Left: Question Image -->
        <div class="subq-img-wrap">
          <img 
            v-if="subQ.image_path"
            :src="getImageUrl(subQ.image_path)" 
            :alt="`Sub-question ${subQ.question_raw_number}`"
            class="exam-subq-image"
            loading="eager"
            decoding="async"
            @error="(e) => onImageError(e, subQ.image_path)"
            @load="(e) => emit('subq-image-load', e, subQ.id)"
          />
        </div>

        <!-- Right: Dedicated Action Dock (Clean Icon-Only Buttons) -->
        <div 
          class="subq-action-dock" 
          :class="{ 'dock-horizontal': isShortSubQ[subQ.id] }"
        >
          <!-- 1. Toggle Mark Scheme (Icon Only) -->
          <button 
            v-if="subQ.ms_image_path"
            @click="emit('toggle-answer', subQ.id)" 
            class="dock-btn"
            :class="{ 'dock-btn-active': expandedAnswers[subQ.id] }"
            :title="expandedAnswers[subQ.id] ? t('favoritesView.hideAnswer') : t('favoritesView.viewAnswer')"
          >
            <span class="dock-icon">💡</span>
          </button>

          <!-- 2. Subquestion Notes / Comments (Icon Only) -->
          <button 
            @click="emit('toggle-comment', subQ.id)" 
            class="dock-btn"
            :class="{ 'dock-btn-active': expandedComments[subQ.id] }"
            :title="locale === 'zh' ? '小问专属笔记与做题讨论' : 'Part notes and comments'"
          >
            <span class="dock-icon">💬</span>
            <span v-if="subQComments[subQ.id]?.length" class="dock-badge-dot">{{ subQComments[subQ.id].length }}</span>
          </button>

          <!-- 3. Subquestion Favorite Star (Icon Only) -->
          <button 
            @click="emit('toggle-subq-fav', subQ)" 
            class="dock-btn"
            :class="{ 'dock-btn-fav-active': isSubQFav(subQ.id) }"
            :title="isSubQFav(subQ.id) ? t('favoritesView.unfavorite') : t('singleQuestion.favSubQ')"
          >
            <span class="dock-icon">{{ isSubQFav(subQ.id) ? '★' : '☆' }}</span>
          </button>
        </div>
      </div>

      <!-- Mark Scheme Drawer -->
      <transition name="slide-down">
        <div v-if="expandedAnswers[subQ.id] && subQ.ms_image_path" class="subq-ms-drawer">
          <div class="ms-drawer-tag">
            <span>✨ {{ subQ.question_raw_number }} {{ t('singleQuestion.viewMs') }}</span>
            <button @click="emit('toggle-answer', subQ.id)" class="close-drawer-mini">&times;</button>
          </div>
          <div class="ms-drawer-body">
            <img 
              :src="getImageUrl(subQ.ms_image_path)" 
              alt="Mark Scheme" 
              class="exam-ms-image"
              loading="lazy"
              @error="(e) => onImageError(e, subQ.ms_image_path)"
            />
          </div>
        </div>
      </transition>

      <!-- Subquestion Discussion / Notes Drawer -->
      <transition name="slide-down">
        <div v-if="expandedComments[subQ.id]" class="subq-notes-drawer">
          <div class="notes-drawer-header">
            <h5>📝 {{ locale === 'zh' ? '小问专属笔记与讨论' : 'Part Notes & Discussion' }} ({{ subQ.question_raw_number }})</h5>
            <button @click="emit('toggle-comment', subQ.id)" class="close-drawer-mini">&times;</button>
          </div>

          <div class="notes-messages-list">
            <div v-if="!subQComments[subQ.id] || subQComments[subQ.id].length === 0" class="empty-notes">
              {{ t('singleQuestion.noComments') }}
            </div>
            <div v-for="c in subQComments[subQ.id]" :key="c.id" class="notes-item">
              <div class="notes-author">
                <span class="author-name">{{ c.profiles?.display_name || c.author || t('singleQuestion.student') }}</span>
                <span class="notes-time">{{ c.time || new Date(c.created_at).toLocaleTimeString() }}</span>
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
              v-model="newCommentText[subQ.id]" 
              type="text" 
              :placeholder="t('singleQuestion.commentPlaceholder')" 
              @keyup.enter="emit('add-subq-comment', subQ)"
            />
            <button 
              @click="emit('add-subq-comment', subQ)" 
              :disabled="submittingComment[subQ.id]" 
              class="btn btn-primary btn-sm"
            >
              {{ submittingComment[subQ.id] ? (locale === 'zh' ? '发布中...' : 'Posting...') : t('singleQuestion.sendComment') }}
            </button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.seamless-paper-sheet {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid rgba(223, 219, 212, 0.4);
  border-radius: var(--radius-base);
  box-shadow: 0 1px 4px rgba(44, 47, 50, 0.03);
  overflow: hidden;
}

.subq-row-container {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border-subtle);
  position: relative;
  transition: background-color 0.25s ease;
}

.subq-row-container:last-child {
  border-bottom: none;
}

.subq-main-row {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.subq-img-wrap {
  flex: 1;
  min-width: 0;
  line-height: 0;
  background: var(--bg-surface);
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

.subq-action-dock.dock-horizontal {
  width: auto;
  min-width: 90px;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  padding: 6px 10px;
  gap: 6px;
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

.dock-horizontal .dock-badge {
  flex-direction: row;
  gap: 4px;
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
  position: relative;
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

.dock-horizontal .dock-btn {
  width: 32px;
  height: 32px;
}

.dock-btn:hover {
  border-color: var(--border-focus);
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  transform: translateY(-1px);
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
  font-size: 15px;
  line-height: 1;
}

.dock-badge-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  background: var(--accent-primary);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  border-radius: 8px;
  padding: 0 3px;
  line-height: 12px;
  height: 12px;
  min-width: 12px;
  text-align: center;
}

.dock-icon {
  font-size: 0.95rem;
}

.dock-label {
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.subq-ms-drawer {
  background: rgba(245, 240, 232, 0.7);
  border-top: 1px dashed var(--accent-primary);
  padding: 12px 18px;
}

.ms-drawer-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--accent-primary);
  margin-bottom: 8px;
}

.close-drawer-mini {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  color: var(--text-muted);
  cursor: pointer;
}

.ms-drawer-body {
  display: flex;
  justify-content: center;
  background: var(--bg-surface);
  padding: 8px;
  border-radius: 4px;
}

.exam-ms-image {
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.subq-notes-drawer {
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
</style>

