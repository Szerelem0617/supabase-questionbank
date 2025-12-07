<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  subjectId: String // e.g. '9618'
})

const client = useSupabaseClient()

// --- State ---
const images = ref([])
const loadingText = ref('Loading questions...')
const currentQuestionData = ref(null)
const currentFilename = ref('')
const msDetails = ref('')
const showDetails = ref(false)
const detailsLoading = ref(false)
const isShowingAnswer = ref(false)

// AI Modal State
const showAskModal = ref(false)
const modalQNum = ref('')
const modalContext = ref('')

// Similarity / Benchmark State
const findingSimilar = ref(false)
const similarityScore = ref(null)
const benchmarkData = ref(null) // { legacy: { time, payload }, edge: { time, payload } }

// --- Methods ---
async function fetchSiblings(code, seasonYear, paper, qNum) {
    const idPrefix = `${code}_${seasonYear}_qp_${paper}_${qNum}`;
    
    const { data, error } = await client
        .from('questions_data')
        .select('id, question_raw_number, start_y, end_y, start_page, details')
        .filter('id', 'like', `${idPrefix}%`)
        .order('start_page', { ascending: true })
        .order('start_y', { ascending: true });
        
    if (error) {
        console.error("Error fetching siblings:", error);
        return [];
    }
    
    const filtered = data.filter(item => {
        const parts = item.id.split('_');
        if (parts.length < 5) return false;
        return parts[4] === qNum;
    });
    return filtered;
}

function calculateOverlayPositions(siblings) {
    if (!siblings || siblings.length === 0) return [];
    
    const pagesMap = {};
    const startPage = siblings[0].start_page;
    
    siblings.forEach(s => {
        if (!pagesMap[s.start_page]) pagesMap[s.start_page] = [];
        pagesMap[s.start_page].push(s);
    });
    
    const result = [];
    
    Object.keys(pagesMap).sort().forEach(pageStr => {
        const pageNum = parseInt(pageStr);
        const pageSiblings = pagesMap[pageNum];
        const pageIndex = pageNum - startPage;
        
        const minY = Math.min(...pageSiblings.map(s => s.start_y));
        const maxY = Math.max(...pageSiblings.map(s => s.end_y));
        const totalHeight = maxY - minY;
        
        const buttons = pageSiblings.map(s => {
            const subQMidY = (s.start_y + s.end_y) / 2;
            const relativeTop = subQMidY - minY;
            let percent = (relativeTop / totalHeight) * 100;
            percent = Math.max(0, Math.min(100, percent));
            return { ...s, topPercent: percent };
        });
        result[pageIndex] = buttons;
    });
    return result;
}

async function loadAllPages(firstPageFilename, isMs = false) {
  const { data: firstUrlData } = client.storage
    .from('bucket')
    .getPublicUrl(firstPageFilename);
  
  images.value = [firstUrlData.publicUrl];

  if (isMs) return;
  if (!firstPageFilename.endsWith('_1.png')) return;

  const baseName = firstPageFilename.slice(0, -6);
  let pageNum = 2;
  let keepChecking = true;

  while (keepChecking) {
    const nextFilename = `${baseName}_${pageNum}.png`;
    const { data: nextUrlData } = client.storage
      .from('bucket')
      .getPublicUrl(nextFilename);
    
    const url = nextUrlData.publicUrl;

    try {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          images.value.push(url);
          resolve();
        };
        img.onerror = () => reject();
        img.src = url;
      });
      pageNum++;
      if (pageNum > 10) keepChecking = false; 
    } catch (e) {
      keepChecking = false;
    }
  }
}

