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

const copied = ref(false)

// 自动检测当前用户所处的环境场景（主页、搜题、收藏夹、做题流）
const currentContext = computed(() => {
  if (route.path === '/') {
    return {
      id: 'home',
      icon: '🏠',
      name: locale.value === 'zh' ? '首页' : 'Home'
    }
  }
  if (favoritesStore.isFavoriteMode.value) {
    return {
      id: 'favorites',
      icon: '⭐',
      name: locale.value === 'zh' ? '收藏夹' : 'Favorites'
    }
  }
  if (searchStore.isSearchMode.value) {
    return {
      id: 'search',
      icon: '🔍',
      name: locale.value === 'zh' ? '搜题' : 'Search'
    }
  }
  return {
    id: 'stream',
    icon: '📖',
    name: locale.value === 'zh' ? '刷题做题' : 'Practice Stream'
  }
})

watch(() => props.isOpen, (open) => {
  if (open) {
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
          <!-- 弹窗顶栏：标题 + 作者联系方式 + 关闭按钮 -->
          <div class="help-modal-header">
            <div class="header-left">
              <span class="header-badge">i</span>
              <h3 class="modal-title">{{ locale === 'zh' ? '操作指南' : 'Quick Guide' }}</h3>
            </div>

            <!-- 作者联系方式直接置于顶栏 -->
            <div class="header-contact">
              <span class="contact-hint">{{ locale === 'zh' ? '联系作者：' : 'Author: ' }}</span>
              <button 
                type="button" 
                class="author-email-btn" 
                @click="copyEmail" 
                :title="locale === 'zh' ? '点击复制作者邮箱' : 'Click to copy author email'"
              >
                <span class="email-icon">📮</span>
                <span class="email-text">antimony00001@163.com</span>
                <span class="copy-badge">{{ copied ? (locale === 'zh' ? '已复制！' : 'Copied!') : (locale === 'zh' ? '复制' : 'Copy') }}</span>
              </button>
            </div>

            <button class="btn-close" @click="emit('close')" :title="locale === 'zh' ? '关闭 (ESC)' : 'Close (ESC)'">
              &times;
            </button>
          </div>

          <!-- 弹窗主体内容：当前上下文操作与全局快捷操作一体化平铺展示，无额外分类标题心智负担 -->
          <div class="help-modal-body">
            <div class="action-list">
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
                    <span class="action-name">{{ locale === 'zh' ? '卡片金框选中与上下自由排序' : 'Select with Gold Border & Reorder' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '点击题目出现琥珀金边框后，按键盘上下键调整题目顺序，按 ESC 退出选中。' : 'Click card to highlight with gold frame, then press Arrow Up/Down to reorder.' }}</span>
                  </div>
                </div>

                <div class="action-item">
                  <div class="action-keys">
                    <kbd>💡</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '展开 / 隐藏官方评分标准' : 'Toggle Official Mark Scheme' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '就地展开该题的官方 Mark Scheme 答案采分点。' : 'Smoothly reveal or hide official answer scheme and rubric.' }}</span>
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
                    <span class="action-desc">{{ locale === 'zh' ? '点击命中结果中的 Part (b) 等小题标签，自动平滑滚动并高亮定位。' : 'Click matched subquestion tags to scroll and focus directly on that part.' }}</span>
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

              <!-- 3. 刷题与做题模式 -->
              <template v-else-if="currentContext.id === 'stream'">
                <div class="action-item">
                  <div class="action-keys">
                    <kbd>&larr;</kbd>
                    <kbd>&rarr;</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '左右键：快速切换大题' : 'Left/Right: Switch Big Question' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '键盘左右方向键在连续大题或试卷间快速跳转。' : 'Use ArrowLeft/ArrowRight to jump between consecutive big questions.' }}</span>
                  </div>
                </div>

                <div class="action-item highlight-action">
                  <div class="action-keys">
                    <kbd>&uarr;</kbd>
                    <kbd>&darr;</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '上下键：逐个定位小问' : 'Up/Down: Step Through Sub-questions' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '键盘上下键（或 K/J）依次精准定位并高亮子小问。' : 'Use ArrowUp/ArrowDown (or K/J) to smoothly snap and focus through sub-parts.' }}</span>
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
                    <span class="action-name">{{ locale === 'zh' ? '查看小问答案' : 'Reveal Subquestion Answer' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '展开官方评分标准与采分点明细。' : 'Reveal official mark scheme and grading criteria.' }}</span>
                  </div>
                </div>

                <div class="action-item">
                  <div class="action-keys">
                    <kbd>☆</kbd>
                  </div>
                  <div class="action-text">
                    <span class="action-name">{{ locale === 'zh' ? '收藏整题或单小题' : 'Favorite Whole or Part' }}</span>
                    <span class="action-desc">{{ locale === 'zh' ? '点击大题顶栏收藏整题，或在小题栏单独收藏难问。' : 'Favorite the entire problem or bookmark individual difficult parts.' }}</span>
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
                    <span class="action-desc">{{ locale === 'zh' ? '覆盖 CAIE、Edexcel、AQA 国际课程与竞赛真题。' : 'Access CAIE, Edexcel, AQA A-Level and Olympiad archives.' }}</span>
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

              <!-- 5. 通用操作与快捷键（自然顺接，无需冗余小标题） -->
              <div class="action-item">
                <div class="action-keys">
                  <kbd>/</kbd>
                </div>
                <div class="action-text">
                  <span class="action-name">{{ locale === 'zh' ? '聚焦搜索框' : 'Focus Search Bar' }}</span>
                  <span class="action-desc">{{ locale === 'zh' ? '任意时刻按下斜杠键，光标立即定位到搜题输入框。' : 'Press slash anytime to activate the search box.' }}</span>
                </div>
              </div>

              <div class="action-item">
                <div class="action-keys">
                  <kbd>ESC</kbd>
                </div>
                <div class="action-text">
                  <span class="action-name">{{ locale === 'zh' ? '退出与取消选中' : 'Dismiss / Deselect' }}</span>
                  <span class="action-desc">{{ locale === 'zh' ? '关闭帮助弹窗、侧边栏，或取消卡片金框选中。' : 'Close modal, drawers, or deselect highlighted card.' }}</span>
                </div>
              </div>

              <div class="action-item">
                <div class="action-keys">
                  <kbd>💬 弹幕</kbd>
                </div>
                <div class="action-text">
                  <span class="action-name">{{ locale === 'zh' ? '考友交流与显示开关' : 'Danmaku & Display Toggle' }}</span>
                  <span class="action-desc">{{ locale === 'zh' ? '电脑端顶栏支持发弹幕与一键开关弹幕飘字显示。' : 'Post bullet comments or toggle floating barrage visibility anytime on desktop.' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 弹窗底栏：极简提示与确认关闭按钮 -->
          <div class="help-modal-footer">
            <span class="footer-tip">{{ locale === 'zh' ? '按 ESC 键可随时退出此指南' : 'Press ESC anytime to exit this guide' }}</span>
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
  padding: 12px 18px;
  background: var(--bg-surface-subtle);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-primary-light);
  border: 1px solid var(--accent-primary-border);
  color: var(--accent-primary);
  font-family: var(--font-serif);
  font-weight: 700;
  font-style: italic;
  font-size: 0.82rem;
}

