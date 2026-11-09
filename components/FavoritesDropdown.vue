<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useFavorites } from '~/composables/useFavorites'

const { t, locale } = useI18n()
const favoritesStore = useFavorites()
const router = useRouter()
const route = useRoute()

const isFolderDropdownOpen = ref(false)
const isCreatingFolder = ref(false)
const newFolderName = ref('')
const favDropdownRef = ref(null)

function formatFolderName(folder) {
  if (!folder) return ''
  if (folder.isDefault) return t('galleryNav.defaultFolder')
  return folder.name
}

function handleSelectFolder(folderId) {
  favoritesStore.selectActiveFolder(folderId)
  favoritesStore.isFavoriteMode.value = true
  isFolderDropdownOpen.value = false

  // 规则：在主页点收藏看到全部科目的收藏；在subject页面点收藏只看当前科目的收藏
  if (!route.path.startsWith('/subject/')) {
    favoritesStore.setTargetSubjectScope('ALL')
    router.push('/subject/CAIE-AL-9702')
  } else {
    const curSubj = route.params.id || 'CAIE-AL-9702'
    favoritesStore.setTargetSubjectScope(curSubj)
  }
}

function handleExitFavoriteMode() {
  favoritesStore.isFavoriteMode.value = false
  isFolderDropdownOpen.value = false
}

function handleCreateFolder() {
  const name = newFolderName.value.trim()
  if (!name) {
    isCreatingFolder.value = false
    return
  }
  try {
    const created = favoritesStore.createFolder(name)
    favoritesStore.selectActiveFolder(created.id)
    favoritesStore.isFavoriteMode.value = true
    newFolderName.value = ''
    isCreatingFolder.value = false
    isFolderDropdownOpen.value = false

    if (!route.path.startsWith('/subject/')) {
      favoritesStore.setTargetSubjectScope('ALL')
      router.push('/subject/CAIE-AL-9702')
    } else {
      const curSubj = route.params.id || 'CAIE-AL-9702'
      favoritesStore.setTargetSubjectScope(curSubj)
    }
  } catch (e) {
    alert(e.message)
  }
}

function handleFolderAction(folder) {
  if (folder.isDefault) {
    const confirmMsg = locale.value === 'zh'
      ? '确定要清空默认收藏夹中的所有题目吗？'
      : 'Are you sure you want to clear all questions in the Default Folder?'
    if (window.confirm(confirmMsg)) {
      favoritesStore.clearFolder(folder.id)
    }
  } else {
    const folderLabel = formatFolderName(folder)
    const confirmMsg = locale.value === 'zh'
      ? `确定要删除收藏夹「${folderLabel}」吗？其中的题目将移至默认收藏夹。`
      : `Are you sure you want to delete folder "${folderLabel}"? Questions inside will be moved to Default Folder.`
    if (window.confirm(confirmMsg)) {
      favoritesStore.deleteFolder(folder.id)
    }
  }
}

function handleGlobalClick(e) {
  if (favDropdownRef.value && !favDropdownRef.value.contains(e.target)) {
    isFolderDropdownOpen.value = false
    isCreatingFolder.value = false
  }
}

onMounted(() => {
  favoritesStore.initFavorites()
  if (typeof window !== 'undefined') {
    document.addEventListener('click', handleGlobalClick)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    document.removeEventListener('click', handleGlobalClick)
  }
})
</script>

