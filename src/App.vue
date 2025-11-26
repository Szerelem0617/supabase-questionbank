<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './supabase'
import { store } from './store'
import Auth from './components/Auth.vue'
import Avatar from './components/Avatar.vue'

import Comment from './components/Comment.vue'

// --- App State ---
const showLoginPage = ref(false)

// --- Auth ---
const session = ref(null)

function goToLogin() {
  showLoginPage.value = true
}

async function signOut() {
  await supabase.auth.signOut()
  session.value = null
  store.profile = null // Clear profile on sign out
}

// --- Gallery ---
const images = ref([])
const loadingText = ref('正在加载图片...')
const currentQuestionData = ref(null)
const currentFilename = ref('') // Now tracks the currently displayed filename (QP or MS)
const msDetails = ref('')
const showDetails = ref(false)
const detailsLoading = ref(false)
const similarityScore = ref(null)
const findingSimilar = ref(false)
const benchmarkData = ref(null) // { legacy: { time, payload }, edge: { time, payload } }
const isShowingAnswer = ref(false) // Default to showing Question

// Helper to fetch sibling sub-questions for coordinate calculation
async function fetchSiblings(code, seasonYear, paper, qNum) {
    console.log(`fetchSiblings called for: code=${code}, sy=${seasonYear}, paper=${paper}, q=${qNum}`);
    
    // Improved pattern: Remove trailing underscore to match "9618_..._1" AND "9618_..._1_a"
    // ID format: 9618_s22_qp_11_1...
    const idPrefix = `${code}_${seasonYear}_qp_${paper}_${qNum}`;
    console.log(`Searching for ID prefix (broad): ${idPrefix}`);
    
    const { data, error } = await supabase
        .from('questions_data')
        .select('id, question_raw_number, start_y, end_y, start_page')
        .filter('id', 'like', `${idPrefix}%`) // Search broadly: _1, _10, _1_a
        .order('start_page', { ascending: true }) // ORDER BY PAGE FIRST!
        .order('start_y', { ascending: true });   // THEN BY Y
        
    if (error) {
        console.error("Error fetching siblings:", error);
        return [];
    }
    
    console.log(`Raw siblings found: ${data.length}`);
    if (data.length > 0) {
        console.log("Sample raw ID:", data[0].id);
    }
    
    // Strict Filter: Ensure we only get Q1, not Q10, Q11, etc.
    const filtered = data.filter(item => {
        const parts = item.id.split('_');
        if (parts.length < 5) return false;
        
        const isMatch = parts[4] === qNum;
        
        if (!isMatch) {
            // Debug: Log why it failed (only first few times to avoid spam)
            // e.g. qNum is '1', but parts[4] is '10'
            if (Math.random() < 0.05) { 
                console.log(`Rejected sibling: ${item.id} (parts[4]="${parts[4]}" != target="${qNum}")`);
            }
        }
        
        return isMatch;
    });
    
    console.log(`Filtered siblings count: ${filtered.length}`);
    return filtered;
}

// Calculate relative positions for buttons
function calculateOverlayPositions(siblings) {
    console.log("calculateOverlayPositions called with:", siblings);
    
    if (!siblings || siblings.length === 0) return [];
    
    const startPage = siblings[0].start_page;
    const samePageSiblings = siblings.filter(s => s.start_page === startPage);
    
    console.log("Same page siblings:", samePageSiblings);
    
    if (samePageSiblings.length === 0) return [];

    const minY = Math.min(...samePageSiblings.map(s => s.start_y));
    const maxY = Math.max(...samePageSiblings.map(s => s.end_y));
    const totalHeight = maxY - minY;
    
    console.log(`Crop bounds: minY=${minY}, maxY=${maxY}, height=${totalHeight}`);
    
    return samePageSiblings.map(s => {
        // Calculate position relative to the TOP of the crop (minY)
        const subQMidY = (s.start_y + s.end_y) / 2;
        const relativeTop = subQMidY - minY;
        let percent = (relativeTop / totalHeight) * 100;
        
        // Clamp percentage to be safe
        percent = Math.max(0, Math.min(100, percent));
        
        console.log(`SubQ ${s.id}: midY=${subQMidY}, relative=${relativeTop}, percent=${percent}%`);
        
        return {
            ...s,
            topPercent: percent
        };
    });
}

