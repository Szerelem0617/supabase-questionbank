<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useFavorites } from '~/composables/useFavorites'
import { useQuestionSearch } from '~/composables/useQuestionSearch'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const { t, locale } = useI18n()
const route = useRoute()
const favoritesStore = useFavorites()
const searchStore = useQuestionSearch()

// 仅两类维度：当前场景专属操作（随环境自动锁定） 与 通用快捷操作
const activeTab = ref('context')
const copied = ref(false)

// 自动检测当前用户所处的环境场景（主页、搜题、收藏夹、做题流）
const currentContext = computed(() => {
  if (route.path === '/') {
    return {
      id: 'home',
      icon: '🏠',
      name: locale.value === 'zh' ? '首页操作' : 'Home Navigation'
    }
  }
  if (favoritesStore.isFavoriteMode.value) {
    return {
      id: 'favorites',
      icon: '⭐',
      name: locale.value === 'zh' ? '收藏与排序' : 'Favorites & Ordering'
    }
  }
  if (searchStore.isSearchMode.value) {
    return {
      id: 'search',
      icon: '🔍',
      name: locale.value === 'zh' ? '搜题操作' : 'Search Actions'
    }
  }
  return {
    id: 'stream',
    icon: '📖',
    name: locale.value === 'zh' ? '刷题与做题' : 'Practice Stream'
  }
})

watch(() => props.isOpen, (open) => {
  if (open) {
    activeTab.value = 'context'
    copied.value = false
  }
})

async function copyEmail() {
  try {
    await navigator.clipboard.writeText('antimony00001@163.com')
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.warn('Copy failed:', err)
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
  }
})
</script>

