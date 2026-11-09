<script setup>
import { ref } from 'vue'

const { t, locale } = useI18n()

const props = defineProps({
  showToast: { type: Boolean, default: false },
  toastMessage: { type: String, default: '' },
  lastFavoritedItem: { type: Object, default: null },
  folders: { type: Array, default: () => [] }
})

const emit = defineEmits(['move-folder', 'create-and-move', 'close-toast'])

const showPicker = ref(false)
const newFolderName = ref('')

function formatFolderName(folder) {
  if (!folder) return ''
  if (folder.isDefault) return t('galleryNav.defaultFolder')
  return folder.name
}

function handleMove(folderId) {
  emit('move-folder', folderId)
  showPicker.value = false
}

function handleCreate() {
  const name = newFolderName.value.trim()
  if (!name) return
  emit('create-and-move', name)
  newFolderName.value = ''
  showPicker.value = false
}
</script>

<template>
  <div>
    <!-- Floating Toast Notification (with Xiaohongshu-style Album Action) -->
    <transition name="toast-fade">
      <div v-if="showToast" class="toast-popup xhs-toast">
        <span class="toast-msg-text">{{ toastMessage }}</span>
        <button 
          v-if="lastFavoritedItem" 
          @click.stop="showPicker = true" 
          class="toast-album-btn"
        >
          {{ t('toast.addToAlbum') }}
        </button>
      </div>
    </transition>

    <!-- Quick Album Picker Bottom Sheet / Modal (Xiaohongshu-style) -->
    <transition name="quick-picker-fade">
      <div v-if="showPicker" class="quick-picker-backdrop" @click="showPicker = false">
        <div class="quick-picker-card" @click.stop>
          <div class="quick-picker-header">
            <h4>{{ t('toast.selectAlbum') }}</h4>
            <button class="quick-picker-close" @click="showPicker = false">&times;</button>
          </div>
          <div class="quick-picker-list">
            <button 
              v-for="folder in folders" 
              :key="folder.id"
              class="quick-folder-btn"
              :class="{ 'is-current': lastFavoritedItem?.folderId === folder.id }"
              @click="handleMove(folder.id)"
            >
              <span class="qf-emoji">{{ folder.isDefault ? '📌' : '📁' }}</span>
              <span class="qf-name">{{ formatFolderName(folder) }}</span>
              <span class="qf-check" v-if="lastFavoritedItem?.folderId === folder.id">✓ {{ locale === 'zh' ? '已在' : 'Active' }}</span>
            </button>
          </div>
          <div class="quick-picker-new">
            <input 
              v-model="newFolderName" 
              type="text" 
              :placeholder="`+ ${t('galleryNav.newFolderPlaceholder')}...`" 
              class="quick-new-input"
              @keyup.enter="handleCreate"
            />
            <button class="quick-new-btn" @click="handleCreate">{{ locale === 'zh' ? '创建并移入' : 'Create & Move' }}</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.toast-popup {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-surface);
  color: var(--text-main);
  padding: 9px 18px;
  border-radius: 30px;
  font-size: 0.88rem;
  font-weight: 600;
  border: 1px solid var(--border-focus);
  box-shadow: var(--shadow-lg);
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 12px;
}

.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translate(-50%, 16px); }

.toast-album-btn {
  background: var(--accent-primary);
  color: #ffffff;
  border: none;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.toast-album-btn:hover {
  background: var(--accent-primary-hover);
  transform: scale(1.04);
}

/* Quick Album Picker Modal (XHS-style) */
.quick-picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(44, 47, 50, 0.35);
  backdrop-filter: blur(2px);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-picker-fade-enter-active, .quick-picker-fade-leave-active {
  transition: opacity 0.18s ease;
}
.quick-picker-fade-enter-from, .quick-picker-fade-leave-to {
  opacity: 0;
}

.quick-picker-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  padding: 18px 20px;
  width: 90%;
  max-width: 340px;
  box-shadow: 0 12px 36px rgba(44, 47, 50, 0.18);
}

.quick-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.quick-picker-header h4 {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 800;
  color: var(--text-main);
}

.quick-picker-close {
  background: transparent;
  border: none;
  font-size: 1.3rem;
  color: var(--text-muted);
  cursor: pointer;
}

.quick-picker-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.quick-folder-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface-subtle);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.quick-folder-btn:hover {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
}

.quick-folder-btn.is-current {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
}

.qf-name {
  flex: 1;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-main);
}

.qf-check {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.quick-picker-new {
  display: flex;
  gap: 6px;
}

.quick-new-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  font-size: 0.8rem;
  background: var(--bg-input);
  outline: none;
}

.quick-new-input:focus {
  border-color: var(--border-focus);
}

.quick-new-btn {
  background: var(--accent-primary);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 0 12px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}
</style>