async function getImages() {
  images.value = []
  currentQuestionData.value = null
  currentFilename.value = ''
  showDetails.value = false
  msDetails.value = ''
  loadingText.value = 'Loading question...'
  isShowingAnswer.value = false
  similarityScore.value = null
  findingSimilar.value = false
  benchmarkData.value = null

  try {
    // Hardcoded for demo, can be filtered by props.subjectId later
    const paperToDisplay = '9618_s22_qp_11.pdf'; 
    
    const { data: allIds, error: idError } = await client
      .from('questions_data')
      .select('id')
      .eq('paper_filename', paperToDisplay);

    if (idError) throw idError;
    if (!allIds || allIds.length === 0) throw new Error(`No questions found.`);

    const randomIndex = Math.floor(Math.random() * allIds.length);
    const randomId = allIds[randomIndex].id;

    const { data: questionData, error: dbError } = await client
      .from('questions_data')
      .select('id, paper_filename, ms_vector, question_raw_number')
      .eq('id', randomId)
      .single(); 
    
    if (dbError) throw dbError;

    let qpFilename = '';
    let siblingsData = [];
    try {
        const parts = questionData.id.split('_');
        if (parts.length >= 5) {
            const code = parts[0];
            const seasonYear = parts[1];
            const paper = parts[3];
            const qNum = parts[4];
            qpFilename = `${code}_${seasonYear}_${paper}_q${qNum}_1.png`;
            const siblings = await fetchSiblings(code, seasonYear, paper, qNum);
            siblingsData = calculateOverlayPositions(siblings);
        } else {
             qpFilename = questionData.id + '.png';
        }
    } catch (e) {
        qpFilename = questionData.id + '.png';
    }

    const msFilename = questionData.id.replace('_qp_', '_ms_') + '.png';
    questionData.qpFilename = qpFilename;
    questionData.msFilename = msFilename;
    questionData.siblings = siblingsData;

    currentQuestionData.value = questionData;
    currentFilename.value = qpFilename;
    await loadAllPages(qpFilename, false);

  } catch (error) {
    console.error('CRITICAL ERROR:', error)
    loadingText.value = `Error: ${error.message}`
  }
}

async function handleSubQClick(sibling) {
    modalQNum.value = sibling.question_raw_number;
    modalContext.value = sibling.details || "No text details available for this question.";
    showAskModal.value = true;
}

function toggleMode() {
  if (!currentQuestionData.value) return;
  isShowingAnswer.value = !isShowingAnswer.value;
  
  let newFilename = '';
  if (isShowingAnswer.value) {
    newFilename = currentQuestionData.value.msFilename;
    loadAllPages(newFilename, true);
  } else {
    newFilename = currentQuestionData.value.qpFilename;
    loadAllPages(newFilename, false);
  }
  currentFilename.value = newFilename;
}

async function fetchDetails() {
  if (!currentQuestionData.value) return
  if (showDetails.value) {
    showDetails.value = false
    return
  }
  detailsLoading.value = true
  msDetails.value = ''
  try {
    const { data, error } = await client
      .from('questions_data')
      .select('ms_details')
      .eq('id', currentQuestionData.value.id)
      .single()
    if (error) throw error
    msDetails.value = data.ms_details || 'Not found.'
  } catch (error) {
    msDetails.value = 'Error loading details.'
  } finally {
    detailsLoading.value = false
    showDetails.value = true
  }
}

