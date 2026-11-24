<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import SqQuestionSheet from './SqQuestionSheet.vue'
import McqQuestionView from './McqQuestionView.vue'
import FavoriteCardItem from './FavoriteCardItem.vue'
import { formatPaperGroupLabel } from '~/composables/usePaperGroup'

const { t, locale } = useI18n()

const props = defineProps({
  mode: {
    type: String, // 'normal' | 'search' | 'favorites'
    default: 'normal'
  },
  // Normal mode props
  questions: { type: Array, default: () => [] },
  availablePapers: { type: Array, default: () => [] },
  selectedPaper: { type: String, default: '' },
  // Search mode props
  searchActiveType: { type: String, default: 'SQ' },
  searchActiveKeyword: { type: String, default: '' },
  searchActivePaper: { type: String, default: '' },
  searchTotalCount: { type: Number, default: 0 },
  searchTotalSubCount: { type: Number, default: 0 },
  isSearching: { type: Boolean, default: false },
  hasMoreSearch: { type: Boolean, default: false },
  isLoadingMore: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  // Favorites mode props
  subjectId: { type: String, default: '' },
  favFilterSubject: { type: String, default: 'ALL' },
  favAvailableSubjects: { type: Array, default: () => [] },
  activeFolder: { type: Object, default: () => ({}) },
  filteredFavoriteItems: { type: Array, default: () => [] },
  currentFolderTotalCount: { type: Number, default: 0 },
  favAvailablePapers: { type: Array, default: () => [] },
  folders: { type: Array, default: () => [] },
  getFolderCount: { type: Function, default: () => 0 },
  isExportingPdf: { type: Boolean, default: false },
  // General props & handlers
  isItemFav: { type: Function, required: true },
  isSubQFav: { type: Function, required: true },
  cdnBase: { type: String, default: '' },
  r2DevUrl: { type: String, default: '' },
  // Notes / Comments state
  subQComments: { type: Object, default: () => ({}) },
  newCommentText: { type: Object, default: () => ({}) },
  submittingComment: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'load-more',
  'update:selectedPaper',
  'update:favFilterBoard',
  'update:favFilterType',
  'update:favFilterPaper',
  'update:favFilterSubject',
  'exit-search',
  'exit-favorites',
  'export-favorites-pdf',
  'select-folder',
  'create-folder',
  'delete-folder',
  'clear-folder',
  'toggle-whole-fav',
  'toggle-subq-fav',
  'remove-favorite',
  'reorder-favorite',
  'copy-stitched',
  'search-paper',
  'add-subq-comment',
  'toggle-like-comment',
  'subq-image-load'
])

// Pagination / Progressive Chunk Rendering for High-Performance Scrolling
const displayedLimit = ref(10)
const sentinelRef = ref(null)
let sentinelObserver = null

// Subquestion individual states
const expandedAnswers = ref({})
const expandedComments = ref({})
const isShortSubQ = ref({})
const copyingCardId = ref('')
const selectedFavId = ref(null)

// Track active visible card index for the Question Rail
const activeCardIndex = ref(0)
let cardIntersectionObserver = null

// Stream List Data based on Mode
const streamItems = computed(() => {
  if (props.mode === 'favorites') {
    return props.filteredFavoriteItems
  }
  return props.questions
})

const visibleItems = computed(() => {
  if (props.mode === 'search') {
    return streamItems.value
  }
  return streamItems.value.slice(0, displayedLimit.value)
})

const hasMoreItems = computed(() => {
  if (props.mode === 'search') {
    return props.hasMoreSearch
  }
  return streamItems.value.length > displayedLimit.value
})

function loadMoreItems() {
  if (props.mode === 'search') {
    if (props.hasMoreSearch && !props.isLoadingMore) {
      emit('load-more')
    }
  } else {
    if (hasMoreItems.value) {
      displayedLimit.value = Math.min(displayedLimit.value + 10, streamItems.value.length)
    }
  }
}

// Reset displayed limit on filter/mode changes (do NOT reset on appending items)
watch(() => [props.mode, props.selectedPaper, props.favFilterSubject, props.searchActiveKeyword, props.searchActivePaper], () => {
  displayedLimit.value = 10
  activeCardIndex.value = 0
  setTimeout(setupCardObserver, 150)
  setTimeout(setupSentinel, 150)
})

