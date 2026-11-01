<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  subjectId: {
    type: String,
    default: 'CAIE-AL-9702'
  }
})

const client = useSupabaseClient()
const config = useRuntimeConfig()
const cdnBase = computed(() => config.public.cdnBaseUrl || 'https://assets.66367749.xyz')

// --- State ---
const loading = ref(true)
const loadingText = ref('Loading questions...')
const currentQuestionData = ref(null)
const groupQuestions = ref([]) // All subquestions belonging to the active main question
const isSqGroup = computed(() => groupQuestions.value.length > 0 && currentQuestionData.value?.paper_type === 'SQ')

// Subquestion individual states
const expandedAnswers = ref({}) // { [subQId]: boolean }
const expandedComments = ref({}) // { [subQId]: boolean }
const subQComments = ref({}) // { [subQId]: [] }
const newCommentText = ref({}) // { [subQId]: string }
const submittingComment = ref({}) // { [subQId]: boolean }

// Filter & Navigation
const paperTypeFilter = ref('ALL') // 'ALL' | 'SQ' | 'MCQ'
const selectedPaper = ref('')
const availablePapers = ref([])
const questionList = ref([]) // Current pool of question IDs
const currentIndex = ref(0)
const totalCount = ref(0)

// Search State
const searchKeyword = ref('')
const isSearching = ref(false)
const searchResults = ref([])
const showSearchResults = ref(false)

// AI Modal State
const showAskModal = ref(false)
const modalQNum = ref('')
const modalContext = ref('')

// Toast Notification
const toastMessage = ref('')
const showToastNotification = ref(false)
let toastTimer = null

function showToast(msg) {
  toastMessage.value = msg
  showToastNotification.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    showToastNotification.value = false
  }, 3000)
}

// Copy Image State
const copyingImage = ref(false)

// --- Helper Functions ---
function getMainQuestionNumber(raw) {
  if (!raw) return ''
  const str = String(raw).trim()
  const match = str.match(/^(\d+)/)
  return match ? match[1] : str
}

// --- Methods ---

// 1. Fetch available papers for this series
async function fetchPapers() {
  try {
    const { data, error } = await client
      .from('questions_data')
      .select('paper_filename')
      .eq('series', props.subjectId)
      .neq('paper_filename', '')

    if (error) throw error

    if (data) {
      const unique = Array.from(new Set(data.map(d => d.paper_filename).filter(Boolean))).sort()
      availablePapers.value = unique
    }
  } catch (err) {
    console.error('Error fetching papers:', err)
  }
}

// 2. Load Question Pool
async function loadQuestionPool() {
  loading.value = true
  loadingText.value = 'Fetching question list...'
  try {
    let query = client
      .from('questions_data')
      .select('id, question_raw_number, score, paper_type, paper_filename')
      .eq('series', props.subjectId)

    if (paperTypeFilter.value !== 'ALL') {
      query = query.eq('paper_type', paperTypeFilter.value)
    }

    if (selectedPaper.value) {
      query = query.eq('paper_filename', selectedPaper.value)
    }

    query = query.limit(500)

    const { data, error } = await query
    if (error) throw error

    questionList.value = data || []
    totalCount.value = questionList.value.length

    if (questionList.value.length > 0) {
      currentIndex.value = 0
      await loadQuestionById(questionList.value[0].id)
    } else {
      currentQuestionData.value = null
      groupQuestions.value = []
      loadingText.value = 'No questions found for the selected filters.'
      loading.value = false
    }
  } catch (err) {
    console.error('Error loading question pool:', err)
    loadingText.value = `Error loading questions: ${err.message}`
    loading.value = false
  }
}

// 3. Load specific question and resolve its SQ Group
async function loadQuestionById(id) {
  loading.value = true
  expandedAnswers.value = {}
  expandedComments.value = {}

  try {
    const { data: primaryQ, error } = await client
      .from('questions_data')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    currentQuestionData.value = primaryQ

    // If it's a Structured Question (SQ), fetch all siblings belonging to this main question!
    if (primaryQ.paper_type === 'SQ' && primaryQ.paper_filename) {
      const mainNum = getMainQuestionNumber(primaryQ.question_raw_number)
      
      const { data: siblings, error: sibError } = await client
        .from('questions_data')
        .select('*')
        .eq('paper_filename', primaryQ.paper_filename)
        .eq('paper_type', 'SQ')
        .order('start_page', { ascending: true })
        .order('start_y', { ascending: true })

      if (!sibError && siblings && siblings.length > 0) {
        // Filter siblings that share the same main question number
        const matchedSiblings = siblings.filter(s => {
          return getMainQuestionNumber(s.question_raw_number) === mainNum
        })
        groupQuestions.value = matchedSiblings.length > 0 ? matchedSiblings : [primaryQ]
      } else {
        groupQuestions.value = [primaryQ]
      }
    } else {
      // MCQ or standalone
      groupQuestions.value = [primaryQ]
    }
  } catch (err) {
    console.error('Error loading question:', err)
    loadingText.value = `Failed to load question details: ${err.message}`
  } finally {
    loading.value = false
  }
}