async function findSimilarImage() {
  if (!currentQuestionData.value) return
  findingSimilar.value = true
  images.value = []
  loadingText.value = 'Running Benchmark (Searching)...'
  showDetails.value = false
  similarityScore.value = null
  benchmarkData.value = null

  try {
    const currentId = currentQuestionData.value.id;
    const currentVector = currentQuestionData.value.ms_vector;
    const currentPaper = currentQuestionData.value.paper_filename;

    // --- TRACK 1: Legacy Client-Side (Unsafe & Heavy) ---
    const t0_legacy = performance.now();
    
    // Payload cost simulation
    const legacyPayloadSize = JSON.stringify({ 
      current_vector: currentVector, 
      current_paper: currentPaper, 
      current_id: currentId 
    }).length;

    const { data: similarDataLegacy, error: rpcError } = await client.rpc('match_similar_question', {
      current_vector: currentVector,
      current_paper: currentPaper,
      current_id: currentId
    })
    
    const t1_legacy = performance.now();
    if (rpcError) throw rpcError

    const legacyTime = (t1_legacy - t0_legacy).toFixed(2);

    // --- TRACK 2: Edge Function (Secure & Light) ---
    const t0_edge = performance.now();
    
    const edgePayloadSize = JSON.stringify({ question_id: currentId }).length;

    const { data: edgeResponse, error: edgeError } = await client.functions.invoke('find-similar', {
      body: { question_id: currentId }
    })

    const t1_edge = performance.now();
    const edgeTime = (t1_edge - t0_edge).toFixed(2);

    if (edgeError) {
        console.error("Edge Function Error:", edgeError);
    }

    // --- Update Benchmark Data ---
    benchmarkData.value = {
        legacy: {
            time: legacyTime,
            payload: (legacyPayloadSize / 1024).toFixed(2), // KB
            exposed: 'YES (Vector)'
        },
        edge: {
            time: edgeTime,
            payload: (edgePayloadSize / 1024).toFixed(3), // KB
            exposed: 'NO'
        }
    }

    // Use result (prefer Edge, fallback to Legacy)
    const nextQuestion = edgeResponse?.match || similarDataLegacy?.[0];
    
    if (!nextQuestion) {
      loadingText.value = 'No similar questions found in this paper.'
      return
    }

    // Construct filenames for the NEW question
    let nextQpFilename = '';
    try {
        const parts = nextQuestion.id.split('_');
        if (parts.length >= 5) {
            nextQpFilename = `${parts[0]}_${parts[1]}_${parts[3]}_q${parts[4]}_1.png`;
        } else {
            nextQpFilename = nextQuestion.id + '.png';
        }
    } catch (e) {
        nextQpFilename = nextQuestion.id + '.png';
    }
    const nextMsFilename = nextQuestion.id.replace('_qp_', '_ms_') + '.png';

    // Update state with new question
    currentQuestionData.value = {
      id: nextQuestion.id,
      paper_filename: nextQuestion.paper_filename,
      ms_vector: nextQuestion.ms_vector, 
      qpFilename: nextQpFilename,
      msFilename: nextMsFilename,
      // Note: We are missing 'siblings' for the new question here unless we fetch them again.
      // For this demo, we can either fetch them or skip overlays for the similar result.
      // Let's try to be thorough and fetch siblings if possible.
    }

    // Try to fetch siblings for the new question to maintain overlay functionality
    try {
        const parts = nextQuestion.id.split('_');
        if (parts.length >= 5) {
             const code = parts[0];
             const seasonYear = parts[1];
             const paper = parts[3];
             const qNum = parts[4];
             const siblings = await fetchSiblings(code, seasonYear, paper, qNum);
             currentQuestionData.value.siblings = calculateOverlayPositions(siblings);
        }
    } catch (e) { console.log("Skipping siblings for similar result"); }

    similarityScore.value = nextQuestion.similarity
    
    isShowingAnswer.value = false; 
    currentFilename.value = nextQpFilename
    await loadAllPages(nextQpFilename, false);

  } catch (error) {
    console.error('Error finding similar image:', error)
    loadingText.value = 'Error searching for similar image.'
  } finally {
    findingSimilar.value = false
  }
}