function setupSentinel() {
  if (typeof window === 'undefined') return
  if (sentinelObserver) sentinelObserver.disconnect()
  if (!sentinelRef.value) return

  sentinelObserver = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      loadMoreItems()
    }
  }, { rootMargin: '450px' })

  sentinelObserver.observe(sentinelRef.value)
}

function setupCardObserver() {
  if (typeof window === 'undefined') return
  if (cardIntersectionObserver) cardIntersectionObserver.disconnect()

  cardIntersectionObserver = new IntersectionObserver((entries) => {
    const visibleEntries = entries.filter(e => e.isIntersecting)
    if (visibleEntries.length > 0) {
      // Find the card closest to top
      const topEntry = visibleEntries.reduce((prev, curr) => 
        Math.abs(curr.boundingClientRect.top - 80) < Math.abs(prev.boundingClientRect.top - 80) ? curr : prev
      )
      const idxAttr = topEntry.target.getAttribute('data-card-index')
      if (idxAttr !== null) {
        activeCardIndex.value = parseInt(idxAttr, 10)
      }
    }
  }, {
    rootMargin: '-80px 0px -50% 0px',
    threshold: [0, 0.25, 0.5]
  })

  const cards = document.querySelectorAll('.stream-question-card')
  cards.forEach(card => cardIntersectionObserver.observe(card))
}

watch(visibleItems, () => {
  setTimeout(() => {
    setupSentinel()
    setupCardObserver()
  }, 100)
}, { flush: 'post' })

function handleDocumentClick(e) {
  if (selectedFavId.value && !e.target.closest('.fav-card')) {
    selectedFavId.value = null
  }
}

function handleGlobalKeyDown(e) {
  if (props.mode !== 'favorites' || !selectedFavId.value) return
  const targetTag = (e.target?.tagName || '').toLowerCase()
  if (targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable) return

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    emit('reorder-favorite', { id: selectedFavId.value, direction: 'up' })
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    emit('reorder-favorite', { id: selectedFavId.value, direction: 'down' })
  } else if (e.key === 'Escape') {
    selectedFavId.value = null
  }
}

watch(() => props.mode, (newMode) => {
  if (newMode !== 'favorites') {
    selectedFavId.value = null
  }
})

watch(streamItems, (items) => {
  if (selectedFavId.value) {
    const curIdx = items.findIndex(it => it.id === selectedFavId.value)
    if (curIdx >= displayedLimit.value) {
      displayedLimit.value = curIdx + 1
    }
  }
})

onMounted(() => {
  setupSentinel()
  setupCardObserver()
  if (typeof window !== 'undefined') {
    document.addEventListener('click', handleDocumentClick)
    window.addEventListener('keydown', handleGlobalKeyDown)
  }
})

onUnmounted(() => {
  if (sentinelObserver) sentinelObserver.disconnect()
  if (cardIntersectionObserver) cardIntersectionObserver.disconnect()
  if (typeof window !== 'undefined') {
    document.removeEventListener('click', handleDocumentClick)
    window.removeEventListener('keydown', handleGlobalKeyDown)
  }
})

