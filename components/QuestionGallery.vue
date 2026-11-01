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
const isShowingAnswer = ref(false)
const imageLoading = ref(true)
const showDetails = ref(false)
const detailsLoading = ref(false)
const msDetails = ref('')

// Filters
const paperTypeFilter = ref('ALL') // 'ALL' | 'SQ' | 'MCQ'
const selectedPaper = ref('')
const availablePapers = ref([])
const questionList = ref([]) // Current pool of question IDs
const currentIndex = ref(0)
const totalCount = ref(0)

// AI Modal State
const showAskModal = ref(false)
const modalQNum = ref('')
const modalContext = ref('')

// Computed Display Image URL
const currentImageUrl = computed(() => {
  if (!currentQuestionData.value) return ''
  if (isShowingAnswer.value) {
    if (currentQuestionData.value.ms_image_path) {
      return `${cdnBase.value}/${currentQuestionData.value.ms_image_path}`
    }
    return '' // No MS image (e.g. MCQ)
  }
  return currentQuestionData.value.image_path ? `${cdnBase.value}/${currentQuestionData.value.image_path}` : ''
})

// --- Methods ---

// 1. Fetch available papers for this series
async function fetchPapers() {
  try {
    let query = client
      .from('questions_data')
      .select('paper_filename')
      .eq('series', props.subjectId)
      .neq('paper_filename', '')

    const { data, error } = await query
    if (error) throw error

    if (data) {
      const unique = Array.from(new Set(data.map(d => d.paper_filename).filter(Boolean))).sort()
      availablePapers.value = unique
    }
  } catch (err) {
    console.error('Error fetching papers:', err)
  }
}

// 2. Fetch Question IDs matching current filters
async function loadQuestionPool() {
  loading.value = true
  loadingText.value = 'Fetching question list...'
  try {
    let query = client
      .from('questions_data')
      .select('id, question_raw_number, score, paper_type')
      .eq('series', props.subjectId)

    if (paperTypeFilter.value !== 'ALL') {
      query = query.eq('paper_type', paperTypeFilter.value)
    }

    if (selectedPaper.value) {
      query = query.eq('paper_filename', selectedPaper.value)
    }

    query = query.limit(500) // load a good chunk

    const { data, error } = await query
    if (error) throw error

    questionList.value = data || []
    totalCount.value = questionList.value.length

    if (questionList.value.length > 0) {
      // Pick first or random
      currentIndex.value = 0
      await loadQuestionById(questionList.value[0].id)
    } else {
      currentQuestionData.value = null
      loadingText.value = 'No questions found for the selected filters.'
      loading.value = false
    }
  } catch (err) {
    console.error('Error loading question pool:', err)
    loadingText.value = `Error loading questions: ${err.message}`
    loading.value = false
  }
}

