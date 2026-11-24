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

const activeTab = ref('stream')

// 自动检测当前用户所处的上下文情境
const currentContextId = computed(() => {
  if (typeof window === 'undefined') return 'stream'
  if (route.path === '/') return 'home'
  if (favoritesStore.isFavoriteMode.value) return 'favorites'
  if (searchStore.isSearchMode.value) return 'search'
  if (route.path.startsWith('/subject/')) return 'stream'
  return 'stream'
})

function detectAndSetContext() {
  activeTab.value = currentContextId.value
}

// 每次打开时，自动根据所处场景切换至最匹配的标签页
watch(() => props.isOpen, (open) => {
  if (open) {
    detectAndSetContext()
  }
})

const tabs = computed(() => [
  { id: 'favorites', icon: '⭐', label: locale.value === 'zh' ? '收藏与排序' : 'Favorites & Order' },
  { id: 'stream', icon: '⌨️', label: locale.value === 'zh' ? '做题与快捷键' : 'Practice & Keys' },
  { id: 'search', icon: '🔍', label: locale.value === 'zh' ? '搜索语法' : 'Search Syntax' },
  { id: 'home', icon: '🏠', label: locale.value === 'zh' ? '首页导航' : 'Home & Subjects' },
  { id: 'danmaku', icon: '💬', label: locale.value === 'zh' ? '弹幕交流' : 'Danmaku' },
  { id: 'all', icon: '📚', label: locale.value === 'zh' ? '完整手册' : 'All Guides' },
])

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
          <!-- Header -->
          <div class="help-modal-header">
            <div class="header-title-wrap">
              <span class="header-badge">i</span>
              <div>
                <h3 class="modal-title">{{ t('guide.title') }}</h3>
                <p class="modal-subtitle">
                  {{ locale === 'zh' ? '学术题库操作指南与情境快捷技巧' : 'Academic Question Bank User Guide & Context Tips' }}
                </p>
              </div>
            </div>
            <button class="btn-close" @click="emit('close')" :title="locale === 'zh' ? '关闭' : 'Close'">
              &times;
            </button>
          </div>

          <!-- 多态情境选项卡 (自动聚焦当前页面情境) -->
          <div class="help-tabs-bar">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="help-tab-btn"
              :class="{ 'is-active': activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              <span class="tab-icon">{{ tab.icon }}</span>
              <span class="tab-label">{{ tab.label }}</span>
              <span 
                v-if="tab.id === currentContextId" 
                class="context-badge"
                :title="locale === 'zh' ? '当前所在页面' : 'Current page context'"
              >
                {{ locale === 'zh' ? '当前' : 'Active' }}
              </span>
            </button>
          </div>

          <!-- Body with Contextual Visual Cards -->
          <div class="help-modal-body">
            <!-- 1. 收藏与排序 (Favorites & Ordering) -->
            <div v-if="activeTab === 'favorites' || activeTab === 'all'" class="guide-section">
              <div class="section-title-row">
                <span class="section-icon">⭐</span>
                <h4 class="section-heading">{{ locale === 'zh' ? '收藏夹、题目排序与定制导出' : 'Favorites, Reordering & Export' }}</h4>
              </div>

              <div class="feature-card highlight-card">
                <div class="fc-badge-row">
                  <span class="new-pill">{{ locale === 'zh' ? '重磅新功能' : 'New Feature' }}</span>
                  <span class="fc-title">{{ locale === 'zh' ? '金框选中与键盘自由上下排序' : 'Gold Frame Selection & Arrow Key Reordering' }}</span>
                </div>
                <p class="fc-desc">
                  {{ locale === 'zh' 
                    ? '进入收藏夹展示后，鼠标点击任意题目卡片，卡片四周将呈现「琥珀金边框选中高亮」。此时无需繁琐拖拽，直接按下键盘 ↑（上键）或 ↓（下键），即可将该题目自由上移或下移！'
                    : 'In favorites mode, click any question card to select it with a glowing amber gold frame. Then simply press the ArrowUp (↑) or ArrowDown (↓) keys to move the question up or down seamlessly!' }}
                </p>
                <div class="shortcut-pills">
                  <span class="key-pill"><kbd>点击题目</kbd> {{ locale === 'zh' ? '金框选中聚焦' : 'Select with Gold Frame' }}</span>
                  <span class="key-pill"><kbd>&uarr;</kbd> {{ locale === 'zh' ? '向上移动题目' : 'Move Question Up' }}</span>
                  <span class="key-pill"><kbd>&darr;</kbd> {{ locale === 'zh' ? '向下移动题目' : 'Move Question Down' }}</span>
                  <span class="key-pill"><kbd>ESC / 点击空白</kbd> {{ locale === 'zh' ? '取消选中' : 'Deselect' }}</span>
                </div>
              </div>

              <div class="feature-card">
                <div class="fc-title">{{ locale === 'zh' ? '学科过滤与相对顺序保护' : 'Subject Filter & Sequence Preservation' }}</div>
                <p class="fc-desc">
                  {{ locale === 'zh'
                    ? '在顶栏或收藏夹内可快速按具体学科（如 CAIE-AL-9702）筛选。在筛选状态下移动排序，系统会自动锚定可视题目前后插入，绝不破坏被隐藏的其他学科题目的相对顺序。'
                    : 'Filter favorites by subject scope anytime. Reordering in filtered view moves items relative to visible neighbors without altering hidden subjects.' }}
                </p>
              </div>

              <div class="feature-card">
                <div class="fc-title">{{ locale === 'zh' ? '联动学科筛选导出 PDF' : 'PDF Export with Subject Filter' }}</div>
                <p class="fc-desc">
                  {{ locale === 'zh'
                    ? '支持导出收藏夹整套题目或附带详细解析。导出严格尊重当前的学科过滤设置，且 PDF 封面与标题会自动标注学科名称。'
                    : 'Export favorite question sheets or include mark schemes as high-resolution PDF. Exports strictly adhere to the active subject filter.' }}
                </p>
              </div>
            </div>

            <!-- 2. 做题与快捷键 (Practice & Shortcuts) -->
            <div v-if="activeTab === 'stream' || activeTab === 'all'" class="guide-section">
              <div class="section-title-row">
                <span class="section-icon">⌨️</span>
                <h4 class="section-heading">{{ locale === 'zh' ? '做题流操作与键盘快捷键' : 'Practice Stream & Keyboard Shortcuts' }}</h4>
              </div>

              <div class="feature-card">
                <div class="fc-title">{{ locale === 'zh' ? '极速键盘翻题' : 'Lightning-Fast Navigation' }}</div>
                <p class="fc-desc">
                  {{ locale === 'zh'
                    ? '在做题页面无需持续滑动滚轮，直接使用键盘方向键即可快速在连续试题间切换，做题节奏更沉浸。'
                    : 'Use left and right arrow keys to seamlessly flip between questions without touching your mouse.' }}
                </p>
                <div class="shortcut-pills">
                  <span class="key-pill"><kbd>&larr;</kbd> {{ locale === 'zh' ? '上一题' : 'Previous Question' }}</span>
                  <span class="key-pill"><kbd>&rarr;</kbd> {{ locale === 'zh' ? '下一题' : 'Next Question' }}</span>
                  <span class="key-pill"><kbd>ESC</kbd> {{ locale === 'zh' ? '关闭浮窗 / 取消选中' : 'Close Modal / Deselect' }}</span>
                </div>
              </div>

              <div class="feature-card">
                <div class="fc-title">{{ locale === 'zh' ? '官方评分标准 (Mark Scheme) 抽屉' : 'Official Mark Scheme Drawer' }}</div>
                <p class="fc-desc">
                  {{ locale === 'zh'
                    ? '每道试题右上角配有「💡」按钮，点击可平滑展开对应年份考试局官方 Mark Scheme，逐小题核对采分点（M1, A1, B1）。'
                    : 'Click the "💡" lamp button on any question card to smoothly reveal the official mark scheme and rubric.' }}
                </p>
              </div>

              <div class="feature-card">
                <div class="fc-title">{{ locale === 'zh' ? '右侧浮动题号定位轨道' : 'Floating Question Number Rail' }}</div>
                <p class="fc-desc">
                  {{ locale === 'zh'
                    ? '页面右侧常驻微型题号导览轨道，实时指示当前视口题目序号，点击任意题号即可平滑滑动直达。'
                    : 'A persistent question rail floats on the right, showing current progress. Click any number to jump instantly.' }}
                </p>
              </div>
            </div>

            <!-- 3. 搜索语法 (Search Syntax) -->
            <div v-if="activeTab === 'search' || activeTab === 'all'" class="guide-section">
              <div class="section-title-row">
                <span class="section-icon">🔍</span>
                <h4 class="section-heading">{{ locale === 'zh' ? '双模检索与高级搜索语法' : 'Dual Search Bar & Advanced Syntax' }}</h4>
              </div>

              <div class="feature-card">
                <div class="fc-title">{{ locale === 'zh' ? '整套卷精准检索 (qp: 语法)' : 'Full Past Paper Search (qp: Syntax)' }}</div>
                <p class="fc-desc">
                  {{ locale === 'zh'
                    ? '输入 qp:试卷文件名 可快速调出整份历年真题试卷的所有大题与小题。例如：'
                    : 'Type qp:filename to pull up every question from that specific past paper session. For example:' }}
                </p>
                <div class="tip-tags">
                  <code class="tip-code">qp:9702_s21_qp_23</code>
                  <code class="tip-code">qp:9702_w20_qp_42</code>
                  <code class="tip-code">qp:9702_m22_qp_12</code>
                </div>
              </div>

              <div class="feature-card">
                <div class="fc-title">{{ locale === 'zh' ? '知识点多词联搜' : 'Multi-keyword Boolean Search' }}</div>
                <p class="fc-desc">
                  {{ locale === 'zh'
                    ? '支持多关键词组合检索，快速找到涵盖多个考点的综合压轴题：'
                    : 'Combine topic keywords to pinpoint cross-concept examination problems:' }}
                </p>
                <div class="tip-tags">
                  <code class="tip-code">density + volume</code>
                  <code class="tip-code">gravitational field</code>
                  <code class="tip-code">simple harmonic motion</code>
                </div>
              </div>

              <div class="feature-card">
                <div class="fc-title">{{ locale === 'zh' ? '题号直跳' : 'Direct Question Jump' }}</div>
                <p class="fc-desc">
                  {{ locale === 'zh'
                    ? '在搜索框直接输入数字（如 1、2、10）或 Q2，可快速定位目标小题或编号大题。'
                    : 'Input numbers like 1, 2, or Q4 to instantly filter questions matching that problem number.' }}
                </p>
              </div>
            </div>

            <!-- 4. 首页与学科导航 (Home & Subjects) -->
            <div v-if="activeTab === 'home' || activeTab === 'all'" class="guide-section">
              <div class="section-title-row">
                <span class="section-icon">🏠</span>
                <h4 class="section-heading">{{ locale === 'zh' ? '首页全科架构与常驻顶栏切换' : 'Subject Architecture & Top Bar Switcher' }}</h4>
              </div>

              <div class="feature-card">
                <div class="fc-title">{{ locale === 'zh' ? '顶栏常驻与全科秒切' : 'Sticky Top Bar with Instant Switcher' }}</div>
                <p class="fc-desc">
                  {{ locale === 'zh'
                    ? '无论滚轮滑到何处，顶栏均固定置顶。点击顶栏左侧的当前学科名称，即可弹出全科分段菜单，随时跨学科切换或返回全科总览主页。'
                    : 'The top navigation bar is permanently fixed. Click the subject title anytime to pop open the 17-subject picker or return home.' }}
                </p>
              </div>

              <div class="feature-card">
                <div class="fc-title">{{ locale === 'zh' ? '涵盖主流国际考局与竞赛' : 'Comprehensive Curriculum Coverage' }}</div>
                <p class="fc-desc">
                  {{ locale === 'zh'
                    ? '系统收录 CAIE (A-Level / IGCSE)、Edexcel (IAL / 本土 GCSE / AL)、AQA 以及 BPhO (Round 1 & 2)、PhysicsBowl、PAT 等高阶赛级题库。'
                    : 'Includes CAIE, Edexcel, AQA curricula alongside premier physics olympiads (BPhO, PhysicsBowl, PAT).' }}
                </p>
              </div>
            </div>

            <!-- 5. 弹幕与社区交流 (Danmaku) -->
            <div v-if="activeTab === 'danmaku' || activeTab === 'all'" class="guide-section">
              <div class="section-title-row">
                <span class="section-icon">💬</span>
                <h4 class="section-heading">{{ locale === 'zh' ? '学习弹幕与做题心得交流' : 'Community Danmaku & Study Notes' }}</h4>
              </div>

              <div class="feature-card">
                <div class="fc-title">{{ locale === 'zh' ? '写留言与独立显示开关' : 'Post Comments & Visibility Slider' }}</div>
                <p class="fc-desc">
                  {{ locale === 'zh'
                    ? '顶栏分段控制条清晰划分：左侧「💬 发弹幕」点击撰写做题技巧与心得；右侧「显示」微型滑动开关可随时开启或关闭全屏飘字。'
                    : 'The segmented top bar control clearly distinguishes: left "Post" to write insights, right "Show" toggle to turn the stream on or off.' }}
                </p>
              </div>

              <div class="feature-card">
                <div class="fc-title">{{ locale === 'zh' ? '悬停直显头像与无需移鼠点赞' : 'Hover Avatar Preview & Instant Like' }}</div>
                <p class="fc-desc">
                  {{ locale === 'zh'
                    ? '鼠标悬停飘过的弹幕胶囊时，卡片会自动浮现作者真实头像、昵称与完整留言，并在鼠标所在处直接提供 ❤️ 点赞按钮，无需来回移动鼠标即可快速点赞或取消点赞。'
                    : 'Hovering over any floating capsule reveals the author avatar, handle, full comment, and an inline heart button for instant 1-click liking.' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="help-modal-footer">
            <span class="footer-tip">
              {{ locale === 'zh' ? '按 ESC 键或点击外部可随时关闭' : 'Press ESC or click outside to dismiss' }}
            </span>
            <button class="btn-got-it" @click="emit('close')">
              {{ t('guide.gotIt') }}
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
  background: rgba(44, 47, 50, 0.45);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
  box-sizing: border-box;
}

.help-modal-card {
  width: 100%;
  max-width: 660px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  box-shadow: 0 16px 40px rgba(44, 47, 50, 0.18), 0 2px 6px rgba(44, 47, 50, 0.08);
  overflow: hidden;
}

.help-modal-header {
  padding: 16px 22px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-base);
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  border: 1px solid var(--accent-primary-border);
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 700;
  font-size: 1.1rem;
}

