<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  isExpanded: {
    type: Boolean,
    default: false
  },
  cdnBase: {
    type: String,
    default: ''
  },
  r2DevUrl: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select', 'search-paper', 'remove-favorite', 'toggle-answer'])
const { t } = useI18n()

function cleanPaperName(filename) {
  if (!filename) return ''
  return String(filename).replace(/\.pdf$/i, '')
}

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
  <div 
    :id="`stream-card-${index}`"
    :data-card-index="index"
    :data-fav-id="item.id"
    class="stream-question-card fav-card"
    :class="{ 'is-selected-gold': isSelected }"
    @click="emit('select', item.id)"
  >
    <div class="card-header">
      <div class="header-tags">
        <button 
          type="button"
          class="tag tag-paper tag-clickable"
          @click.stop="emit('search-paper', item.paperFilename, item.paperType || 'SQ')"
          :title="`qp:${cleanPaperName(item.paperFilename)}`"
        >
          📄 {{ cleanPaperName(item.paperFilename) }}
        </button>
        <span class="tag tag-qnum">
          {{ item.isSub ? `Part ${item.subQNum}` : `Q${item.subQNum || ''}` }}
        </span>
      </div>
      <div class="header-actions">
        <button 
          type="button"
          @click.stop="emit('remove-favorite', item)" 
          class="btn-card-action btn-fav-active"
          :title="t('favoritesView.unfavorite')"
        >
          ★
        </button>
        <button 
          type="button"
          @click.stop="emit('toggle-answer', item.id)" 
          class="btn-card-action"
          :class="{ 'btn-action-active': isExpanded }"
          :title="isExpanded ? t('favoritesView.hideAnswer') : t('favoritesView.viewAnswer')"
        >
          💡
        </button>
      </div>
    </div>

    <!-- Favorite Card Body -->
    <div class="card-body">
      <img 
        v-if="item.imagePath" 
        :src="getImageUrl(item.imagePath)" 
        :alt="item.paperFilename" 
        class="stream-q-image"
        loading="eager"
        decoding="async"
        @error="(e) => onImageError(e, item.imagePath)"
      />
      <p v-else-if="item.details" class="card-text-fallback">{{ item.details }}</p>

      <!-- Mark Scheme Drawer -->
      <transition name="drawer-slide">
        <div v-if="isExpanded" class="stream-ms-drawer">
          <div class="ms-drawer-header">
            <span>✨ {{ t('singleQuestion.viewMs') }}</span>
          </div>
          <img 
            v-if="item.msImagePath" 
            :src="getImageUrl(item.msImagePath)" 
            alt="Mark Scheme" 
            class="stream-ms-image"
            loading="eager"
            decoding="async"
            @error="(e) => onImageError(e, item.msImagePath)"
          />
          <div v-else-if="item.msDetails" class="stream-ms-text">{{ item.msDetails }}</div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.stream-question-card.fav-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(44, 47, 50, 0.04);
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.stream-question-card.fav-card:hover {
  box-shadow: 0 6px 20px rgba(44, 47, 50, 0.08);
}

.stream-question-card.fav-card.is-selected-gold {
  border: 2px solid #d97706 !important;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.35), 0 8px 24px rgba(217, 119, 6, 0.14) !important;
  position: relative;
  z-index: 5;
}

.card-header {
  padding: 12px 18px;
  background: var(--bg-surface-subtle);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.header-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  font-size: 0.74rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
}

.tag-series {
  background: #f1f3f5;
  color: #495057;
  border: 1px solid #dee2e6;
}

.tag-paper {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.tag-clickable {
  cursor: pointer;
  transition: all 0.15s ease;
}

.tag-clickable:hover {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary-border);
  color: var(--accent-primary);
}

.tag-qnum {
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--text-main);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-card-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-base);
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.94rem;
  transition: all 0.15s ease;
  padding: 0;
}

.btn-card-action:hover {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary-border);
  color: var(--accent-primary);
  transform: translateY(-1px);
}

.btn-card-action.btn-fav-active {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.btn-card-action.btn-action-active {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #b45309;
}

.fav-card .card-body {
  padding: 16px 20px;
}

.stream-q-image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  display: block;
}

.card-text-fallback {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.stream-ms-drawer {
  margin-top: 14px;
  padding: 14px;
  background: #fdfaf6;
  border: 1px dashed var(--accent-primary-border);
  border-radius: 6px;
}

.ms-drawer-header {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--accent-primary);
  margin-bottom: 8px;
}

.stream-ms-image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  display: block;
}

.stream-ms-text {
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 1000px;
  overflow: hidden;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
  padding-bottom: 0;
}

@media (max-width: 768px) {
  .card-header {
    padding: 8px 10px;
    gap: 6px;
  }
  .fav-card .card-body {
    padding: 6px 4px 10px;
  }
  .btn-card-action {
    width: 28px;
    height: 28px;
    font-size: 0.85rem;
  }
  .tag {
    font-size: 0.7rem;
    padding: 2px 6px;
  }
}
</style>