// 4. Navigation
function nextQuestion() {
  if (questionList.value.length === 0) return
  if (currentIndex.value < questionList.value.length - 1) {
    currentIndex.value++
  } else {
    currentIndex.value = 0
  }
  loadQuestionById(questionList.value[currentIndex.value].id)
}

function prevQuestion() {
  if (questionList.value.length === 0) return
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else {
    currentIndex.value = questionList.value.length - 1
  }
  loadQuestionById(questionList.value[currentIndex.value].id)
}

function randomQuestion() {
  if (questionList.value.length === 0) return
  const randIdx = Math.floor(Math.random() * questionList.value.length)
  currentIndex.value = randIdx
  loadQuestionById(questionList.value[randIdx].id)
}

// 5. Subquestion Mark Scheme Controls
function toggleSubQAnswer(subQId) {
  expandedAnswers.value[subQId] = !expandedAnswers.value[subQId]
}

function expandAllAnswers() {
  groupQuestions.value.forEach(q => {
    expandedAnswers.value[q.id] = true
  })
}

function collapseAllAnswers() {
  expandedAnswers.value = {}
}

// 6. Search Functionality
async function handleSearch() {
  const kw = searchKeyword.value.trim()
  if (!kw) {
    showSearchResults.value = false
    await loadQuestionPool()
    return
  }

  isSearching.value = true
  showSearchResults.value = true
  try {
    const { data, error } = await client
      .from('questions_data')
      .select('id, question_raw_number, score, paper_type, paper_filename, series, details, image_path, ms_image_path')
      .or(`details.ilike.%${kw}%,paper_filename.ilike.%${kw}%,question_raw_number.ilike.%${kw}%`)
      .limit(30)

    if (error) throw error
    searchResults.value = data || []
  } catch (err) {
    console.error('Search error:', err)
    showToast('Search failed: ' + err.message)
  } finally {
    isSearching.value = false
  }
}

function selectSearchResult(item) {
  showSearchResults.value = false
  loadQuestionById(item.id)
}

// 7. Stitched Image Copy (Adapted from siyuan-plugin-edu copySqGroup)
async function copyStitchedQuestion() {
  const validQuestions = groupQuestions.value.filter(q => q.image_path)
  if (validQuestions.length === 0) {
    showToast('⚠️ No question images available to copy.')
    return
  }

  copyingImage.value = true
  showToast('⏳ Stitching question images...')

  try {
    // Load all images via CORS-enabled Image objects
    const loadedImgs = await Promise.all(
      validQuestions.map(q => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error(`Failed to load ${q.image_path}`))
          img.src = `${cdnBase.value}/${q.image_path}`
        })
      })
    )

    const totalHeight = loadedImgs.reduce((sum, img) => sum + img.height, 0)
    const maxWidth = Math.max(...loadedImgs.map(img => img.width))

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not create canvas context')

    // Single column if totalHeight <= 1800px or only 1 image
    if (totalHeight <= 1800 || loadedImgs.length === 1) {
      canvas.width = maxWidth
      canvas.height = totalHeight

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      let currentY = 0
      for (const img of loadedImgs) {
        ctx.drawImage(img, 0, currentY)
        currentY += img.height
      }
    } else {
      // Two balanced columns (Left / Right)
      const heights = loadedImgs.map(img => img.height)
      const n = loadedImgs.length

      let bestSplitIndex = 0
      let minDiff = Infinity
      for (let i = 0; i < n - 1; i++) {
        const leftH = heights.slice(0, i + 1).reduce((a, b) => a + b, 0)
        const rightH = heights.slice(i + 1).reduce((a, b) => a + b, 0)
        const diff = Math.abs(leftH - rightH)
        if (diff < minDiff) {
          minDiff = diff
          bestSplitIndex = i
        }
      }

      const leftGroup = loadedImgs.slice(0, bestSplitIndex + 1)
      const rightGroup = loadedImgs.slice(bestSplitIndex + 1)

      const leftHeight = leftGroup.reduce((sum, img) => sum + img.height, 0)
      const rightHeight = rightGroup.reduce((sum, img) => sum + img.height, 0)
      const leftWidth = Math.max(...leftGroup.map(img => img.width))
      const rightWidth = Math.max(...rightGroup.map(img => img.width))

      const gap = 24
      canvas.width = leftWidth + gap + rightWidth
      canvas.height = Math.max(leftHeight, rightHeight)

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      let leftY = 0
      for (const img of leftGroup) {
        ctx.drawImage(img, 0, leftY)
        leftY += img.height
      }

      let rightY = 0
      for (const img of rightGroup) {
        ctx.drawImage(img, leftWidth + gap, rightY)
        rightY += img.height
      }
    }

    // Write to clipboard as PNG
    canvas.toBlob(async (blob) => {
      if (!blob) throw new Error('Canvas conversion to blob failed')
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      showToast('✅ 整题切图已成功拼接并复制到剪贴板！可直接粘贴。')
    }, 'image/png')
  } catch (err) {
    console.error('Failed to copy stitched image:', err)
    showToast('❌ 复制切图失败: ' + err.message)
  } finally {
    copyingImage.value = false
  }
}

