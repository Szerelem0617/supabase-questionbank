<script setup>
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
        />
        <button v-if="sqKeyword" @click="sqKeyword = ''" class="clear-btn">&times;</button>
      </div>
      <select v-model="sqSelectedPaper" class="paper-dropdown" :title="t('search.sqPaperPlaceholder')">
        <option value="">{{ t('search.allPapers') }} ({{ sqPaperOptions.length }})</option>
        <option v-for="p in sqPaperOptions" :key="p" :value="p">{{ p }}</option>
      </select>
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
        />
        <button v-if="mcqKeyword" @click="mcqKeyword = ''" class="clear-btn">&times;</button>
      </div>
      <select v-model="mcqSelectedPaper" class="paper-dropdown" :title="t('search.mcqPaperPlaceholder')">
        <option value="">{{ t('search.allPapers') }} ({{ mcqPaperOptions.length }})</option>
        <option v-for="p in mcqPaperOptions" :key="p" :value="p">{{ p }}</option>
      </select>
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

.paper-dropdown {
  padding: 6px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  font-size: 0.8rem;
  color: var(--text-main);
  background: var(--bg-input);
  outline: none;
  max-width: 190px;
  cursor: pointer;
  transition: border-color 0.16s ease;
}

.paper-dropdown:focus {
  border-color: var(--border-focus);
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
</style>

