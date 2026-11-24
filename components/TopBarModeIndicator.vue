<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFavorites } from '~/composables/useFavorites'
import { useQuestionSearch } from '~/composables/useQuestionSearch'

const route = useRoute()
const { t, locale } = useI18n()
const favoritesStore = useFavorites()
const searchStore = useQuestionSearch()

// Detect whether we are on a subject questions page
const isSubjectPage = computed(() => {
  return Boolean(route.params.id)
})

// Current Mode: 'favorites' | 'search' | 'normal' | 'none'
const currentMode = computed(() => {
  if (favoritesStore.isFavoriteMode.value) return 'favorites'
  if (searchStore.isSearchMode.value) return 'search'
  if (isSubjectPage.value) return 'normal'
  return 'none'
})

// Clean paper filename helper (e.g. 0625_w25_qp_63.pdf -> 0625_w25_qp_63)
function cleanPaperName(name) {
  if (!name) return ''
  return String(name).replace(/\.pdf$/i, '')
}

// Search label display
const searchDisplayQuery = computed(() => {
  const kw = searchStore.searchActiveKeyword.value || ''
  if (kw.toLowerCase().startsWith('qp:')) {
    return cleanPaperName(kw.slice(3).trim())
  }
  return kw || searchStore.searchActivePaper.value || ''
})

const isQpSearch = computed(() => {
  const kw = searchStore.searchActiveKeyword.value || ''
  return kw.toLowerCase().startsWith('qp:')
})

// Folder display name for favorites
const currentFolderName = computed(() => {
  return favoritesStore.activeFolder.value?.name || (locale.value === 'zh' ? '默认收藏夹' : 'Favorites')
})

const currentFolderCount = computed(() => {
  if (!favoritesStore.activeFolder.value) return favoritesStore.favorites.value.length
  return favoritesStore.getFolderCount(favoritesStore.activeFolder.value.id)
})

// Exit Actions
function exitSearch() {
  searchStore.exitSearchMode()
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function exitFavorites() {
  favoritesStore.isFavoriteMode.value = false
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function scrollToTop() {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <div v-if="currentMode !== 'none'" class="top-bar-mode-indicator">
    <!-- 1. Search Mode Pill (搜题状态) -->
    <div 
      v-if="currentMode === 'search'" 
      class="mode-pill pill-search"
      :title="locale === 'zh' ? '正在查看搜索结果，点击右侧退出返回默认题库' : 'Search results mode'"
    >
      <span class="pill-icon">{{ isQpSearch ? '📄' : '🔍' }}</span>
      <span class="pill-text">
        <span class="pill-query-label">{{ isQpSearch ? (locale === 'zh' ? '卷号' : 'Paper') : (locale === 'zh' ? '搜题' : 'Search') }}:</span>
        <strong class="pill-query-val" :title="searchDisplayQuery">{{ searchDisplayQuery }}</strong>
        <span v-if="searchStore.searchTotalCount.value > 0" class="pill-count">
          · {{ searchStore.searchTotalCount.value }} {{ locale === 'zh' ? '题' : 'Q' }}
        </span>
      </span>
      <button 
        type="button" 
        class="pill-exit-btn" 
        @click.stop="exitSearch" 
        :title="locale === 'zh' ? '退出搜题，返回默认题库' : 'Exit search'"
      >
        &times;
      </button>
    </div>

    <!-- 2. Favorites Mode Pill (收藏夹状态) -->
    <div 
      v-else-if="currentMode === 'favorites'" 
      class="mode-pill pill-favorites"
      :title="locale === 'zh' ? '正在查看收藏夹，点击右侧退出返回默认题库' : 'Favorites mode'"
    >
      <span class="pill-icon">★</span>
      <span class="pill-text">
        <span class="pill-query-label">{{ locale === 'zh' ? '收藏夹' : 'Fav' }}:</span>
        <strong class="pill-query-val" :title="currentFolderName">{{ currentFolderName }}</strong>
        <span class="pill-count">· {{ currentFolderCount }} {{ locale === 'zh' ? '题' : 'Q' }}</span>
      </span>
      <button 
        type="button" 
        class="pill-exit-btn" 
        @click.stop="exitFavorites" 
        :title="locale === 'zh' ? '退出收藏夹，返回默认题库' : 'Exit favorites'"
      >
        &times;
      </button>
    </div>

    <!-- 3. Normal Mode Pill (默认状态: 默认题库) -->
    <button 
      v-else-if="currentMode === 'normal'" 
      type="button"
      class="mode-pill pill-normal"
      @click="scrollToTop"
      :title="locale === 'zh' ? '当前处于默认题库（点击回到顶部）' : 'Default Bank (Click to scroll to top)'"
    >
      <span class="pill-icon">📖</span>
      <span class="pill-text">{{ locale === 'zh' ? '默认题库' : 'Default Bank' }}</span>
    </button>
  </div>
</template>

<style scoped>
.top-bar-mode-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mode-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  border-radius: 14px;
  font-size: 0.78rem;
  line-height: 1;
  box-sizing: border-box;
  user-select: none;
  transition: all 0.18s ease;
  white-space: nowrap;
}

/* 1. Normal Mode: 默认题库 (极简温润) */
.pill-normal {
  background: rgba(245, 241, 235, 0.75);
  border: 1px solid rgba(220, 214, 203, 0.7);
  color: var(--text-secondary);
  font-weight: 600;
  padding: 0 10px;
  cursor: pointer;
}

.pill-normal:hover {
  background: rgba(240, 234, 224, 0.95);
  border-color: var(--accent-primary-border);
  color: var(--accent-primary);
  transform: translateY(-0.5px);
}

.pill-normal .pill-icon {
  font-size: 0.85rem;
}

/* 2. Search Mode (清雅水墨蓝) */
.pill-search {
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  color: #3730a3;
  padding: 0 6px 0 10px;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(67, 56, 202, 0.08);
}

.pill-search .pill-icon {
  font-size: 0.82rem;
}

.pill-search .pill-query-label {
  color: #6366f1;
  margin-right: 4px;
  font-size: 0.74rem;
}

.pill-search .pill-query-val {
  font-weight: 700;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: middle;
}

.pill-search .pill-count {
  font-size: 0.72rem;
  color: #6366f1;
  margin-left: 4px;
}

/* 3. Favorites Mode (雅致琥珀金) */
.pill-favorites {
  background: #fef3c7;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 0 6px 0 10px;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(217, 119, 6, 0.08);
}

.pill-favorites .pill-icon {
  color: #d97706;
  font-size: 0.85rem;
}

.pill-favorites .pill-query-label {
  color: #b45309;
  margin-right: 4px;
  font-size: 0.74rem;
}

.pill-favorites .pill-query-val {
  font-weight: 700;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: middle;
}

.pill-favorites .pill-count {
  font-size: 0.72rem;
  color: #b45309;
  margin-left: 4px;
}

/* Common Exit Button inside Pill */
.pill-exit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  color: inherit;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  margin-left: 6px;
  padding: 0;
  transition: all 0.15s ease;
}

.pill-search .pill-exit-btn:hover {
  background: #4338ca;
  color: #ffffff;
}

.pill-favorites .pill-exit-btn:hover {
  background: #b45309;
  color: #ffffff;
}

/* Responsive adjustment for Mobile */
@media (max-width: 768px) {
  .pill-query-label {
    display: none;
  }
  .pill-search .pill-query-val,
  .pill-favorites .pill-query-val {
    max-width: 80px;
  }
}
</style>