// 8. Subquestion Comments
async function toggleSubQComment(subQId) {
  expandedComments.value[subQId] = !expandedComments.value[subQId]
  if (expandedComments.value[subQId] && !subQComments.value[subQId]) {
    await fetchSubQComments(subQId)
  }
}

async function fetchSubQComments(subQId) {
  try {
    const { data, error } = await client
      .from('comments')
      .select('id, created_at, message, user_id, question_id, profiles(display_name, avatar_url)')
      .eq('question_id', subQId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      subQComments.value[subQId] = data
    } else {
      subQComments.value[subQId] = []
    }
  } catch (err) {
    console.error('Error fetching subQ comments:', err)
    subQComments.value[subQId] = []
  }
}

async function addSubQComment(subQ) {
  const text = (newCommentText.value[subQ.id] || '').trim()
  if (!text) return

  submittingComment.value[subQ.id] = true
  try {
    const { data: { user } } = await client.auth.getUser()
    if (!user) {
      showToast('⚠️ Please log in to post comments or notes.')
      return
    }

    const { error } = await client.from('comments').insert({
      message: text,
      user_id: user.id,
      question_id: subQ.id,
      sub_q_number: subQ.question_raw_number
    })

    if (error) throw error

    newCommentText.value[subQ.id] = ''
    await fetchSubQComments(subQ.id)
    showToast('💬 Note posted successfully!')
  } catch (err) {
    console.error('Error posting comment:', err)
    showToast('Failed to post: ' + err.message)
  } finally {
    submittingComment.value[subQ.id] = false
  }
}

// 9. AI Tutor Modal Trigger
function openAskAI(subQ) {
  modalQNum.value = subQ?.question_raw_number || currentQuestionData.value?.question_raw_number || ''
  modalContext.value = subQ?.details || currentQuestionData.value?.details || ''
  showAskModal.value = true
}

// Watch filters
watch(paperTypeFilter, () => {
  loadQuestionPool()
})

watch(selectedPaper, () => {
  loadQuestionPool()
})

watch(() => props.subjectId, async () => {
  selectedPaper.value = ''
  paperTypeFilter.value = 'ALL'
  searchKeyword.value = ''
  showSearchResults.value = false
  await fetchPapers()
  await loadQuestionPool()
})

onMounted(async () => {
  await fetchPapers()
  await loadQuestionPool()
})
</script>

