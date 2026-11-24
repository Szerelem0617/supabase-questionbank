<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const { t, locale } = useI18n()

const props = defineProps({
  sqPaperOptions: { type: Array, default: () => [] },
  mcqPaperOptions: { type: Array, default: () => [] },
  isSearching: { type: Boolean, default: false },
  searchActiveType: { type: String, default: 'SQ' }
})

const sqKeyword = defineModel('sqKeyword', { type: String, default: '' })
const sqSelectedPaper = defineModel('sqSelectedPaper', { type: String, default: '' })
const mcqKeyword = defineModel('mcqKeyword', { type: String, default: '' })
const mcqSelectedPaper = defineModel('mcqSelectedPaper', { type: String, default: '' })

const emit = defineEmits(['search'])

// Dropdown open states
const isSqDropdownOpen = ref(false)
const isMcqDropdownOpen = ref(false)

const sqDropdownRef = ref(null)
const mcqDropdownRef = ref(null)

// Current selected label for SQ
const selectedSqLabel = computed(() => {
  if (!sqSelectedPaper.value) {
    return locale.value === 'zh' ? '全部卷种' : 'All Papers'
  }
  const match = props.sqPaperOptions.find(opt => (opt.value || opt) === sqSelectedPaper.value)
  return match ? (match.label || match.value || match) : sqSelectedPaper.value
})

// Current selected label for MCQ
const selectedMcqLabel = computed(() => {
  if (!mcqSelectedPaper.value) {
    return locale.value === 'zh' ? '全部卷种' : 'All Papers'
  }
  const match = props.mcqPaperOptions.find(opt => (opt.value || opt) === mcqSelectedPaper.value)
  return match ? (match.label || match.value || match) : mcqSelectedPaper.value
})

function toggleSqDropdown() {
  isSqDropdownOpen.value = !isSqDropdownOpen.value
  isMcqDropdownOpen.value = false
}

function toggleMcqDropdown() {
  isMcqDropdownOpen.value = !isMcqDropdownOpen.value
  isSqDropdownOpen.value = false
}

function selectSqPaper(val) {
  sqSelectedPaper.value = val
  isSqDropdownOpen.value = false
  emit('search', 'SQ')
}

function selectMcqPaper(val) {
  mcqSelectedPaper.value = val
  isMcqDropdownOpen.value = false
  emit('search', 'MCQ')
}

function handleGlobalClick(e) {
  if (sqDropdownRef.value && !sqDropdownRef.value.contains(e.target)) {
    isSqDropdownOpen.value = false
  }
  if (mcqDropdownRef.value && !mcqDropdownRef.value.contains(e.target)) {
    isMcqDropdownOpen.value = false
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    isSqDropdownOpen.value = false
    isMcqDropdownOpen.value = false
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    document.addEventListener('click', handleGlobalClick)
    window.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    document.removeEventListener('click', handleGlobalClick)
    window.removeEventListener('keydown', handleKeyDown)
  }
})
</script>