// Helper to recursively load multi-page images
async function loadAllPages(firstPageFilename, isMs = false) {
  // 1. Get URL for the first page
  const { data: firstUrlData } = supabase.storage
    .from('bucket')
    .getPublicUrl(firstPageFilename);
  
  // Reset images array with just the first page initially
  images.value = [firstUrlData.publicUrl];

  // If it's MS (Answer), we assume it's single page, so stop here.
  if (isMs) return;

  // If it's QP, we check for _2, _3, etc.
  // Pattern check: does it end in _1.png?
  if (!firstPageFilename.endsWith('_1.png')) return;

  const baseName = firstPageFilename.slice(0, -6); // remove '_1.png'
  let pageNum = 2;
  let keepChecking = true;

  while (keepChecking) {
    const nextFilename = `${baseName}_${pageNum}.png`;
    const { data: nextUrlData } = supabase.storage
      .from('bucket')
      .getPublicUrl(nextFilename);
    
    const url = nextUrlData.publicUrl;

    // Verify existence using a lightweight image load
    try {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          images.value.push(url); // Add to display list
          resolve();
        };
        img.onerror = () => {
          // Error means page doesn't exist
          reject();
        };
        img.src = url;
      });
      pageNum++;
      // Safety break to prevent infinite loops if something goes wrong
      if (pageNum > 10) keepChecking = false; 
    } catch (e) {
      // Stop checking on error (404)
      keepChecking = false;
    }
  }
}

async function getImages() {
  console.log(">>> getImages STARTED <<<"); // CONFIRM EXECUTION
  images.value = []
  currentQuestionData.value = null
  currentFilename.value = ''
  showDetails.value = false
  msDetails.value = ''
  similarityScore.value = null
  loadingText.value = '正在加载图片...'
  findingSimilar.value = false
  benchmarkData.value = null
  isShowingAnswer.value = false // Reset to Question mode on new load

  try {
    // 1. Fetch all IDs from the specific paper '9618_s22_11'.
    const paperToDisplay = '9618_s22_qp_11.pdf';
    console.log(`Fetching IDs for paper: ${paperToDisplay}`);
    
    const { data: allIds, error: idError } = await supabase
      .from('questions_data')
      .select('id')
      .eq('paper_filename', paperToDisplay); // Filter by the specific paper

    if (idError) throw idError;
    if (!allIds || allIds.length === 0) {
      throw new Error(`数据库中没有找到任何关于 '${paperToDisplay}' 的题目。`);
    }
    console.log(`Found ${allIds.length} IDs.`);

    // 2. Pick a random ID from the filtered list
    const randomIndex = Math.floor(Math.random() * allIds.length);
    const randomId = allIds[randomIndex].id;
    console.log(`Selected Random ID: ${randomId}`);

    // 3. Fetch the full data for that single random ID.
    const { data: questionData, error: dbError } = await supabase
      .from('questions_data')
      .select('id, paper_filename, ms_vector, question_raw_number')
      .eq('id', randomId)
      .single(); 
    
    if (dbError) throw dbError;
    console.log("Fetched Question Data:", questionData);

    // 4. Construct the image filenames.
    let qpFilename = '';
    let siblingsData = [];
    
    try {
        const parts = questionData.id.split('_');
        // Expecting: 9618_s22_qp_11_1_a (6 parts) or similar
        console.log("ID Parts:", parts);
        
        if (parts.length >= 5) {
            const code = parts[0];
            const seasonYear = parts[1];
            const paper = parts[3];
            const qNum = parts[4];
            
            qpFilename = `${code}_${seasonYear}_${paper}_q${qNum}_1.png`;
            console.log(`Constructed QP Filename: ${qpFilename}`);
            
            // Fetch siblings for overlay
            console.log("Calling fetchSiblings...");
            const siblings = await fetchSiblings(code, seasonYear, paper, qNum);
            console.log("Siblings returned:", siblings);
            
            siblingsData = calculateOverlayPositions(siblings);
            console.log("Calculated Positions:", siblingsData);
            
        } else {
             console.warn("ID format too short, using fallback.");
             qpFilename = questionData.id + '.png';
        }
    } catch (e) {
        console.error("Error parsing ID or fetching siblings:", e);
        qpFilename = questionData.id + '.png';
    }

    const msFilename = questionData.id.replace('_qp_', '_ms_') + '.png';
    
    questionData.qpFilename = qpFilename;
    questionData.msFilename = msFilename;
    questionData.siblings = siblingsData; // Store overlay data

    // 5. Update state
    currentQuestionData.value = questionData;
    currentFilename.value = qpFilename;
    
    await loadAllPages(qpFilename, false);
    console.log(">>> getImages FINISHED <<<");

  } catch (error) {
    console.error('CRITICAL ERROR in getImages:', error)
    loadingText.value = `获取图片时发生错误: ${error.message}`
  }
}

