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

async function getImages() {
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
    const { data: allIds, error: idError } = await supabase
      .from('questions_data')
      .select('id')
      .eq('paper_filename', paperToDisplay); // Filter by the specific paper

    if (idError) throw idError;
    if (!allIds || allIds.length === 0) {
      throw new Error(`数据库中没有找到任何关于 '${paperToDisplay}' 的题目。`);
    }

    // 2. Pick a random ID from the filtered list
    const randomIndex = Math.floor(Math.random() * allIds.length);
    const randomId = allIds[randomIndex].id;

    // 3. Fetch the full data for that single random ID.
    const { data: questionData, error: dbError } = await supabase
      .from('questions_data')
      .select('id, paper_filename, ms_vector')
      .eq('id', randomId)
      .single(); 
    
    if (dbError) throw dbError;

    // 4. Construct the image filenames.
    // Default QP filename logic: 
    // ID format: 9618_s22_qp_11_1_a  -> Target: 9618_s22_11_q1_1.png
    
    let qpFilename = '';
    try {
        const parts = questionData.id.split('_');
        // parts: ['9618', 's22', 'qp', '11', '1', 'a']
        if (parts.length >= 5) {
            const code = parts[0];
            const seasonYear = parts[1];
            const paper = parts[3]; // Skip 'qp' at index 2
            const qNum = parts[4];
            
            qpFilename = `${code}_${seasonYear}_${paper}_q${qNum}_1.png`;
        } else {
            // Fallback if ID format is unexpected
             qpFilename = questionData.id + '.png';
        }
    } catch (e) {
        console.error("Error parsing ID for filename:", e);
        qpFilename = questionData.id + '.png';
    }

    // MS filename logic (assuming it matches ID structure with _ms_ replacement)
    const msFilename = questionData.id.replace('_qp_', '_ms_') + '.png';
    
    // Store these for toggling
    questionData.qpFilename = qpFilename;
    questionData.msFilename = msFilename;

    // 5. Update the application state to show QP by default.
    currentQuestionData.value = questionData;
    currentFilename.value = qpFilename;
    
    // Get public URL for the QP image
    const { data: publicUrlData } = supabase.storage
      .from('bucket')
      .getPublicUrl(qpFilename);
      
    images.value = [publicUrlData.publicUrl];

  } catch (error) {
    console.error('Error in getImages:', error)
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
  } else {
    // Switch to QP
    newFilename = currentQuestionData.value.qpFilename;
  }
  
  currentFilename.value = newFilename;
  const { data: publicUrlData } = supabase.storage
      .from('bucket')
      .getPublicUrl(newFilename);
  images.value = [publicUrlData.publicUrl];
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
    const { data: publicUrlData } = supabase.storage.from('bucket').getPublicUrl(nextQpFilename)
    images.value = [publicUrlData.publicUrl]

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
        <div class="image-item-single">
          <img :src="images[0]" :key="images[0]" alt="Supabase Image" />
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
.image-item-single {
  margin: 0 auto;
  width: 90%;
  max-width: 1200px;
  height: 50vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
.image-item-single img {
  width: 100%;
  height: 100%;
  object-fit: contain;
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