<template>
  <div class="dual-search-container">
    <!-- SQ Search Row -->
    <div class="search-row search-row-sq">
      <span class="type-pill pill-sq">{{ locale === 'zh' ? 'SQ 简答' : 'SQ' }}</span>
      <div class="search-input-box">
        <span class="search-icon">🔍</span>
        <input 
          v-model="sqKeyword" 
          type="text" 
          :placeholder="t('search.sqPlaceholder')"
          class="compact-input"
          @keyup.enter="emit('search', 'SQ')"
          @keydown.esc="$event.target.blur()"
        />
        <button v-if="sqKeyword" @click="sqKeyword = ''" class="clear-btn">&times;</button>
      </div>

      <!-- Custom Downward Paper Dropdown for SQ -->
      <div class="custom-select-wrapper" ref="sqDropdownRef">
        <button 
          type="button" 
          class="custom-select-trigger" 
          :class="{ 'is-open': isSqDropdownOpen }"
          @click="toggleSqDropdown"
          :title="t('search.sqPaperPlaceholder')"
        >
          <span class="trigger-text">{{ selectedSqLabel }}</span>
          <span class="trigger-caret" :class="{ 'caret-up': isSqDropdownOpen }">▾</span>
        </button>

        <transition name="dropdown-slide">
          <div v-if="isSqDropdownOpen" class="custom-dropdown-menu">
            <div 
              class="custom-dropdown-item" 
              :class="{ 'is-selected': !sqSelectedPaper }"
              @click="selectSqPaper('')"
            >
              <span>{{ locale === 'zh' ? '全部卷种' : 'All Papers' }}</span>
              <span v-if="!sqSelectedPaper" class="item-check">✓</span>
            </div>
            <div 
              v-for="opt in sqPaperOptions" 
              :key="opt.value || opt"
              class="custom-dropdown-item"
              :class="{ 'is-selected': sqSelectedPaper === (opt.value || opt) }"
              @click="selectSqPaper(opt.value || opt)"
            >
              <span>{{ opt.label || opt.value || opt }}</span>
              <span v-if="sqSelectedPaper === (opt.value || opt)" class="item-check">✓</span>
            </div>
          </div>
        </transition>
      </div>

      <button 
        @click="emit('search', 'SQ')" 
        :disabled="isSearching && searchActiveType === 'SQ'" 
        class="btn btn-search btn-search-sq"
      >
        {{ (isSearching && searchActiveType === 'SQ') ? t('search.searching') : t('search.sqSearchBtn') }}
      </button>
    </div>

    <!-- MCQ Search Row -->
    <div class="search-row search-row-mcq">
      <span class="type-pill pill-mcq">{{ locale === 'zh' ? 'MCQ 选择' : 'MCQ' }}</span>
      <div class="search-input-box">
        <span class="search-icon">🔍</span>
        <input 
          v-model="mcqKeyword" 
          type="text" 
          :placeholder="t('search.mcqPlaceholder')"
          class="compact-input"
          @keyup.enter="emit('search', 'MCQ')"
          @keydown.esc="$event.target.blur()"
        />
        <button v-if="mcqKeyword" @click="mcqKeyword = ''" class="clear-btn">&times;</button>
      </div>

      <!-- Custom Downward Paper Dropdown for MCQ -->
      <div class="custom-select-wrapper" ref="mcqDropdownRef">
        <button 
          type="button" 
          class="custom-select-trigger" 
          :class="{ 'is-open': isMcqDropdownOpen }"
          @click="toggleMcqDropdown"
          :title="t('search.mcqPaperPlaceholder')"
        >
          <span class="trigger-text">{{ selectedMcqLabel }}</span>
          <span class="trigger-caret" :class="{ 'caret-up': isMcqDropdownOpen }">▾</span>
        </button>

        <transition name="dropdown-slide">
          <div v-if="isMcqDropdownOpen" class="custom-dropdown-menu">
            <div 
              class="custom-dropdown-item" 
              :class="{ 'is-selected': !mcqSelectedPaper }"
              @click="selectMcqPaper('')"
            >
              <span>{{ locale === 'zh' ? '全部卷种' : 'All Papers' }}</span>
              <span v-if="!mcqSelectedPaper" class="item-check">✓</span>
            </div>
            <div 
              v-for="opt in mcqPaperOptions" 
              :key="opt.value || opt"
              class="custom-dropdown-item"
              :class="{ 'is-selected': mcqSelectedPaper === (opt.value || opt) }"
              @click="selectMcqPaper(opt.value || opt)"
            >
              <span>{{ opt.label || opt.value || opt }}</span>
              <span v-if="mcqSelectedPaper === (opt.value || opt)" class="item-check">✓</span>
            </div>
          </div>
        </transition>
      </div>

      <button 
        @click="emit('search', 'MCQ')" 
        :disabled="isSearching && searchActiveType === 'MCQ'" 
        class="btn btn-search btn-search-mcq"
      >
        {{ (isSearching && searchActiveType === 'MCQ') ? t('search.searching') : t('search.mcqSearchBtn') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.dual-search-container {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  padding: 12px 16px;
  margin-bottom: 14px;
  box-shadow: var(--shadow-paper);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-pill {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 5px 10px;
  border-radius: 6px;
  white-space: nowrap;
  user-select: none;
}

.pill-sq {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  border: 1px solid var(--accent-primary-border);
}

.pill-mcq {
  background: rgba(43, 92, 143, 0.08);
  color: #2b5c8f;
  border: 1px solid rgba(43, 92, 143, 0.22);
}

.search-input-box {
  flex: 1;
  display: flex;
  align-items: center;
  position: relative;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  transition: all 0.18s ease;
}

.search-input-box:focus-within {
  border-color: var(--border-focus);
  background: var(--bg-surface);
  box-shadow: 0 0 0 3px var(--accent-primary-light);
}

.search-input-box .search-icon {
  position: absolute;
  left: 10px;
  font-size: 0.85rem;
  color: var(--text-muted);
  pointer-events: none;
}

.compact-input {
  width: 100%;
  padding: 7px 30px 7px 32px;
  border: none;
  background: transparent;
  font-size: 0.84rem;
  color: var(--text-main);
  outline: none;
}

.clear-btn {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  font-size: 1.1rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
}

.clear-btn:hover {
  color: var(--text-main);
}

/* Custom Downward Dropdown Wrapper */
.custom-select-wrapper {
  position: relative;
  min-width: 130px;
  max-width: 190px;
}

.custom-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  font-size: 0.8rem;
  color: var(--text-main);
  background: var(--bg-input);
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap;
  box-sizing: border-box;
}

.custom-select-trigger:hover,
.custom-select-trigger.is-open {
  border-color: var(--border-focus);
  background: var(--bg-surface);
}

.trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trigger-caret {
  font-size: 0.72rem;
  color: var(--text-muted);
  transition: transform 0.18s ease;
  flex-shrink: 0;
}

.trigger-caret.caret-up {
  transform: rotate(180deg);
}

/* 下拉菜单面板：严格从触发器正下方自然伸出 */
.custom-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 100%;
  width: max-content;
  max-width: 240px;
  max-height: 220px;
  overflow-y: auto;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-base);
  box-shadow: 0 8px 24px rgba(44, 47, 50, 0.12), 0 2px 6px rgba(44, 47, 50, 0.04);
  padding: 4px;
  z-index: 100;
  box-sizing: border-box;
}