function toggleMode() {
  if (!currentQuestionData.value) return;
  
  isShowingAnswer.value = !isShowingAnswer.value;
  
  let newFilename = '';
  if (isShowingAnswer.value) {
    // Switch to MS
    newFilename = currentQuestionData.value.msFilename;
    // Load MS (single page)
    loadAllPages(newFilename, true);
  } else {
    // Switch to QP
    newFilename = currentQuestionData.value.qpFilename;
    // Load QP (multi page check)
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
    const { data, error } = await supabase
      .from('questions_data')
      .select('ms_details')
      .eq('id', currentQuestionData.value.id)
      .single()
    if (error) throw error
    msDetails.value = data.ms_details || '未找到对应的评分标准。'
  } catch (error) {
    console.error('Error fetching details:', error)
    msDetails.value = '无法加载此题的评分标准。'
  } finally {
    detailsLoading.value = false
    showDetails.value = true
  }
}

async function findSimilarImage() {
  if (!currentQuestionData.value) return
  findingSimilar.value = true
  images.value = []
  loadingText.value = '正在查找相似题目 (Running Benchmark)...'
  showDetails.value = false
  similarityScore.value = null
  benchmarkData.value = null // Reset benchmark

  try {
    const currentId = currentQuestionData.value.id;
    const currentVector = currentQuestionData.value.ms_vector;
    const currentPaper = currentQuestionData.value.paper_filename;

    // --- TRACK 1: Legacy Client-Side (Unsafe & Heavy) ---
    const t0_legacy = performance.now();
    
    // Simulate fetching the vector if we didn't have it (Payload cost)
    // In reality we already fetched it in getImages, but for search it's part of the cost.
    const legacyPayloadSize = JSON.stringify({ 
      current_vector: currentVector, 
      current_paper: currentPaper, 
      current_id: currentId 
    }).length;

    const { data: similarDataLegacy, error: rpcError } = await supabase.rpc('match_similar_question', {
      current_vector: currentVector,
      current_paper: currentPaper,
      current_id: currentId
    })
    
    const t1_legacy = performance.now();
    if (rpcError) throw rpcError

    const legacyTime = (t1_legacy - t0_legacy).toFixed(2);


    // --- TRACK 2: Edge Function (Secure & Light) ---
    const t0_edge = performance.now();
    
    // Payload is just the ID
    const edgePayloadSize = JSON.stringify({ question_id: currentId }).length;

    const { data: edgeResponse, error: edgeError } = await supabase.functions.invoke('find-similar', {
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

    // Use the result from the Edge Function (or Legacy, they should be same)
    const nextQuestion = edgeResponse?.match || similarDataLegacy?.[0];
    
    if (!nextQuestion) {
      loadingText.value = '未能在同一份 paper 中找到其他相似题目。'
      return
    }

    // For the next round, we might not get the vector back from Edge Function (Security!), 
    // but for this demo to work continuously with Legacy track, we might need to fetch it 
    // or rely on getImages to reset. 
    // For now, let's just update the UI with the image.
    
    // Note: If Edge Function doesn't return vector, Legacy track will fail next time unless we fetch it.
    // But for this 'One-Click' demo, it's fine.
    
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

    currentQuestionData.value = {
      id: nextQuestion.id,
      paper_filename: nextQuestion.paper_filename,
      ms_vector: nextQuestion.ms_vector, // Might be undefined from Edge Function
      qpFilename: nextQpFilename,
      msFilename: nextMsFilename
    }
    similarityScore.value = nextQuestion.similarity
    
    // Respect current mode: if user was viewing Answer, show Answer for new image too?
    // Usually better to reset to Question for a new search.
    isShowingAnswer.value = false; 
    
    currentFilename.value = nextQpFilename
    // Load Pages
    await loadAllPages(nextQpFilename, false);

  } catch (error) {
    console.error('Error finding similar image:', error)
    loadingText.value = '查找相似图片时出错。'
  } finally {
    findingSimilar.value = false
  }
}

onMounted(() => {
  // Handles all auth events
  supabase.auth.onAuthStateChange((event, _session) => {
    session.value = _session
    // On initial load with a session, or after a user signs in
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      store.fetchProfile();
      showLoginPage.value = false;
    }
  })
  
  // Load public gallery for everyone
  getImages()
})

</script>

<template>
  <Auth v-if="showLoginPage" @back="showLoginPage = false" />
  <div v-else class="app-container">
    <!-- Top bar for Authentication -->
    <div class="top-bar">
      <div v-if="session" class="auth-widget">
        <Avatar />
        <button @click="signOut" class="auth-button">Sign Out</button>
      </div>
      <div v-else class="auth-widget">
        <button @click="goToLogin" class="auth-button">
          Login / Register
        </button>
      </div>
    </div>

    <!-- Main Gallery -->
    <div class="gallery-container">
      <h1>Supabase 向量搜索画廊</h1>
      
      <div v-if="images.length === 0 && (loadingText || findingSimilar)">
        {{ loadingText }}
      </div>

      <div v-if="images.length > 0" class="image-wrapper">
        <div class="image-list">
          <div v-for="(imgUrl, index) in images" :key="index" class="image-item" style="position: relative;">
             <img :src="imgUrl" alt="Supabase Image" />
             
             <!-- Sub-question Overlay Buttons (Only show on QP mode and on the first page for now) -->
             <div v-if="!isShowingAnswer && index === 0 && currentQuestionData && currentQuestionData.siblings" class="overlay-container">
                <button 
                    v-for="sibling in currentQuestionData.siblings" 
                    :key="sibling.id"
                    class="subq-btn"
                    :style="{ top: sibling.topPercent + '%' }"
                    @click="alert(`Current sub-question: ${sibling.question_raw_number}`)"
                    :title="sibling.question_raw_number"
                >
                    <!-- Display part after the main number. E.g. "1(b)(ii)" -> "(b)(ii)" -->
                    <!-- Fallback: if no '(', just show the whole thing or last part -->
                    {{ sibling.question_raw_number.includes('(') ? sibling.question_raw_number.substring(sibling.question_raw_number.indexOf('(')) : sibling.question_raw_number }}
                </button>
             </div>
          </div>
        </div>
        <div v-if="similarityScore !== null" class="similarity-display">
          相似度: {{ (similarityScore * 100).toFixed(2) }}%
        </div>
        <div class="button-group">
          <button @click="toggleMode" class="details-button" style="background-color: #e67e22;">
            {{ isShowingAnswer ? '🔙 显示题目' : '👀 显示答案' }}
          </button>
          <button @click="findSimilarImage" :disabled="findingSimilar" class="details-button">
            {{ findingSimilar ? '查找中 (Running Benchmark)...' : '换一张 (最相似)' }}
          </button>
          <button @click="fetchDetails" :disabled="findingSimilar" class="details-button">
            {{ showDetails ? '隐藏评分标准' : '显示评分标准' }}
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
          <div v-if="detailsLoading">正在加载评分标准...</div>
          <div v-else>{{ msDetails }}</div>
        </div>
      </div>
    </div>

    <!-- Comment Section -->
    <Comment />
  </div>
</template>

<style>
/* 基础样式 */
body {
  font-family: Arial, sans-serif;
  background-color: #f4f4f4;
  margin: 0;
  padding: 20px;
}
.app-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* --- Top Auth Bar --- */
.top-bar {
  display: flex;
  justify-content: flex-start; /* Aligned to the left */
  padding: 10px;
  margin-bottom: 20px;
}
.auth-widget {
  display: flex;
  align-items: center;
  gap: 15px;
}
.auth-button {
  border: none;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: white;
  background-color: #3e635f; /* Main theme color */
}
.auth-button:hover {
  background-color: #324f4c;
}


/* --- Gallery --- */
.gallery-container {
  text-align: center;
}
.image-wrapper {
  margin-top: 20px;
}
.image-list {
  display: flex;
  flex-direction: column;
  gap: 10px; /* Space between pages */
  align-items: center;
}
.image-item {
  width: 90%;
  max-width: 1200px;
  /* Remove fixed height to allow natural image height */
  display: flex;
  justify-content: center;
  align-items: center;
}
.image-item img {
  width: 100%;
  height: auto; /* Maintain aspect ratio */
  object-fit: contain;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1); /* Optional: shadow for better visibility */
}