<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="isOpen" class="help-modal-backdrop" @click.self="emit('close')">
        <div class="help-modal-card" role="dialog" aria-modal="true">
          <!-- 弹窗顶栏 -->
          <div class="help-modal-header">
            <div class="header-left">
              <span class="header-badge">i</span>
              <h3 class="modal-title">{{ locale === 'zh' ? '操作与功能指南' : 'Quick User Guide' }}</h3>
            </div>
            <button class="btn-close" @click="emit('close')" :title="locale === 'zh' ? '关闭 (ESC)' : 'Close (ESC)'">
              &times;
            </button>
          </div>

          <!-- 精简双标签切换：当前专属操作 vs 通用操作 -->
          <div class="help-tabs-bar">
            <button
              type="button"
              class="help-tab-btn"
              :class="{ 'is-active': activeTab === 'context' }"
              @click="activeTab = 'context'"
            >
              <span class="tab-icon">{{ currentContext.icon }}</span>
              <span class="tab-label">{{ currentContext.name }}</span>
              <span class="current-tag">{{ locale === 'zh' ? '当前' : 'Active' }}</span>
            </button>
            <button
              type="button"
              class="help-tab-btn"
              :class="{ 'is-active': activeTab === 'general' }"
              @click="activeTab = 'general'"
            >
              <span class="tab-icon">⌨️</span>
              <span class="tab-label">{{ locale === 'zh' ? '通用操作与快捷键' : 'General & Shortcuts' }}</span>
            </button>
          </div>

          <!-- 弹窗主体内容（仅教操作与功能，无多余说明） -->
          <div class="help-modal-body">
            <!-- 维度 A：当前场景专属操作（不能随意切换到其它无关场景） -->
            <div v-if="activeTab === 'context'" class="action-list">
              <!-- 1. 收藏模式 -->
              <template v-if="currentContext.id === 'favorites'">
                <div class="action-item highlight-action">
                  <div class="action-keys">
                    <kbd>点击卡片</kbd>
                    <span class="key-sep">+</span>
                    <kbd>&uarr;</kbd>
                    <kbd>&darr;</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '卡片金框选中与上下自由排序' : 'Select with Gold Border & Move Up/Down' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '点击题目出现琥珀金边框后，按键盘上下键直接调整题目顺序，按 ESC 退出选中。' : 'Click card to highlight with gold frame, then press Arrow Up/Down to reorder.' }}</span>
                  </div>
                </div>

                <div class="action-item">
                  <div class="action-keys">
                    <kbd>💡</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '展开 / 隐藏官方评分标准' : 'Toggle Official Mark Scheme' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '就地展开该题的官方 Mark Scheme 图片或文字采分点。' : 'Smoothly reveal or hide official answer scheme and rubric.' }}</span>
                  </div>
                </div>

                <div class="action-item">
                  <div class="action-keys">
                    <kbd>★</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '移出收藏夹' : 'Remove from Favorites' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '再次点击实心星号即可取消收藏。' : 'Click the active star icon to unfavorite the question.' }}</span>
                  </div>
                </div>

                <div class="action-item">
                  <div class="action-keys">
                    <kbd>导出 PDF</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '按学科筛选导出' : 'Export Custom PDF' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '可导出整套练习卷、官方答案卷或题+答合订版。' : 'Export question sheet, mark scheme, or combined PDF booklet.' }}</span>
                  </div>
                </div>
              </template>

              <!-- 2. 搜题模式 -->
              <template v-else-if="currentContext.id === 'search'">
                <div class="action-item highlight-action">
                  <div class="action-keys">
                    <kbd>qp:试卷名</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '查整套卷' : 'Find Full Past Paper' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '输入如 qp:9702_s23_qp_22 可一次性调出整份试卷全部大题。' : 'Type qp:filename to pull up every question from that specific past paper.' }}</span>
                  </div>
                </div>

                <div class="action-item">
                  <div class="action-keys">
                    <kbd>多关键词</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '知识点联搜' : 'Multi-keyword Topic Search' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '空格隔开多个考点（如 density volume），检索综合压轴大题。' : 'Separate topic keywords by spaces to find comprehensive problems.' }}</span>
                  </div>
                </div>

                <div class="action-item">
                  <div class="action-keys">
                    <kbd>点击题号标签</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '精准高亮定位' : 'Instant Subquestion Jump' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '点击命中结果中的 Part (b) 等小题标签，页面自动平滑滚动并高亮定位。' : 'Click matched subquestion tags to scroll and focus directly on that part.' }}</span>
                  </div>
                </div>

                <div class="action-item">
                  <div class="action-keys">
                    <kbd>ESC</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '清空或退出搜索' : 'Clear / Exit Search' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '清空搜索词恢复原本真题流。' : 'Clear search term to return to normal question stream.' }}</span>
                  </div>
                </div>
              </template>

              <!-- 3. 做题与画廊模式 -->
              <template v-else-if="currentContext.id === 'stream'">
                <div class="action-item">
                  <div class="action-keys">
                    <kbd>&larr;</kbd>
                    <kbd>&rarr;</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '左右键：快速切换大题' : 'Left/Right: Switch Big Question' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '左右方向键在连续大题或试卷间快速跳转。' : 'Use ArrowLeft/ArrowRight to jump between consecutive big questions.' }}</span>
                  </div>
                </div>

                <div class="action-item highlight-action">
                  <div class="action-keys">
                    <kbd>&uarr;</kbd>
                    <kbd>&darr;</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '上下键：逐个切换小问' : 'Up/Down: Step Through Sub-questions' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '上下方向键（或 K/J）依次精准定位并高亮各个子小问。' : 'Use ArrowUp/ArrowDown (or K/J) to smoothly snap and focus through sub-parts.' }}</span>
                  </div>
                </div>

                <div class="action-item">
                  <div class="action-keys">
                    <kbd>📋</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '大题高清长图拼接' : 'Copy Stitched Full Question' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '点击大题右上角长图图标，一键将题干与所有小题拼接并复制高清图片到剪贴板。' : 'One-click stitches all subquestions into a high-res image and copies to clipboard.' }}</span>
                  </div>
                </div>

                <div class="action-item">
                  <div class="action-keys">
                    <kbd>💡</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '查看对应小题答案' : 'Reveal Subquestion Answer' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '展开官方评分标准与采分点明细。' : 'Reveal official mark scheme and grading criteria.' }}</span>
                  </div>
                </div>

                <div class="action-item">
                  <div class="action-keys">
                    <kbd>☆</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '收藏整题或单小题' : 'Favorite Whole or Part' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '点击大题顶栏收藏整题，或在小题右下角单独收藏特定难问。' : 'Favorite the entire problem or bookmark individual difficult parts.' }}</span>
                  </div>
                </div>
              </template>

              <!-- 4. 首页模式 -->
              <template v-else-if="currentContext.id === 'home'">
                <div class="action-item">
                  <div class="action-keys">
                    <kbd>点击科目</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '进入专属题库' : 'Enter Question Bank' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '覆盖 CAIE、Edexcel、AQA 国际高中课程与物理碗等竞赛真题。' : 'Access CAIE, Edexcel, AQA A-Level and Physics Olympiad archives.' }}</span>
                  </div>
                </div>

                <div class="action-item">
                  <div class="action-keys">
                    <kbd>🌐 中 / EN</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '即时双语切换' : 'Bilingual Switch' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '全站界面支持中英双语无刷新切换。' : 'Seamlessly switch site language between English and Chinese.' }}</span>
                  </div>
                </div>
              </template>
            </div>

            <!-- 维度 B：通用操作与全局快捷键（随处可查） -->
            <div v-else-if="activeTab === 'general'" class="action-list">
              <div class="action-item">
                <div class="action-keys">
                  <kbd>/</kbd>
                </div>
                <div class="action-text">
                  <span class="action-name">{{ locale === 'zh' ? '聚焦搜索框' : 'Focus Search Bar' }}</span>
                  <span class="action-desc">{{ locale === 'zh' ? '任意时刻按下斜杠键，光标立刻就位搜索框。' : 'Press slash to instantly activate search input without moving mouse.' }}</span>
                </div>
              </div>

              <div class="action-item">
                <div class="action-keys">
                  <kbd>J</kbd>
                  <kbd>K</kbd>
                  <span class="key-sep">/</span>
                  <kbd>&darr;</kbd>
                  <kbd>&uarr;</kbd>
                </div>
                <div class="action-text">
                  <span class="action-name">{{ locale === 'zh' ? '快速平滑浏览' : 'Scroll / Browse Questions' }}</span>
                  <span class="action-desc">{{ locale === 'zh' ? '做题流中快速在不同大题之间纵向滑动浏览。' : 'Quickly jump between adjacent cards along the stream.' }}</span>
                </div>
              </div>

              <div class="action-item">
                <div class="action-keys">
                  <kbd>ESC</kbd>
                </div>
                <div class="action-text">
                  <span class="action-name">{{ locale === 'zh' ? '全局退出与取消' : 'Global Dismiss / Deselect' }}</span>
                  <span class="action-desc">{{ locale === 'zh' ? '关闭帮助弹窗、侧边栏，或取消卡片金框选中。' : 'Close modal, close side drawer, or deselect highlighted card.' }}</span>
                </div>
              </div>

              <div class="action-item">
                <div class="action-keys">
                  <kbd>💬 发弹幕</kbd>
                </div>
                <div class="action-text">
                  <span class="action-name">{{ locale === 'zh' ? '全站考友交流与显示开关' : 'Danmaku Comments & Display Toggle' }}</span>
                  <span class="action-desc">{{ locale === 'zh' ? '顶栏左侧发弹幕上墙交流；右侧滑动开关可一键开启或静默隐藏弹幕。' : 'Post real-time bullet comments or toggle floating barrage visibility anytime.' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 弹窗底栏：作者联系方式与关闭按钮 -->
          <div class="help-modal-footer">
            <div class="author-contact-box">
              <span class="author-icon">📮</span>
              <span class="author-label">{{ locale === 'zh' ? '遇到问题或建议？联系作者：' : 'Questions or feedback? Contact: ' }}</span>
              <button 
                type="button" 
                class="author-email-btn" 
                @click="copyEmail" 
                :title="locale === 'zh' ? '点击复制邮箱' : 'Click to copy email'"
              >
                antimony00001@163.com
                <span class="copy-badge">{{ copied ? (locale === 'zh' ? '已复制！' : 'Copied!') : (locale === 'zh' ? '复制' : 'Copy') }}</span>
              </button>
            </div>

            <button type="button" class="btn-got-it" @click="emit('close')">
              {{ locale === 'zh' ? '知道了' : 'Got it' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.help-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(28, 25, 23, 0.48);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.help-modal-card {
  width: 100%;
  max-width: 620px;
  background: #fcfbf9;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  box-shadow: 0 20px 48px rgba(44, 47, 50, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: cardPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cardPop {
  0% { transform: scale(0.96) translateY(6px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

/* 顶栏 */
.help-modal-header {
  padding: 14px 20px;
  background: var(--bg-surface-subtle);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-primary-light);
  border: 1px solid var(--accent-primary-border);
  color: var(--accent-primary);
  font-family: var(--font-serif);
  font-weight: 700;
  font-style: italic;
  font-size: 0.85rem;
}

.modal-title {
  margin: 0;
  font-size: 1.02rem;
  font-family: var(--font-serif);
  font-weight: 700;
  color: var(--text-main);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0 4px;
  transition: color 0.15s ease;
}

.btn-close:hover {
  color: var(--accent-primary);
}

/* 切换标签栏：仅 2 个维度，清爽直观 */
.help-tabs-bar {
  display: flex;
  padding: 8px 16px;
  background: var(--bg-surface-subtle);
  border-bottom: 1px solid var(--border-subtle);
  gap: 8px;
}

.help-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-base);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.help-tab-btn:hover {
  background: var(--bg-surface);
  color: var(--text-main);
}

.help-tab-btn.is-active {
  background: var(--bg-surface);
  color: var(--accent-primary);
  border-color: var(--border-color);
  box-shadow: 0 1px 3px rgba(44, 47, 50, 0.05);
}

.tab-icon {
  font-size: 0.95rem;
}

.current-tag {
  font-size: 0.65rem;
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 700;
}

/* 主体操作列表 */
.help-modal-body {
  padding: 16px 20px;
  max-height: 420px;
  overflow-y: auto;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 10px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: border-color 0.15s ease;
}

.action-item:hover {
  border-color: rgba(194, 65, 40, 0.35);
}

.action-item.highlight-action {
  background: rgba(217, 119, 6, 0.03);
  border-color: rgba(217, 119, 6, 0.35);
}

.action-keys {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 90px;
  margin-top: 2px;
  flex-wrap: wrap;
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-main);
  background: #fdfaf6;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06);
  white-space: nowrap;
}

.highlight-action kbd {
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.4);
  background: #fffbeb;
}

.key-sep {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.action-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.action-name {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-main);
}

.action-desc {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

/* 底栏 */
.help-modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.author-contact-box {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.author-icon {
  font-size: 0.95rem;
}

.author-label {
  color: var(--text-secondary);
}

.author-email-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 7px;
  font-family: monospace;
  font-size: 0.76rem;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
}

.author-email-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.copy-badge {
  font-size: 0.68rem;
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 700;
}

.btn-got-it {
  background: var(--accent-primary);
  color: #ffffff;
  border: none;
  padding: 6px 16px;
  border-radius: var(--radius-base);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-got-it:hover {
  background: #a93520;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.16s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .help-modal-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .btn-got-it {
    width: 100%;
  }
  .author-contact-box {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