<template>
  <div class="fav-dropdown-container" ref="favDropdownRef">
    <!-- Top-Left Square Icon Trigger (Replacing old home symbol) -->
    <button 
      class="brand-fav-btn" 
      :class="{ 
        'btn-active': isFolderDropdownOpen || favoritesStore.isFavoriteMode.value,
        'btn-has-items': favoritesStore.totalFavoritesCount.value > 0
      }"
      @click.stop="isFolderDropdownOpen = !isFolderDropdownOpen"
      :title="favoritesStore.isFavoriteMode.value ? (locale === 'zh' ? '正在查看收藏（点击管理）' : 'Viewing Favorites (click to manage)') : (locale === 'zh' ? '收藏夹与分类' : 'Favorites & Folders')"
      type="button"
    >
      <span class="fav-icon">📁</span>
      <span v-if="favoritesStore.totalFavoritesCount.value > 0" class="fav-badge-count">
        {{ favoritesStore.totalFavoritesCount.value > 99 ? '99+' : favoritesStore.totalFavoritesCount.value }}
      </span>
    </button>

    <!-- Minimalist Dropdown Menu Aligned Left -->
    <transition name="dropdown-fade">
      <div v-if="isFolderDropdownOpen" class="fav-dropdown-menu" @click.stop>
        <div class="fav-menu-header">
          <span class="menu-title">{{ t('galleryNav.favorites') }}</span>
          <button class="btn-create-f" @click="isCreatingFolder = !isCreatingFolder">
            + {{ t('toast.create') }}
          </button>
        </div>

        <!-- Create new folder row -->
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

        <!-- Folder list -->
        <div class="fav-menu-list">
          <div 
            v-for="folder in favoritesStore.folders.value" 
            :key="folder.id"
            class="fav-menu-item"
            :class="{ 'is-selected': favoritesStore.activeFolderId.value === folder.id && favoritesStore.isFavoriteMode.value }"
            @click="handleSelectFolder(folder.id)"
          >
            <div class="item-left">
              <span class="item-emoji">{{ folder.isDefault ? '📌' : '📁' }}</span>
              <span class="item-name">{{ formatFolderName(folder) }}</span>
            </div>
            <div class="item-right">
              <span class="item-count">{{ favoritesStore.getFolderCount(folder.id) }} {{ locale === 'zh' ? '题' : '' }}</span>
              <button 
                class="btn-del-folder" 
                @click.stop="handleFolderAction(folder)"
                :title="folder.isDefault ? (locale === 'zh' ? '清空默认收藏夹' : 'Clear Default Folder') : (locale === 'zh' ? '删除此收藏夹' : 'Delete folder')"
              >
                &times;
              </button>
            </div>
          </div>
        </div>

        <!-- Exit Favorites Mode button if currently active -->
        <div v-if="favoritesStore.isFavoriteMode.value" class="fav-menu-footer">
          <button class="btn-exit-fav-mode" @click="handleExitFavoriteMode">
            &times; {{ t('flow.exitFavorites') }}
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fav-dropdown-container {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.brand-fav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  border-radius: var(--radius-base);
  border: 1px solid var(--accent-primary-border);
  box-shadow: 0 1px 3px rgba(194, 65, 40, 0.1);
  cursor: pointer;
  position: relative;
  transition: all 0.18s ease;
  padding: 0;
}

.brand-fav-btn:hover {
  background: #fbeee8;
  border-color: var(--accent-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(194, 65, 40, 0.18);
}

.brand-fav-btn.btn-active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(194, 65, 40, 0.25);
}

.fav-icon {
  font-size: 1.15rem;
  line-height: 1;
}

.fav-badge-count {
  position: absolute;
  top: -5px;
  right: -6px;
  background: var(--accent-primary);
  color: #ffffff;
  font-size: 0.62rem;
  font-weight: 800;
  min-width: 17px;
  height: 17px;
  line-height: 17px;
  border-radius: 9px;
  text-align: center;
  padding: 0 4px;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  border: 1.5px solid #fff;
  font-variant-numeric: tabular-nums;
}

.brand-fav-btn.btn-active .fav-badge-count {
  background: #2c2f32;
  border-color: #f5f2eb;
}

.fav-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 250px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  box-shadow: 0 10px 28px rgba(44, 47, 50, 0.12), 0 2px 6px rgba(44, 47, 50, 0.05);
  padding: 8px;
  z-index: 1050;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.fav-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px 8px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 6px;
}

.menu-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.btn-create-f {
  background: none;
  border: none;
  color: var(--accent-primary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.15s ease;
}

.btn-create-f:hover {
  background: var(--accent-primary-light);
}

.menu-new-folder-row {
  display: flex;
  gap: 6px;
  padding: 6px 4px 8px;
}

.menu-input-field {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.8rem;
  background: var(--bg-surface-subtle);
  color: var(--text-main);
  outline: none;
}

.menu-input-field:focus {
  border-color: var(--accent-primary);
}

.menu-btn-ok {
  background: var(--accent-primary);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.fav-menu-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 240px;
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
}

.fav-menu-item:hover {
  background: var(--bg-surface-subtle);
}

.fav-menu-item.is-selected {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  font-weight: 600;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.item-emoji {
  font-size: 0.88rem;
}

.item-name {
  font-size: 0.82rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-count {
  font-size: 0.74rem;
  color: var(--text-muted);
}

.btn-del-folder {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
  border-radius: 3px;
  opacity: 0.6;
  transition: opacity 0.15s ease, color 0.15s ease;
}

.btn-del-folder:hover {
  opacity: 1;
  color: var(--accent-primary);
  background: rgba(194, 65, 40, 0.08);
}

.fav-menu-footer {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border-subtle);
}

.btn-exit-fav-mode {
  width: 100%;
  padding: 6px 10px;
  border: 1px dashed var(--accent-primary-border);
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.15s ease;
}

.btn-exit-fav-mode:hover {
  background: var(--accent-primary);
  color: #fff;
}
</style>
