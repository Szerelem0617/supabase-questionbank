<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ALL_SECTIONS, ALL_SUBJECTS, getSubjectById } from '~/composables/useSubjects'
import { useFavorites } from '~/composables/useFavorites'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const favoritesStore = useFavorites()

const isOpen = ref(false)
const switcherRef = ref(null)

// Current subject ID from route
const currentSubjectId = computed(() => {
  if (route.path.startsWith('/subject/')) {
    const rawId = route.params.id
    if (Array.isArray(rawId)) return decodeURIComponent(rawId[0] || '')
    return typeof rawId === 'string' ? decodeURIComponent(rawId) : ''
  }
  return null
})

// Current subject spec object
const currentSubject = computed(() => {
  return getSubjectById(currentSubjectId.value)
})

// Display label on the collapsed button
const currentLabel = computed(() => {
  if (currentSubject.value) {
    return currentSubject.value.shortName || currentSubject.value.name
  }
  return locale.value === 'zh' ? '全部科目' : 'All Subjects'
})

const currentIcon = computed(() => {
  if (currentSubject.value) {
    return currentSubject.value.icon || '📘'
  }
  return '📚'
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function selectAllSubjects() {
  isOpen.value = false
  // 顶栏切换同步影响收藏夹范围
  favoritesStore.setTargetSubjectScope('ALL')
  router.push('/')
}

function selectSubject(sub) {
  isOpen.value = false
  // 顶栏切换同步影响收藏夹范围
  favoritesStore.setTargetSubjectScope(sub.id)
  router.push(`/subject/${encodeURIComponent(sub.id)}`)
}

function handleGlobalClick(e) {
  if (switcherRef.value && !switcherRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
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
  <div class="topbar-subject-switcher" ref="switcherRef">
    <!-- Collapsed Trigger Pill -->
    <button 
      type="button" 
      class="subject-trigger-btn" 
      :class="{ 'is-active': isOpen, 'is-subject-page': !!currentSubjectId }"
      @click="toggleDropdown"
      :title="locale === 'zh' ? '切换考局科目或返回全科' : 'Switch Subject or All Specs'"
    >
      <span class="trigger-icon">{{ currentIcon }}</span>
      <span class="trigger-label">{{ currentLabel }}</span>
      <span class="trigger-arrow" :class="{ 'arrow-up': isOpen }">▾</span>
    </button>

    <!-- Dropdown Menu -->
    <transition name="dropdown-fade">
      <div v-if="isOpen" class="subject-dropdown-panel" @click.stop>
        <!-- 1. All Specs / 全学科选项 (回到主页) -->
        <div 
          class="dropdown-all-item" 
          :class="{ 'is-current': !currentSubjectId }"
          @click="selectAllSubjects"
        >
          <div class="all-item-left">
            <span class="all-item-icon">📚</span>
            <div class="all-item-text">
              <span class="all-item-title">{{ locale === 'zh' ? '全部考纲 · 全科总览' : 'All Curriculums & Overview' }}</span>
              <span class="all-item-desc">{{ locale === 'zh' ? '返回主页，查看全部 17 门真题库' : 'Return to homepage & browse all 17 subjects' }}</span>
            </div>
          </div>
          <span v-if="!currentSubjectId" class="check-mark">✓</span>
        </div>

        <div class="dropdown-divider"></div>

        <!-- 2. Subjects by Section -->
        <div class="sections-scroll-wrap">
          <div 
            v-for="section in ALL_SECTIONS" 
            :key="section.key" 
            class="section-group"
          >
            <div class="section-group-title">
              {{ locale === 'zh' ? section.titleZh : section.titleEn }}
            </div>
            
            <div class="section-items-list">
              <div 
                v-for="sub in section.subjects" 
                :key="sub.id"
                class="subject-item-row"
                :class="{ 'is-current': currentSubjectId === sub.id }"
                @click="selectSubject(sub)"
              >
                <div class="sir-left">
                  <span class="sir-icon">{{ sub.icon }}</span>
                  <div class="sir-info">
                    <span class="sir-name">{{ sub.shortName || sub.name }}</span>
                    <span class="sir-board">{{ sub.board }}</span>
                  </div>
                </div>
                <div class="sir-right">
                  <span class="sir-level-badge" :class="`badge-${sub.color}`">{{ sub.level }}</span>
                  <span v-if="currentSubjectId === sub.id" class="check-mark">✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.topbar-subject-switcher {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* 触发展开胶囊 */
.subject-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.16s ease;
  user-select: none;
  max-width: 210px;
  box-shadow: 0 1px 2px rgba(44, 47, 50, 0.04);
}

.subject-trigger-btn:hover {
  background: var(--bg-surface-subtle);
  border-color: var(--accent-primary-border);
  color: var(--accent-primary);
  box-shadow: 0 2px 6px rgba(194, 65, 40, 0.08);
}

.subject-trigger-btn.is-active {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: var(--accent-primary-light);
  box-shadow: 0 2px 6px rgba(194, 65, 40, 0.12);
}

.subject-trigger-btn.is-subject-page {
  font-weight: 700;
  color: var(--text-main);
}

.trigger-icon {
  font-size: 0.95rem;
  line-height: 1;
  flex-shrink: 0;
}

.trigger-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.trigger-arrow {
  font-size: 0.72rem;
  color: var(--text-muted);
  transition: transform 0.18s ease;
  flex-shrink: 0;
}

.trigger-arrow.arrow-up {
  transform: rotate(180deg);
}

/* 下拉菜单面板 */
.subject-dropdown-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 320px;
  max-height: 480px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 12px 36px rgba(44, 47, 50, 0.14), 0 2px 6px rgba(44, 47, 50, 0.04);
  padding: 8px;
  z-index: 1050;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* 全学科项 */
.dropdown-all-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--bg-surface-subtle);
  border: 1px solid transparent;
}

.dropdown-all-item:hover {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary-border);
}

.dropdown-all-item.is-current {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
}

.all-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.all-item-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.all-item-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.all-item-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
}

.dropdown-all-item.is-current .all-item-title {
  color: var(--accent-primary);
}

.all-item-desc {
  font-size: 0.69rem;
  color: var(--text-muted);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 8px 4px;
}

/* 滚动区域 */
.sections-scroll-wrap {
  overflow-y: auto;
  max-height: 360px;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sections-scroll-wrap::-webkit-scrollbar {
  width: 4px;
}

.sections-scroll-wrap::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

.section-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.section-group-title {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 8px 2px;
}

.section-items-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.subject-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.14s ease;
}

.subject-item-row:hover {
  background: var(--bg-surface-subtle);
}

.subject-item-row.is-current {
  background: var(--accent-primary-light);
}

.sir-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sir-icon {
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;
}

.sir-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.sir-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subject-item-row.is-current .sir-name {
  color: var(--accent-primary);
  font-weight: 700;
}

.sir-board {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.sir-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.sir-level-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
}

.badge-coral { background: #fee2e2; color: #b91c1c; }
.badge-amber { background: #fef3c7; color: #b45309; }
.badge-purple { background: #f3e8ff; color: #7e22ce; }
.badge-slate { background: #f1f5f9; color: #475569; }
.badge-teal { background: #ccfbf1; color: #0f766e; }
.badge-sage { background: #ecfdf5; color: #047857; }

.check-mark {
  font-size: 0.82rem;
  color: var(--accent-primary);
  font-weight: 800;
}

/* 动效 */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