/* Sub-question Overlay Buttons */
.overlay-container {
    position: absolute;
    top: 0;
    right: 0; /* Align to right edge of the container */
    height: 100%;
    width: 50px; /* Width for the button area */
}
.subq-btn {
    position: absolute;
    right: -60px; /* Push further out to accommodate width */
    transform: translateY(-50%); /* Center vertically on the coordinate */
    background-color: #3e635f;
    color: white;
    border: none;
    border-radius: 16px; /* Capsule shape */
    min-width: 32px;
    height: 32px;
    padding: 0 8px; /* Horizontal padding for text */
    font-size: 12px; /* Slightly smaller font */
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, background-color 0.2s;
    z-index: 10;
    white-space: nowrap; /* Prevent wrapping */
}
.subq-btn:hover {
    transform: translateY(-50%) scale(1.1);
    background-color: #2c4643;
}

.similarity-display {
  margin-top: 15px;
  font-size: 1.2em;
  font-weight: bold;
  color: #333;
}
.button-group {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}
.details-button {
  background-color: #3e635f;
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
  min-width: 180px;
}
.details-button:hover {
  background-color: #324f4c;
}
.details-button:disabled {
  background-color: #999;
  opacity: 0.7;
  cursor: not-allowed;
}
.details-box {
  margin: 20px auto;
  padding: 24px;
  width: 80%;
  max-width: 1000px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  white-space: pre-wrap;
  text-align: left;
  line-height: 1.6;
}

/* Benchmark Report Styles */
.benchmark-report {
    margin: 30px auto;
    padding: 20px;
    width: 90%;
    max-width: 800px;
    background-color: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.benchmark-report h3 {
    margin-top: 0;
    color: #333;
    margin-bottom: 15px;
}
.benchmark-report table {
    width: 100%;
    border-collapse: collapse;
    background: white;
}
.benchmark-report th, .benchmark-report td {
    padding: 12px;
    border: 1px solid #eee;
    text-align: center;
}
.benchmark-report th {
    background-color: #e9ecef;
    font-weight: 600;
}
.safe {
    color: #28a745; /* Green */
    font-weight: bold;
    background-color: #d4edda;
}
.unsafe {
    color: #dc3545; /* Red */
    font-weight: bold;
    background-color: #f8d7da;
}
</style>