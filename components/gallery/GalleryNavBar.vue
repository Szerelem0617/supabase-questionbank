<script setup>
import { ref, computed } from 'vue'
import { usePaperPdf } from '../../composables/usePaperPdf'

const { t, locale } = useI18n()
const { getPdfLinks, openPdf } = usePaperPdf()

const selectedPaperPdfLinks = computed(() => {
  if (!selectedPaper.value) return { qpUrl: null, msUrl: null, qpName: null, msName: null }
  return getPdfLinks({ paper_filename: selectedPaper.value })
})

const props = defineProps({
  availablePapers: { type: Array, default: () => [] },
  questionList: { type: Array, default: () => [] },
  currentIndex: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  folders: { type: Array, default: () => [] },
  activeFolderId: { type: String, default: 'default' },
  activeFolder: { type: Object, default: () => ({}) },
  totalFavoritesCount: { type: Number, default: 0 },
  getFolderCount: { type: Function, required: true }
})

const selectedPaper = defineModel('selectedPaper', { type: String, default: '' })

const emit = defineEmits([
  'prev',
  'next',
  'random',
  'select-folder',
  'create-folder'
])

const isFolderDropdownOpen = ref(false)
const isCreatingFolder = ref(false)
const newFolderName = ref('')

function formatFolderName(folder) {
  if (!folder) return ''
  if (folder.isDefault) return t('galleryNav.defaultFolder')
  return folder.name
}

function handleSelectFolder(id) {
  emit('select-folder', id)
  isFolderDropdownOpen.value = false
}

function handleCreateFolder() {
  const name = newFolderName.value.trim()
  if (!name) {
    isCreatingFolder.value = false
    return
  }
  emit('create-folder', name)
  newFolderName.value = ''
  isCreatingFolder.value = false
  isFolderDropdownOpen.value = false
}
</script>

<template>
  <div class="nav-bar-row">
    <div class="nav-bar-left">
      <!-- 极简收藏夹下拉按钮 -->
      <div class="fav-dropdown-container">
        <button 
          class="btn-fav-dropdown" 
          :class="{ 'btn-fav-dropdown-active': isFolderDropdownOpen }"
          @click.stop="isFolderDropdownOpen = !isFolderDropdownOpen"
          :title="t('galleryNav.favorites')"
        >
          <span class="f-icon">📁</span>
          <span class="f-name">{{ formatFolderName(activeFolder) || t('galleryNav.favorites') }}</span>
          <span class="f-badge" v-if="totalFavoritesCount > 0">{{ totalFavoritesCount }}</span>
          <span class="f-arrow">▾</span>
        </button>

        <!-- 极简下拉浮层 -->
        <div v-if="isFolderDropdownOpen" class="fav-dropdown-menu" @click.stop>
          <div class="fav-menu-header">
            <span class="menu-title">{{ t('galleryNav.favorites') }}</span>
            <button class="btn-create-f" @click="isCreatingFolder = !isCreatingFolder">
              + {{ t('toast.create') }}
            </button>
          </div>

          <!-- 新建收藏夹输入框 -->
          <div v-if="isCreatingFolder" class="menu-new-folder-row">
            <input 
              v-model="newFolderName" 
              type="text" 
              :placeholder="t('galleryNav.newFolderPlaceholder')" 
              class="menu-input-field" 
              @keyup.enter="handleCreateFolder"
              autoFocus
            />
            <button class="menu-btn-ok" @click="handleCreateFolder">{{ t('toast.done') }}</button>
          </div>

          <!-- 收藏夹列表 -->
          <div class="fav-menu-list">
            <div 
              v-for="folder in folders" 
              :key="folder.id"
              class="fav-menu-item"
              :class="{ 'is-selected': activeFolderId === folder.id }"
              @click="handleSelectFolder(folder.id)"
            >
              <div class="item-left">
                <span class="item-emoji">{{ folder.isDefault ? '📌' : '📁' }}</span>
                <span class="item-name">{{ formatFolderName(folder) }}</span>
              </div>
              <span class="item-count">{{ getFolderCount(folder.id) }} {{ locale === 'zh' ? '题' : '' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 试卷年份下拉 -->
      <div class="paper-filter-wrapper" v-if="availablePapers.length > 0">
        <label>{{ t('galleryNav.paperLabel') }}</label>
        <select v-model="selectedPaper" class="paper-select">
          <option value="">{{ t('galleryNav.allPapers') }} ({{ availablePapers.length }})</option>
          <option v-for="p in availablePapers" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
    </div>

    <!-- 导航翻页 -->
    <div class="nav-bar-right">
      <span class="count-badge" v-if="questionList.length > 0">
        {{ currentIndex + 1 }} / {{ questionList.length }}
      </span>
      <button @click="emit('prev')" :disabled="loading || questionList.length <= 1" class="btn btn-secondary">
        &larr; {{ t('galleryNav.prevQuestion') }}
      </button>
      <button @click="emit('next')" :disabled="loading || questionList.length <= 1" class="btn btn-secondary">
        {{ t('galleryNav.nextQuestion') }} &rarr;
      </button>
      <button @click="emit('random')" :disabled="loading || questionList.length <= 1" class="btn btn-primary">
        🎲 {{ t('galleryNav.randomQuestion') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.nav-bar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-base);
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

.nav-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fav-dropdown-container {
  position: relative;
  display: inline-block;
}

.btn-fav-dropdown {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-base);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.16s ease;
  user-select: none;
}

.btn-fav-dropdown:hover,
.btn-fav-dropdown.btn-fav-dropdown-active {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.f-icon {
  font-size: 0.95rem;
}

.f-name {
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.f-badge {
  background: var(--accent-primary);
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 10px;
  font-variant-numeric: tabular-nums;
}

.f-arrow {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Minimalist Dropdown Menu */
.fav-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 250px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  padding: 8px;
  z-index: 1050;
  animation: dropdownFadeIn 0.16s ease-out;
}

@keyframes dropdownFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.fav-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px 8px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 6px;
}

.menu-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

.btn-create-f {
  background: transparent;
  border: 1px dashed var(--border-color);
  color: var(--accent-primary);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.14s ease;
}

.btn-create-f:hover {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
}

.menu-new-folder-row {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
  padding: 0 4px;
}

.menu-input-field {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--accent-primary);
  border-radius: 4px;
  font-size: 0.78rem;
  outline: none;
  background: var(--bg-input);
}

.menu-btn-ok {
  background: var(--accent-primary);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
}

.fav-menu-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 220px;
  overflow-y: auto;
}

.fav-menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.14s ease;
  user-select: none;
}

.fav-menu-item:hover {
  background: var(--bg-surface-subtle);
}

.fav-menu-item.is-selected {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.item-emoji {
  font-size: 0.9rem;
}

.item-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-menu-item.is-selected .item-name {
  color: var(--accent-primary);
  font-weight: 800;
}

.item-count {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  margin-left: 6px;
}

.paper-filter-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 600;
}

.paper-select {
  padding: 5px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  font-size: 0.8rem;
  color: var(--text-main);
  background: var(--bg-input);
  outline: none;
}

.paper-select:focus {
  border-color: var(--border-focus);
}

.nav-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-right: 6px;
  font-variant-numeric: tabular-nums;
}

.btn-nav-pdf {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-base);
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.16s ease;
  user-select: none;
}

.btn-nav-pdf:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: var(--accent-primary-light);
}
</style>