.modal-title {
  margin: 0;
  font-size: 0.98rem;
  font-family: var(--font-serif);
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
}

/* 作者联系方式嵌入顶栏 */
.header-contact {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
}

.contact-hint {
  color: var(--text-muted);
  font-size: 0.76rem;
  white-space: nowrap;
}

.author-email-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
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

.email-icon {
  font-size: 0.85rem;
  line-height: 1;
}

.copy-badge {
  font-size: 0.68rem;
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 700;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.35rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0 4px;
  transition: color 0.15s ease;
  flex-shrink: 0;
}

.btn-close:hover {
  color: var(--accent-primary);
}

/* 主体操作列表 */
.help-modal-body {
  padding: 16px 18px;
  max-height: 480px;
  overflow-y: auto;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 12px;
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
  min-width: 86px;
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
  font-size: 0.83rem;
  font-weight: 700;
  color: var(--text-main);
}

.action-desc {
  font-size: 0.76rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* 底栏 */
.help-modal-footer {
  padding: 10px 18px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.footer-tip {
  font-size: 0.76rem;
  color: var(--text-muted);
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

@media (max-width: 640px) {
  .help-modal-header {
    display: grid;
    grid-template-columns: 1fr auto;
    row-gap: 8px;
  }
  .header-contact {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
  .contact-hint {
    display: none;
  }
  .help-modal-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .footer-tip {
    text-align: center;
  }
  .btn-got-it {
    width: 100%;
  }
}
</style>