// 3. Load specific question by ID
async function loadQuestionById(id) {
  loading.value = true
  imageLoading.value = true
  isShowingAnswer.value = false
  showDetails.value = false

  try {
    const { data, error } = await client
      .from('questions_data')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    currentQuestionData.value = data
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

// 5. Actions
function toggleAnswer() {
  isShowingAnswer.value = !isShowingAnswer.value
  imageLoading.value = true
}

function toggleDetails() {
  showDetails.value = !showDetails.value
}

function openAskAI() {
  if (!currentQuestionData.value) return
  modalQNum.value = currentQuestionData.value.question_raw_number || ''
  modalContext.value = currentQuestionData.value.details || ''
  showAskModal.value = true
}

function onImageLoad() {
  imageLoading.value = false
}

function onImageError() {
  imageLoading.value = false
  console.warn('Failed to load image from CDN:', currentImageUrl.value)
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
    <AskAIModal 
      :isOpen="showAskModal"
      :questionNumber="modalQNum"
      :contextText="modalContext"
      @close="showAskModal = false"
    />

    <!-- Filter & Control Bar -->
    <div class="control-panel">
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

    <!-- Question Viewport -->
    <div class="viewport-card">
      <div v-if="loading" class="state-container">
        <div class="spinner"></div>
        <p>{{ loadingText }}</p>
      </div>

      <div v-else-if="!currentQuestionData" class="state-container empty">
        <p>No questions found matching your filter.</p>
        <button @click="paperTypeFilter = 'ALL'; selectedPaper = ''" class="btn btn-primary">
          Reset Filters
        </button>
      </div>

      <div v-else class="question-content">
        <!-- Metadata Header -->
        <div class="question-meta-bar">
          <div class="meta-left">
            <span class="tag tag-series">{{ currentQuestionData.series }}</span>
            <span class="tag tag-paper">{{ currentQuestionData.paper_filename }}</span>
            <span class="tag tag-qnum">Q: {{ currentQuestionData.question_raw_number }}</span>
            <span class="tag tag-score" v-if="currentQuestionData.score">
              [{{ currentQuestionData.score }} {{ currentQuestionData.score > 1 ? 'marks' : 'mark' }}]
            </span>
          </div>

          <div class="meta-right">
            <button 
              v-if="currentQuestionData.ms_image_path || currentQuestionData.ms_details"
              @click="toggleAnswer" 
              class="btn"
              :class="isShowingAnswer ? 'btn-warn' : 'btn-accent'"
            >
              {{ isShowingAnswer ? '📖 Show Question' : '💡 Show Mark Scheme' }}
            </button>
            <button @click="openAskAI" class="btn btn-ai">
              🤖 Ask AI Tutor
            </button>
            <button @click="toggleDetails" class="btn btn-text">
              {{ showDetails ? 'Hide OCR' : 'Inspect OCR' }}
            </button>
          </div>
        </div>

        <!-- Mode Indicator Banner -->
        <div v-if="isShowingAnswer" class="answer-banner">
          <span>✨ Viewing Official Mark Scheme / Answer</span>
          <span v-if="currentQuestionData.paper_type === 'MCQ' && currentQuestionData.ms_details" class="mcq-answer">
            {{ currentQuestionData.ms_details }}
          </span>
        </div>

        <!-- Image Container -->
        <div class="image-stage">
          <div v-if="imageLoading" class="image-loader">
            <div class="spinner-sm"></div>
            <span>Loading image from Cloudflare CDN...</span>
          </div>

          <div v-if="isShowingAnswer && !currentQuestionData.ms_image_path && currentQuestionData.ms_details" class="text-answer-box">
            <h3>Multiple Choice Correct Answer</h3>
            <div class="answer-highlight">{{ currentQuestionData.ms_details }}</div>
          </div>

          <img 
            v-if="currentImageUrl"
            :src="currentImageUrl" 
            :alt="isShowingAnswer ? 'Mark Scheme' : 'Question Image'"
            class="exam-image"
            @load="onImageLoad"
            @error="onImageError"
          />
        </div>

        <!-- OCR Text Drawer -->
        <div v-if="showDetails" class="ocr-drawer">
          <div class="drawer-header">
            <h4>Extracted Question & Mark Scheme Text</h4>
          </div>
          <div class="drawer-body">
            <div class="ocr-section">
              <h5>Question Text:</h5>
              <pre>{{ currentQuestionData.details || 'No text extracted' }}</pre>
            </div>
            <div class="ocr-section" v-if="currentQuestionData.ms_details">
              <h5>Mark Scheme Text:</h5>
              <pre>{{ currentQuestionData.ms_details }}</pre>
            </div>
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
}

/* Control Panel */
.control-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
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
  max-width: 240px;
  outline: none;
}

.paper-select:focus {
  border-color: #3e635f;
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
  margin-right: 6px;
}

/* Viewport Card */
.viewport-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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

.question-meta-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.meta-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

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

.answer-banner {
  background: #fffbeb;
  border-bottom: 1px solid #fef3c7;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #b45309;
  font-weight: 600;
  font-size: 0.9rem;
}

.mcq-answer {
  background: #f59e0b;
  color: white;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
}

/* Image Stage */
.image-stage {
  padding: 24px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  min-height: 300px;
}

.exam-image {
  max-width: 100%;
  width: 100%;
  max-width: 1240px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  object-fit: contain;
}

.image-loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 0.9rem;
}

.text-answer-box {
  background: #f8fafc;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  margin: 40px auto;
  max-width: 500px;
}

.text-answer-box h3 {
  margin: 0 0 16px 0;
  color: #334155;
  font-size: 1.1rem;
}

.answer-highlight {
  font-size: 1.8rem;
  font-weight: 800;
  color: #3e635f;
}

/* OCR Drawer */
.ocr-drawer {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  padding: 20px 24px;
}

.drawer-header h4 {
  margin: 0 0 14px 0;
  color: #334155;
  font-size: 0.95rem;
}

.drawer-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.ocr-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  color: #64748b;
}

.ocr-section pre {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  font-size: 0.85rem;
  white-space: pre-wrap;
  color: #1e293b;
  max-height: 250px;
  overflow-y: auto;
}

/* Buttons */
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
.btn-text:hover { background: #f1f5f9; color: #0f172a; }

/* Spinners */
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #3e635f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-sm {
  width: 24px;
  height: 24px;
  border: 2px solid #e2e8f0;
  border-top-color: #3e635f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .drawer-body {
    grid-template-columns: 1fr;
  }
  .control-panel {
    flex-direction: column;
    align-items: stretch;
  }
  .nav-controls {
    justify-content: space-between;
  }
}
</style>