.custom-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.custom-dropdown-item:hover {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.custom-dropdown-item.is-selected {
  font-weight: 700;
  color: var(--accent-primary);
  background: rgba(194, 65, 40, 0.06);
}

.item-check {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.dropdown-slide-enter-active,
.dropdown-slide-leave-active {
  transition: all 0.16s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-slide-enter-from,
.dropdown-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.btn-search {
  padding: 6px 14px;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: var(--radius-base);
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.16s ease;
}

.btn-search-sq {
  background: var(--accent-primary);
  color: #ffffff;
}

.btn-search-sq:hover:not(:disabled) {
  background: var(--accent-primary-hover);
}

.btn-search-mcq {
  background: #2b5c8f;
  color: #ffffff;
}

.btn-search-mcq:hover:not(:disabled) {
  background: #1f456c;
}

.btn-search:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .dual-search-container {
    padding: 10px 10px;
    gap: 10px;
  }
  .search-row {
    flex-wrap: wrap;
    gap: 8px;
  }
  .type-pill {
    order: 1;
  }
  .search-input-box {
    order: 2;
    flex: 1 1 calc(100% - 60px);
    min-width: 140px;
  }
  .custom-select-wrapper {
    order: 3;
    flex: 1 1 auto;
    min-width: 0;
    max-width: none;
  }
  .btn-search {
    order: 4;
    flex-shrink: 0;
    padding: 6px 14px;
  }
}
</style>