.modal-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.modal-subtitle {
  margin: 3px 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.6rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.btn-close:hover {
  color: var(--accent-primary);
  background: var(--bg-surface);
}

/* 多态情境选项卡 */
.help-tabs-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: #fbfbf9;
  border-bottom: 1px solid var(--border-subtle);
  overflow-x: auto;
  scrollbar-width: none;
}

.help-tabs-bar::-webkit-scrollbar {
  display: none;
}

.help-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.16s ease;
  user-select: none;
}

.help-tab-btn:hover {
  background: rgba(44, 47, 50, 0.05);
  color: var(--text-main);
}

.help-tab-btn.is-active {
  background: var(--bg-surface);
  color: var(--accent-primary);
  border-color: var(--border-color);
  box-shadow: 0 1px 3px rgba(44, 47, 50, 0.05);
}

.context-badge {
  font-size: 0.65rem;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
  font-weight: 700;
  line-height: 1.2;
}

/* Modal Body */
.help-modal-body {
  padding: 20px 22px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
}

.guide-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-subtle);
}

.section-icon {
  font-size: 1.15rem;
}

.section-heading {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
}

.feature-card {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feature-card.highlight-card {
  background: rgba(217, 119, 6, 0.04);
  border-color: rgba(217, 119, 6, 0.35);
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.08);
}