<template>
  <div class="gallery-wrapper">
    <!-- Floating Toast Notification -->
    <transition name="toast-fade">
      <div v-if="showToastNotification" class="toast-popup">
        {{ toastMessage }}
      </div>
    </transition>

    <AskAIModal 
      :isOpen="showAskModal"
      :questionNumber="modalQNum"
      :contextText="modalContext"
      @close="showAskModal = false"
    />

    <!-- Top Search & Filter Bar -->
    <div class="control-panel">
      <!-- Search Input Section -->
      <div class="search-section">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchKeyword" 
            type="text" 
            placeholder="Search questions by keyword, topic, paper or year (e.g. circuit, momentum, 2022)..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button v-if="searchKeyword" @click="searchKeyword = ''; handleSearch()" class="search-clear-btn">&times;</button>
          <button @click="handleSearch" :disabled="isSearching" class="btn btn-search">
            {{ isSearching ? 'Searching...' : 'Search' }}
          </button>
        </div>
      </div>

      <!-- Filters & Controls -->
      <div class="filter-controls-row">
        <div class="filters">
          <div class="filter-group">
            <label>Type:</label>
            <div class="pill-tabs">
              <button 
                :class="{ active: paperTypeFilter === 'ALL' }" 
                @click="paperTypeFilter = 'ALL'"
              >All</button>
              <button 
                :class="{ active: paperTypeFilter === 'SQ' }" 
                @click="paperTypeFilter = 'SQ'"
              >Structured (SQ)</button>
              <button 
                :class="{ active: paperTypeFilter === 'MCQ' }" 
                @click="paperTypeFilter = 'MCQ'"
              >Multiple Choice (MCQ)</button>
            </div>
          </div>

          <div class="filter-group paper-select-group" v-if="availablePapers.length > 0">
            <label>Paper:</label>
            <select v-model="selectedPaper" class="paper-select">
              <option value="">All Papers ({{ availablePapers.length }})</option>
              <option v-for="p in availablePapers" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>

        <div class="nav-controls">
          <span class="count-badge" v-if="questionList.length > 0">
            {{ currentIndex + 1 }} / {{ questionList.length }}
          </span>
          <button @click="prevQuestion" :disabled="loading || questionList.length <= 1" class="btn btn-secondary">
            &larr; Prev
          </button>
          <button @click="nextQuestion" :disabled="loading || questionList.length <= 1" class="btn btn-secondary">
            Next &rarr;
          </button>
          <button @click="randomQuestion" :disabled="loading || questionList.length <= 1" class="btn btn-primary">
            🎲 Random
          </button>
        </div>
      </div>
    </div>

    <!-- Search Results Flyout Drawer -->
    <div v-if="showSearchResults" class="search-results-panel">
      <div class="search-results-header">
        <h4>Search Results ({{ searchResults.length }} matches)</h4>
        <button @click="showSearchResults = false" class="close-results-btn">&times;</button>
      </div>
      <div v-if="searchResults.length === 0" class="no-results">
        No questions matched your search query.
      </div>
      <div v-else class="results-list">
        <div 
          v-for="res in searchResults" 
          :key="res.id"
          class="result-card"
          @click="selectSearchResult(res)"
        >
          <div class="result-top">
            <span class="tag tag-series">{{ res.series }}</span>
            <span class="tag tag-paper">{{ res.paper_filename }}</span>
            <span class="tag tag-qnum">Q: {{ res.question_raw_number }}</span>
            <span class="tag tag-score" v-if="res.score">[{{ res.score }}m]</span>
          </div>
          <p class="result-snippet">{{ res.details ? res.details.slice(0, 160) + '...' : 'No text preview' }}</p>
        </div>
      </div>
    </div>

    <!-- Main Question Viewport Card -->
    <div class="viewport-card">
      <div v-if="loading" class="state-container">
        <div class="spinner"></div>
        <p>{{ loadingText }}</p>
      </div>

      <div v-else-if="!currentQuestionData" class="state-container empty">
        <p>No questions found matching your filter.</p>
        <button @click="paperTypeFilter = 'ALL'; selectedPaper = ''; searchKeyword = ''; handleSearch()" class="btn btn-primary">
          Reset Filters
        </button>
      </div>

      <div v-else class="question-container">
        <!-- Main Question Global Header -->
        <div class="main-q-header">
          <div class="header-info">
            <div class="header-tags">
              <span class="tag tag-series">{{ currentQuestionData.series }}</span>
              <span class="tag tag-paper">{{ currentQuestionData.paper_filename }}</span>
              <span class="tag tag-type-badge">{{ currentQuestionData.paper_type }}</span>
            </div>
            <h2 class="main-q-title">
              <span v-if="currentQuestionData.paper_type === 'SQ'">
                Question {{ getMainQuestionNumber(currentQuestionData.question_raw_number) }}
                <span class="subparts-count">({{ groupQuestions.length }} subparts)</span>
              </span>
              <span v-else>
                Question {{ currentQuestionData.question_raw_number }}
              </span>
            </h2>
          </div>

          <!-- Global Action Buttons -->
          <div class="header-actions">
            <!-- Copy Stitched Question Button -->
            <button 
              @click="copyStitchedQuestion" 
              :disabled="copyingImage" 
              class="btn btn-stitch"
              title="Stitch and copy full question image to clipboard"
            >
              📋 {{ copyingImage ? 'Stitching...' : '复制整题切图' }}
            </button>

            <!-- SQ Batch Toggle Answers -->
            <template v-if="currentQuestionData.paper_type === 'SQ'">
              <button @click="expandAllAnswers" class="btn btn-secondary">
                💡 展开全部答案
              </button>
              <button @click="collapseAllAnswers" class="btn btn-secondary">
                📖 收起全部答案
              </button>
            </template>
          </div>
        </div>

        <!-- ================= SQ: MULTI-PART FULL QUESTION DISPLAY ================= -->
        <div v-if="currentQuestionData.paper_type === 'SQ'" class="sq-group-stream">
          <div 
            v-for="(subQ, idx) in groupQuestions" 
            :key="subQ.id" 
            class="subq-block"
          >
            <!-- Subquestion Top Action Bar -->
            <div class="subq-bar">
              <div class="subq-meta">
                <span class="subq-pill">{{ subQ.question_raw_number }}</span>
                <span class="subq-score" v-if="subQ.score">[{{ subQ.score }} {{ subQ.score > 1 ? 'marks' : 'mark' }}]</span>
              </div>

              <div class="subq-tools">
                <!-- Toggle Individual Mark Scheme -->
                <button 
                  v-if="subQ.ms_image_path || subQ.ms_details"
                  @click="toggleSubQAnswer(subQ.id)" 
                  class="btn btn-sm"
                  :class="expandedAnswers[subQ.id] ? 'btn-warn' : 'btn-accent'"
                >
                  {{ expandedAnswers[subQ.id] ? '💡 收起答案' : '💡 查看答案' }}
                </button>

                <!-- Subquestion Notes / Comments -->
                <button 
                  @click="toggleSubQComment(subQ.id)" 
                  class="btn btn-sm btn-text"
                  :class="{ 'btn-active': expandedComments[subQ.id] }"
                >
                  💬 笔记/讨论 {{ subQComments[subQ.id]?.length ? `(${subQComments[subQ.id].length})` : '' }}
                </button>

                <!-- Ask AI Tutor -->
                <button @click="openAskAI(subQ)" class="btn btn-sm btn-ai">
                  🤖 AI 答疑
                </button>
              </div>
            </div>

            <!-- Subquestion Question Slice Image -->
            <div class="subq-image-box">
              <img 
                v-if="subQ.image_path"
                :src="`${cdnBase}/${subQ.image_path}`" 
                :alt="`Sub-question ${subQ.question_raw_number}`"
                class="exam-image"
                loading="lazy"
              />
            </div>

            <!-- Subquestion Expanded Mark Scheme -->
            <transition name="slide-fade">
              <div v-if="expandedAnswers[subQ.id]" class="subq-ms-box">
                <div class="ms-label">
                  <span>✨ 官方评分标准 (Mark Scheme - {{ subQ.question_raw_number }})</span>
                </div>
                <img 
                  v-if="subQ.ms_image_path"
                  :src="`${cdnBase}/${subQ.ms_image_path}`" 
                  alt="Mark Scheme"
                  class="exam-ms-image"
                  loading="lazy"
                />
                <div v-if="subQ.ms_details" class="ms-text-details">
                  <pre>{{ subQ.ms_details }}</pre>
                </div>
              </div>
            </transition>

            <!-- Subquestion Notes / Comments Drawer -->
            <transition name="slide-fade">
              <div v-if="expandedComments[subQ.id]" class="subq-comment-box">
                <div class="comment-drawer-header">
                  <h5>📝 小问笔记与答疑讨论 ({{ subQ.question_raw_number }})</h5>
                  <button @click="expandedComments[subQ.id] = false" class="close-drawer-btn">&times;</button>
                </div>

                <div class="comment-messages-list">
                  <div v-if="!subQComments[subQ.id] || subQComments[subQ.id].length === 0" class="empty-comments">
                    暂无讨论或个人笔记。写下你的做题思路或疑问吧！
                  </div>
                  <div v-for="c in subQComments[subQ.id]" :key="c.id" class="comment-item">
                    <div class="comment-author">
                      <span class="author-name">{{ c.profiles?.display_name || '学习者' }}</span>
                      <span class="comment-time">{{ new Date(c.created_at).toLocaleString() }}</span>
                    </div>
                    <div class="comment-body">{{ c.message }}</div>
                  </div>
                </div>

                <div class="comment-input-row">
                  <input 
                    v-model="newCommentText[subQ.id]" 
                    type="text" 
                    placeholder="写下本小问做题心得或讨论..." 
                    @keyup.enter="addSubQComment(subQ)"
                  />
                  <button 
                    @click="addSubQComment(subQ)" 
                    :disabled="submittingComment[subQ.id]" 
                    class="btn btn-primary btn-sm"
                  >
                    {{ submittingComment[subQ.id] ? '发送中...' : '提交笔记' }}
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- ================= MCQ: MULTIPLE CHOICE QUESTION DISPLAY ================= -->
        <div v-else class="mcq-view">
          <div class="mcq-tools-bar">
            <button 
              @click="toggleSubQAnswer(currentQuestionData.id)" 
              class="btn"
              :class="expandedAnswers[currentQuestionData.id] ? 'btn-warn' : 'btn-accent'"
            >
              {{ expandedAnswers[currentQuestionData.id] ? '💡 隐藏正确选项' : '💡 显示正确选项' }}
            </button>
            <button @click="openAskAI(currentQuestionData)" class="btn btn-ai">
              🤖 AI 答疑解析
            </button>
          </div>

          <div class="image-stage">
            <img 
              v-if="currentQuestionData.image_path"
              :src="`${cdnBase}/${currentQuestionData.image_path}`" 
              alt="Multiple Choice Question"
              class="exam-image"
            />
          </div>

          <!-- MCQ Answer Revelation -->
          <div v-if="expandedAnswers[currentQuestionData.id]" class="mcq-answer-reveal">
            <h3>Correct Option</h3>
            <div class="answer-badge-large">{{ currentQuestionData.ms_details || 'Answer not recorded' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Community Comment Section -->
    <Comment />
  </div>
</template>

<style scoped>
.gallery-wrapper {
  margin-top: 10px;
  position: relative;
}

/* Floating Toast */
.toast-popup {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: #1e293b;
  color: #f8fafc;
  padding: 14px 22px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 10px;
}
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateY(20px); }

/* Control Panel */
.control-panel {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.search-section {
  width: 100%;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 14px;
  font-size: 1rem;
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 10px 100px 10px 42px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 0.92rem;
  color: #1e293b;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #3e635f;
  box-shadow: 0 0 0 3px rgba(62, 99, 95, 0.12);
}

.search-clear-btn {
  position: absolute;
  right: 90px;
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: #94a3b8;
  cursor: pointer;
}

.btn-search {
  position: absolute;
  right: 6px;
  background: #3e635f;
  color: white;
  padding: 6px 16px;
  font-size: 0.85rem;
}

.filter-controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
}

.pill-tabs {
  display: flex;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 8px;
  gap: 2px;
}

.pill-tabs button {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-tabs button.active {
  background: white;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.paper-select {
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #1e293b;
  background: white;
  max-width: 260px;
  outline: none;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.count-badge {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  margin-right: 4px;
}

/* Search Results Flyout Panel */
.search-results-panel {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.search-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.search-results-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #1e293b;
}

.close-results-btn {
  background: transparent;
  border: none;
  font-size: 1.4rem;
  color: #94a3b8;
  cursor: pointer;
}

.results-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  max-height: 350px;
  overflow-y: auto;
}

.result-card {
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.result-card:hover {
  background: #f1f5f9;
  border-color: #3e635f;
  transform: translateY(-2px);
}

.result-top {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.result-snippet {
  margin: 0;
  font-size: 0.82rem;
  color: #475569;
  line-height: 1.4;
}

/* Main Viewport Card */
.viewport-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  min-height: 480px;
}

.state-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 400px;
  gap: 16px;
  color: #64748b;
}

/* Main Question Global Header */
.main-q-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 18px 24px;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.header-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.main-q-title {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
}

.subparts-count {
  font-size: 0.95rem;
  font-weight: 500;
  color: #64748b;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-stitch {
  background: #0284c7;
  color: white;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);
}
.btn-stitch:hover:not(:disabled) {
  background: #0369a1;
}

/* Tag Styles */
.tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}
.tag-series { background: #e0f2fe; color: #0369a1; }
.tag-paper { background: #f1f5f9; color: #475569; }
.tag-qnum { background: #fef3c7; color: #b45309; }
.tag-score { background: #dcfce7; color: #15803d; }
.tag-type-badge { background: #f3e8ff; color: #7e22ce; font-weight: 700; }

/* ================= SQ Stream Layout ================= */
.sq-group-stream {
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 28px;
  background: #fdfdfd;
}

.subq-block {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.subq-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 18px;
  background: #f8fafc;
  border-bottom: 1px solid #edf2f7;
}

.subq-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.subq-pill {
  background: #1e293b;
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 3px 12px;
  border-radius: 14px;
}

.subq-score {
  color: #15803d;
  font-weight: 700;
  font-size: 0.85rem;
}

.subq-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subq-image-box {
  padding: 16px;
  display: flex;
  justify-content: center;
}

.exam-image {
  width: 100%;
  max-width: 1240px;
  height: auto;
  object-fit: contain;
}

/* Subquestion Expanded Mark Scheme */
.subq-ms-box {
  margin: 0 16px 16px 16px;
  padding: 16px;
  background: #f0fdf4;
  border: 1.5px dashed #86efac;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ms-label {
  width: 100%;
  font-size: 0.85rem;
  font-weight: 700;
  color: #166534;
  margin-bottom: 12px;
}

.exam-ms-image {
  width: 100%;
  max-width: 1240px;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.ms-text-details pre {
  margin-top: 10px;
  padding: 10px;
  background: white;
  border: 1px solid #dcfce7;
  border-radius: 6px;
  font-size: 0.85rem;
  white-space: pre-wrap;
  color: #166534;
}

/* Subquestion Comments Box */
.subq-comment-box {
  margin: 0 16px 16px 16px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
}

.comment-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.comment-drawer-header h5 {
  margin: 0;
  color: #334155;
  font-size: 0.9rem;
}

.close-drawer-btn {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: #94a3b8;
  cursor: pointer;
}

.comment-messages-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 14px;
}

.empty-comments {
  font-size: 0.85rem;
  color: #94a3b8;
  text-align: center;
  padding: 14px 0;
}

.comment-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
}

.comment-author {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  margin-bottom: 4px;
}

.author-name {
  font-weight: 700;
  color: #1e293b;
}

.comment-time {
  color: #94a3b8;
}

.comment-body {
  font-size: 0.88rem;
  color: #334155;
}

.comment-input-row {
  display: flex;
  gap: 10px;
}

.comment-input-row input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.85rem;
  outline: none;
}

.comment-input-row input:focus {
  border-color: #3e635f;
}

/* ================= MCQ View ================= */
.mcq-view {
  padding: 24px;
}

.mcq-tools-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 20px;
}

.image-stage {
  display: flex;
  justify-content: center;
  background: white;
}

.mcq-answer-reveal {
  margin: 30px auto;
  padding: 24px;
  max-width: 450px;
  background: #fffbeb;
  border: 2px dashed #f59e0b;
  border-radius: 12px;
  text-align: center;
}

.mcq-answer-reveal h3 {
  margin: 0 0 10px 0;
  color: #b45309;
}

.answer-badge-large {
  font-size: 2rem;
  font-weight: 900;
  color: #b45309;
}

/* Common Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 0.8rem;
  border-radius: 6px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary { background: #3e635f; color: white; }
.btn-primary:hover:not(:disabled) { background: #2f4d4a; }

.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
.btn-secondary:hover:not(:disabled) { background: #e2e8f0; }

.btn-accent { background: #0284c7; color: white; }
.btn-accent:hover { background: #0369a1; }

.btn-warn { background: #d97706; color: white; }
.btn-warn:hover { background: #b45309; }

.btn-ai { background: #7c3aed; color: white; }
.btn-ai:hover { background: #6d28d9; }

.btn-text { background: transparent; color: #64748b; border: 1px solid #cbd5e1; }
.btn-text:hover, .btn-active { background: #f1f5f9; color: #0f172a; border-color: #94a3b8; }

/* Transitions */
.slide-fade-enter-active { transition: all 0.25s ease-out; }
.slide-fade-leave-active { transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateY(-8px); opacity: 0; }

/* Spinner */
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #3e635f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .filter-controls-row {
    flex-direction: column;
    align-items: stretch;
  }
  .nav-controls {
    justify-content: space-between;
  }
}
</style>