onMounted(() => {
    getImages()
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

    <div class="gallery-container">
      <div v-if="images.length === 0 && (loadingText || findingSimilar)">
        {{ loadingText }}
      </div>

      <div v-if="images.length > 0" class="image-wrapper">
        <div class="image-list">
          <div v-for="(imgUrl, index) in images" :key="index" class="image-item" style="position: relative;">
             <img :src="imgUrl" alt="Question Page" />
             <div v-if="!isShowingAnswer && currentQuestionData?.siblings?.[index]" class="overlay-container">
                <button 
                    v-for="sibling in currentQuestionData.siblings[index]" 
                    :key="sibling.id"
                    class="subq-btn"
                    :style="{ top: sibling.topPercent + '%' }"
                    @click="handleSubQClick(sibling)"
                    :title="sibling.question_raw_number"
                >
                    {{ sibling.question_raw_number.includes('(') ? sibling.question_raw_number.substring(sibling.question_raw_number.indexOf('(')) : sibling.question_raw_number }}
                </button>
             </div>
          </div>
        </div>

        <div v-if="similarityScore !== null" class="similarity-display">
          Similarity Score: {{ (similarityScore * 100).toFixed(2) }}%
        </div>

        <div class="button-group">
          <button @click="toggleMode" class="details-button" style="background-color: #e67e22;">
            {{ isShowingAnswer ? 'Show Question' : 'Show Answer' }}
          </button>
           <button @click="findSimilarImage" :disabled="findingSimilar" class="details-button">
            {{ findingSimilar ? 'Searching...' : 'Find Similar (Benchmark)' }}
          </button>
          <button @click="getImages" class="details-button">
            Next Random
          </button>
           <button @click="fetchDetails" class="details-button">
            {{ showDetails ? 'Hide Details' : 'Show Details' }}
          </button>
        </div>
        
        <!-- Benchmark Report -->
        <div v-if="benchmarkData" class="benchmark-report">
            <h3>🚀 Performance & Security Benchmark</h3>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Legacy (Client-Side)</th>
                        <th>Edge Function (Server-Side)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Time (Total)</td>
                        <td>{{ benchmarkData.legacy.time }} ms</td>
                        <td>{{ benchmarkData.edge.time }} ms</td>
                    </tr>
                    <tr>
                        <td>Network Payload</td>
                        <td class="unsafe">{{ benchmarkData.legacy.payload }} KB (Huge!)</td>
                        <td class="safe">{{ benchmarkData.edge.payload }} KB (Tiny!)</td>
                    </tr>
                    <tr>
                        <td>Sensitive Data Exposed?</td>
                        <td class="unsafe">{{ benchmarkData.legacy.exposed }}</td>
                        <td class="safe">{{ benchmarkData.edge.exposed }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div v-if="showDetails" class="details-box">
          <div v-if="detailsLoading">Loading...</div>
          <div v-else>{{ msDetails }}</div>
        </div>
      </div>
    </div>
    <!-- Comment Section -->
    <Comment />
  </div>
</template>

<style scoped>
.gallery-container { text-align: center; margin-top: 20px; }
.image-list { display: flex; flex-direction: column; gap: 10px; align-items: center; }
.image-item { width: 90%; max-width: 1200px; position: relative; display: flex; justify-content: center; }
.image-item img { width: 100%; height: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); object-fit: contain; }

.overlay-container { position: absolute; top: 0; right: 0; height: 100%; width: 50px; }
.subq-btn { 
    position: absolute; right: -60px; transform: translateY(-50%);
    background-color: #3e635f; color: white; border: none; border-radius: 16px;
    min-width: 32px; height: 32px; padding: 0 8px; cursor: pointer;
    font-weight: bold; display: flex; align-items: center; justify-content: center;
    z-index: 10; white-space: nowrap;
    transition: transform 0.2s, background-color 0.2s;
}
.subq-btn:hover { transform: translateY(-50%) scale(1.1); background-color: #2c4643; }

.similarity-display { margin-top: 15px; font-size: 1.2em; font-weight: bold; color: #333; }

.button-group { display: flex; justify-content: center; gap: 15px; margin-top: 20px; flex-wrap: wrap; }
.details-button { 
    background-color: #3e635f; color: white; border: none; padding: 12px 24px; 
    border-radius: 8px; cursor: pointer; min-width: 150px; 
    transition: background-color 0.2s;
}
.details-button:hover { background-color: #324f4c; }
.details-button:disabled { background-color: #999; cursor: not-allowed; }

.details-box { margin: 20px auto; padding: 24px; width: 80%; max-width: 1000px; background: white; text-align: left; white-space: pre-wrap; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); color: #333; }

/* Benchmark Report Styles */
.benchmark-report {
    margin: 30px auto; padding: 20px; width: 90%; max-width: 800px;
    background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.benchmark-report h3 { margin-top: 0; color: #333; margin-bottom: 15px; }
.benchmark-report table { width: 100%; border-collapse: collapse; background: white; }
.benchmark-report th, .benchmark-report td { padding: 12px; border: 1px solid #eee; text-align: center; }
.benchmark-report th { background-color: #e9ecef; font-weight: 600; }
.safe { color: #28a745; font-weight: bold; background-color: #d4edda; }
.unsafe { color: #dc3545; font-weight: bold; background-color: #f8d7da; }
</style>