.fc-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.new-pill {
  font-size: 0.68rem;
  font-weight: 700;
  color: #ffffff;
  background: #d97706;
  padding: 1px 6px;
  border-radius: 4px;
}

.fc-title {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--text-main);
}

.fc-desc {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.shortcut-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.key-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: var(--text-main);
  background: var(--bg-surface);
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  box-shadow: 0 1px 2px rgba(44, 47, 50, 0.04);
}

kbd {
  display: inline-block;
  padding: 1px 5px;
  font-family: monospace;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-primary);
  background: var(--accent-primary-light);
  border: 1px solid var(--accent-primary-border);
  border-radius: 3px;
}

.tip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.tip-code {
  font-family: monospace;
  font-size: 0.78rem;
  color: var(--accent-primary);
  background: var(--accent-primary-light);
  border: 1px solid var(--accent-primary-border);
  padding: 2px 7px;
  border-radius: 4px;
}

/* Footer */
.help-modal-footer {
  padding: 12px 22px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-tip {
  font-size: 0.76rem;
  color: var(--text-muted);
}

.btn-got-it {
  background: var(--accent-primary);
  color: #ffffff;
  border: none;
  padding: 7px 20px;
  border-radius: var(--radius-base);
  font-weight: 600;
  font-size: 0.86rem;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: 0 2px 6px rgba(194, 65, 40, 0.2);
}

.btn-got-it:hover {
  background: #a93520;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(194, 65, 40, 0.28);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .help-modal-card {
  transition: transform 0.2s ease;
}

.modal-fade-enter-from .help-modal-card {
  transform: scale(0.96) translateY(8px);
}
</style>