<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import SqQuestionSheet from './SqQuestionSheet.vue'
import McqQuestionView from './McqQuestionView.vue'

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
  'update:selectedPaper',
  'update:favFilterBoard',
  'update:favFilterType',
  'update:favFilterPaper',
  'update:favFilterSubject',
  'exit-search',
  'exit-favorites',
  'select-folder',
  'create-folder',
  'delete-folder',
  'clear-folder',
  'toggle-whole-fav',
  'toggle-subq-fav',
  'remove-favorite',
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
  return streamItems.value.slice(0, displayedLimit.value)
})

const hasMoreItems = computed(() => {
  return streamItems.value.length > displayedLimit.value
})

function loadMoreItems() {
  if (hasMoreItems.value) {
    displayedLimit.value = Math.min(displayedLimit.value + 10, streamItems.value.length)
  }
}

// Reset displayed limit on dataset changes
watch(() => [props.mode, props.selectedPaper, props.questions.length, props.filteredFavoriteItems.length], () => {
  displayedLimit.value = 10
  activeCardIndex.value = 0
  setTimeout(setupCardObserver, 150)
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

onMounted(() => {
  setupSentinel()
  setupCardObserver()
})

onUnmounted(() => {
  if (sentinelObserver) sentinelObserver.disconnect()
  if (cardIntersectionObserver) cardIntersectionObserver.disconnect()
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
    <!-- 1. Top Context Banner Bar (Active only in Search & Favorites modes) -->
    <div v-if="mode !== 'normal'" class="stream-top-bar">
      <!-- Search Mode Bar -->
      <div v-if="mode === 'search'" class="stream-bar-search">
        <div class="search-banner-info">
          <span class="search-badge" :class="searchActiveType === 'SQ' ? 'badge-sq' : 'badge-mcq'">
            {{ searchActiveType }}
          </span>
          <span class="search-summary">
            <template v-if="searchActiveType === 'SQ'">
              <strong>{{ t('search.foundSqCount', { count: searchTotalCount }) }}</strong>
              <span v-if="searchTotalSubCount" class="subcount-hint"> ({{ t('search.matchedParts', { count: searchTotalSubCount }) }})</span>
            </template>
            <template v-else>
              <strong>{{ t('search.foundCount', { count: searchTotalCount }) }}</strong>
            </template>
            <span v-if="searchActiveKeyword" class="search-kw-tag">"{{ searchActiveKeyword }}"</span>
            <span v-if="searchActivePaper" class="search-paper-tag">📄 {{ searchActivePaper }}</span>
          </span>
        </div>
        <button @click="emit('exit-search')" class="btn-exit-mode" :title="t('search.returnToQuestion')">
          &times; {{ t('search.returnToQuestion') }}
        </button>
      </div>

      <!-- Favorites Mode Bar -->
      <div v-else-if="mode === 'favorites'" class="stream-bar-fav">
        <div class="fav-banner-info">
          <span class="fav-title-pill">📌 {{ activeFolder?.name || t('galleryNav.defaultFolder') }}</span>
          <span class="fav-count-pill">{{ filteredFavoriteItems.length }} / {{ currentFolderTotalCount }} {{ locale === 'zh' ? '道' : 'items' }}</span>
        </div>

        <!-- Subject Scope Switcher (全部科目 vs 当前科目 vs 各科目) -->
        <div class="fav-subject-scope-bar">
          <span class="scope-label">{{ locale === 'zh' ? '范围:' : 'Scope:' }}</span>
          <div class="scope-pills-wrap">
            <!-- 1. 全部科目 (主页点收藏默认显示全部) -->
            <button 
              type="button"
              class="scope-pill-btn"
              :class="{ 'is-active': favFilterSubject === 'ALL' }"
              @click="emit('update:favFilterSubject', 'ALL')"
              :title="locale === 'zh' ? '展示全部科目的收藏' : 'View all subjects'"
            >
              {{ locale === 'zh' ? '全部科目' : 'All Subjects' }} ({{ currentFolderTotalCount }})
            </button>

            <!-- 2. 当前科目 (若不在 availableSubjects 列表中，单独展示当前科目 pill 为 0) -->
            <button 
              v-if="subjectId && !favAvailableSubjects.some(s => s.id === subjectId)"
              type="button"
              class="scope-pill-btn"
              :class="{ 'is-active': favFilterSubject === subjectId }"
              @click="emit('update:favFilterSubject', subjectId)"
              :title="locale === 'zh' ? '当前科目' : 'Current subject'"
            >
              <span class="current-badge-dot">●</span>
              {{ subjectId }} (0)
            </button>

            <!-- 3. 有收藏记录的具体科目 -->
            <button 
              v-for="s in favAvailableSubjects"
              :key="s.id"
              type="button"
              class="scope-pill-btn"
              :class="{ 'is-active': favFilterSubject === s.id }"
              @click="emit('update:favFilterSubject', s.id)"
              :title="s.id === subjectId ? (locale === 'zh' ? '当前科目' : 'Current subject') : s.id"
            >
              <span v-if="s.id === subjectId" class="current-badge-dot">●</span>
              {{ s.id }} ({{ s.count }})
            </button>
          </div>
        </div>

        <button @click="emit('exit-favorites')" class="btn-exit-mode" :title="t('flow.exitFavorites')">
          &times; {{ t('flow.exitFavorites') }}
        </button>
      </div>
    </div>

    <!-- 2. Continuous Question Cards Stream -->
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
          <div 
            v-for="(item, idx) in visibleItems" 
            :key="item.id || idx"
            :id="`stream-card-${idx}`"
            :data-card-index="idx"
            class="stream-question-card fav-card"
          >
            <div class="card-header">
              <div class="header-tags">
                <span class="tag tag-series">{{ item.board || 'CAIE' }}</span>
                <button 
                  class="tag tag-paper tag-clickable"
                  @click="emit('search-paper', item.paperFilename, item.paperType || 'SQ')"
                  :title="`qp:${item.paperFilename}`"
                >
                  📄 {{ item.paperFilename }}
                </button>
                <span class="tag tag-qnum">
                  {{ item.isSub ? `Part ${item.subQNum}` : `Q${item.subQNum || ''}` }}
                </span>
              </div>
              <div class="header-actions">
                <button 
                  @click="emit('remove-favorite', item)" 
                  class="btn-card-action btn-fav-active"
                  :title="t('favoritesView.unfavorite')"
                >
                  ★
                </button>
                <button 
                  @click="toggleAnswer(item.id)" 
                  class="btn-card-action"
                  :class="{ 'btn-action-active': expandedAnswers[item.id] }"
                  :title="expandedAnswers[item.id] ? t('favoritesView.hideAnswer') : t('favoritesView.viewAnswer')"
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
                <div v-if="expandedAnswers[item.id]" class="stream-ms-drawer">
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

/* 1. Top Unified Stream Bar */
.stream-top-bar {
  position: sticky;
  top: 60px;
  z-index: 40;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-base);
  box-shadow: 0 4px 14px rgba(44, 47, 50, 0.05);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 8px 16px;
  transition: all 0.2s ease;
}

/* Search & Favorites Mode Bars */
.stream-bar-search,
.stream-bar-fav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.search-banner-info,
.fav-banner-info {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}

.search-badge {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
}

.badge-sq {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  border: 1px solid var(--accent-primary-border);
}

.badge-mcq {
  background: #eef2ff;
  color: #4338ca;
  border: 1px solid #c7d2fe;
}

.search-summary {
  font-size: 0.84rem;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.search-kw-tag,
.search-paper-tag {
  background: var(--bg-surface-subtle);
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.fav-title-pill {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--text-main);
}

.fav-count-pill {
  font-size: 0.78rem;
  color: var(--text-muted);
  background: var(--bg-surface-subtle);
  padding: 2px 8px;
  border-radius: 12px;
}

/* Subject Scope Bar */
.fav-subject-scope-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  margin: 0 14px;
}

.scope-label {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  white-space: nowrap;
}

.scope-pills-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 0;
  scrollbar-width: none;
}

.scope-pills-wrap::-webkit-scrollbar {
  display: none;
}

.scope-pill-btn {
  padding: 3px 9px;
  font-size: 0.76rem;
  font-weight: 600;
  font-family: inherit;
  border-radius: 6px;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.scope-pill-btn:hover {
  border-color: var(--border-color);
  color: var(--text-main);
  background: var(--bg-surface);
}

.scope-pill-btn.is-active {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary-border);
  color: var(--accent-primary);
  font-weight: 700;
}

.current-badge-dot {
  color: var(--accent-primary);
  font-size: 0.65rem;
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

/* Favorites card specific styles */
.fav-card .card-body {
  padding: 16px 20px;
}

.stream-q-image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  display: block;
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