// Scroll directly to a target card index
function scrollToCard(index) {
  if (typeof document === 'undefined') return
  if (index >= displayedLimit.value) {
    displayedLimit.value = Math.min(index + 5, streamItems.value.length)
  }
  setTimeout(() => {
    const el = document.getElementById(`stream-card-${index}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      activeCardIndex.value = index
    }
  }, 50)
}

// Helpers
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

function toggleAnswer(subQId) {
  expandedAnswers.value[subQId] = !expandedAnswers.value[subQId]
}

function toggleComment(subQId) {
  expandedComments.value[subQId] = !expandedComments.value[subQId]
}

async function handleCopyStitched(group) {
  const cardId = group.id || group.groupKey
  copyingCardId.value = cardId
  try {
    emit('copy-stitched', group)
  } finally {
    setTimeout(() => {
      copyingCardId.value = ''
    }, 1200)
  }
}

defineExpose({
  scrollToCard,
  loadMoreItems
})
</script>

<template>
  <div class="stream-viewport-wrapper">
    <!-- Continuous Question Cards Stream -->
    <div class="stream-cards-container">
      <!-- Empty State -->
      <div v-if="streamItems.length === 0" class="stream-empty-state">
        <p v-if="mode === 'search'">{{ t('search.noResults') }}</p>
        <template v-else-if="mode === 'favorites'">
          <p v-if="favFilterSubject !== 'ALL' && currentFolderTotalCount > 0">
            {{ locale === 'zh' ? `当前科目「${favFilterSubject}」在${activeFolder?.name || '此收藏夹'}暂无题目，其他科目共有 ${currentFolderTotalCount} 道收藏` : `No questions in "${activeFolder?.name || 'folder'}" for subject "${favFilterSubject}". (${currentFolderTotalCount} items in other subjects)` }}
          </p>
          <p v-else>{{ t('favoritesView.emptyFolder') }}</p>
          <button 
            v-if="favFilterSubject !== 'ALL' && currentFolderTotalCount > 0"
            @click="emit('update:favFilterSubject', 'ALL')"
            class="btn-exit-mode"
            style="margin-bottom: 8px;"
          >
            {{ locale === 'zh' ? '查看全部科目的收藏' : 'View All Subjects' }}
          </button>
        </template>
        <p v-else>{{ t('galleryNav.noQuestionsFound') }}</p>
        <button 
          v-if="mode !== 'normal'" 
          @click="mode === 'search' ? emit('exit-search') : emit('exit-favorites')" 
          class="btn-exit-mode"
        >
          {{ t('search.returnToQuestion') }}
        </button>
      </div>

      <!-- Stream Cards -->
      <template v-else>
        <!-- FAVORITES INDIVIDUAL CARDS (When in favorites mode) -->
        <template v-if="mode === 'favorites'">
          <FavoriteCardItem
            v-for="(item, idx) in visibleItems" 
            :key="item.id || idx"
            :item="item"
            :index="idx"
            :isSelected="selectedFavId === item.id"
            :isExpanded="Boolean(expandedAnswers[item.id])"
            :cdnBase="props.cdnBase"
            :r2DevUrl="props.r2DevUrl"
            @select="selectedFavId = item.id"
            @search-paper="(paper, type) => emit('search-paper', paper, type)"
            @remove-favorite="(favItem) => emit('remove-favorite', favItem)"
            @toggle-answer="(id) => toggleAnswer(id)"
          />
        </template>

        <!-- NORMAL / SEARCH MODE BIG QUESTION CARDS -->
        <template v-else>
          <div 
            v-for="(group, idx) in visibleItems" 
            :key="group.id || idx"
            :id="`stream-card-${idx}`"
            :data-card-index="idx"
            class="stream-question-card"
            :class="{ 'is-active-card': activeCardIndex === idx }"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="header-tags">
                <span class="tag tag-series">{{ group.series || group.primaryQuestion?.series || 'CAIE' }}</span>
                <button 
                  class="tag tag-paper tag-clickable"
                  @click="emit('search-paper', group.paper_filename, group.paper_type || 'SQ')"
                  :title="`qp:${group.paper_filename}`"
                >
                  📄 {{ group.paper_filename }}
                </button>
                <span class="tag tag-qnum">
                  {{ group.paper_type === 'SQ' ? `Question ${group.main_question_number}` : `Question ${group.question_raw_number}` }}
                </span>
                <!-- Search Match Indicator -->
                <span v-if="group.matchedSubQIds && group.matchedSubQIds.length > 0" class="tag tag-match-pill">
                  🎯 {{ locale === 'zh' ? `命中 ${group.matchedSubQIds.length} 问` : `${group.matchedSubQIds.length} matched` }}
                </span>
              </div>

              <!-- Header Action Buttons (Icon Only) -->
              <div class="header-actions">
                <!-- Favorite Whole Question -->
                <button 
                  @click="emit('toggle-whole-fav', group)" 
                  class="btn-card-action"
                  :class="{ 'btn-fav-active': isItemFav(group.id) || (group.primaryQuestion && isItemFav(group.primaryQuestion.id)) }"
                  :title="isItemFav(group.id) ? t('favoritesView.unfavorite') : t('singleQuestion.favWhole')"
                >
                  <span class="star-icon">{{ isItemFav(group.id) || (group.primaryQuestion && isItemFav(group.primaryQuestion.id)) ? '★' : '☆' }}</span>
                </button>

                <!-- Copy Stitched HD Image (for SQ) -->
                <button 
                  v-if="group.paper_type === 'SQ'"
                  @click="handleCopyStitched(group)"
                  class="btn-card-action btn-stitch"
                  :disabled="copyingCardId === (group.id || group.groupKey)"
                  :title="copyingCardId === (group.id || group.groupKey) ? t('singleQuestion.copying') : t('singleQuestion.copyStitched')"
                >
                  <span>{{ copyingCardId === (group.id || group.groupKey) ? '⏳' : '📋' }}</span>
                </button>
              </div>
            </div>

            <!-- Card Content: SQ Continuous Sheet or MCQ View -->
            <div class="card-content-wrap">
              <!-- SQ Sheet -->
              <SqQuestionSheet 
                v-if="group.paper_type === 'SQ'"
                :groupQuestions="group.subQuestions || [group]"
                :matchedSubQIds="group.matchedSubQIds || []"
                :isSearchActive="Boolean(searchActiveKeyword)"
                :expandedAnswers="expandedAnswers"
                :expandedComments="expandedComments"
                :isShortSubQ="isShortSubQ"
                :subQComments="subQComments"
                :newCommentText="newCommentText"
                :submittingComment="submittingComment"
                :isSubQFav="isSubQFav"
                :cdnBase="cdnBase"
                :r2DevUrl="r2DevUrl"
                @toggle-answer="toggleAnswer"
                @toggle-comment="toggleComment"
                @toggle-subq-fav="(subQ) => emit('toggle-subq-fav', subQ)"
                @add-subq-comment="(subQ) => emit('add-subq-comment', subQ)"
                @toggle-like-comment="(c) => emit('toggle-like-comment', c)"
                @subq-image-load="(e, id) => emit('subq-image-load', e, id)"
              />

              <!-- MCQ View -->
              <McqQuestionView 
                v-else
                :question="group.primaryQuestion || group"
                :isAnswerExpanded="expandedAnswers[group.id]"
                :isFav="isItemFav(group.id)"
                :cdnBase="cdnBase"
                :r2DevUrl="r2DevUrl"
                @toggle-answer="toggleAnswer(group.id)"
                @toggle-fav="emit('toggle-whole-fav', group)"
              />
            </div>
          </div>
        </template>

        <!-- Infinite Scroll Sentinel Element -->
        <div ref="sentinelRef" class="stream-sentinel">
          <div v-if="hasMoreItems" class="sentinel-loading">
            <span class="sentinel-spinner"></span>
            <span class="sentinel-text">{{ locale === 'zh' ? '正在载入更多题目...' : 'Loading more questions...' }}</span>
          </div>
          <div v-else-if="streamItems.length > 5" class="sentinel-end">
            <span class="sentinel-end-dot">&bull;</span>
            <span class="sentinel-end-text">{{ locale === 'zh' ? '已展示全部题目' : 'All questions loaded' }}</span>
            <span class="sentinel-end-dot">&bull;</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.stream-viewport-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

.btn-exit-mode {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 0.78rem;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-exit-mode:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: var(--accent-primary-light);
}

/* 2. Stream Question Cards */
.stream-cards-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stream-question-card {
  scroll-margin-top: 110px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  box-shadow: 0 4px 16px rgba(44, 47, 50, 0.05);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.stream-question-card:hover {
  box-shadow: 0 6px 20px rgba(44, 47, 50, 0.08);
}

.stream-question-card.is-active-card {
  border-color: rgba(194, 65, 40, 0.4);
}

.stream-question-card.fav-card {
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
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

.tag-match-pill {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
  font-size: 0.72rem;
  font-weight: 700;
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

.card-content-wrap {
  padding: 8px 12px 16px;
}

/* Empty State */
.stream-empty-state {
  padding: 60px 20px;
  text-align: center;
  background: var(--bg-surface);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-card);
  color: var(--text-muted);
}

/* Sentinel Infinite Scroll */
.stream-sentinel {
  padding: 24px 0 36px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.sentinel-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.sentinel-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.sentinel-end {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 0.78rem;
  opacity: 0.7;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .stream-bar-normal {
    flex-direction: column;
    align-items: stretch;
  }
  .question-locator-rail {
    order: 3;
    width: 100%;
  }
}
</style>

