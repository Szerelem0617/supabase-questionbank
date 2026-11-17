<script setup>
import { ref, onMounted, watch } from 'vue'
import { useDanmaku, checkIsLiked, DEFAULT_COMMUNITY_COMMENTS } from '~/composables/useDanmaku'

const client = useSupabaseClient()
const { locale } = useI18n()
const danmakuStore = useDanmaku()

const commentsList = ref([...DEFAULT_COMMUNITY_COMMENTS])

// 4 distinct floating lanes across the cards area
const lane0Items = ref([])
const lane1Items = ref([])
const lane2Items = ref([])
const lane3Items = ref([])

function distributeToLanes() {
  const l0 = []
  const l1 = []
  const l2 = []
  const l3 = []

  commentsList.value.forEach((item, idx) => {
    const mod = idx % 4
    if (mod === 0) l0.push(item)
    else if (mod === 1) l1.push(item)
    else if (mod === 2) l2.push(item)
    else l3.push(item)
  })

  // Ensure each lane has at least 3 items for infinite marquee loop
  const ensureMin = (arr) => {
    if (arr.length === 0) return [...DEFAULT_COMMUNITY_COMMENTS.slice(0, 3)]
    if (arr.length < 3) return [...arr, ...arr, ...arr]
    return arr
  }

  lane0Items.value = ensureMin(l0)
  lane1Items.value = ensureMin(l1)
  lane2Items.value = ensureMin(l2)
  lane3Items.value = ensureMin(l3)
}

// Fetch real comments from Supabase
async function fetchHomepageComments() {
  try {
    const { data, error } = await client
      .from('comments')
      .select('id, created_at, message, likes, user_id, profiles(display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error && data && data.length > 0) {
      const dbComments = data.map(c => ({
        id: c.id,
        author: c.profiles?.display_name || '考友',
        message: c.message,
        likes: c.likes || 0,
        liked: checkIsLiked(c.id),
        time: formatTimeAgo(c.created_at)
      }))

      commentsList.value = [...dbComments, ...DEFAULT_COMMUNITY_COMMENTS]
    }
  } catch (err) {
    console.warn('[HomeDanmaku] Failed to fetch comments:', err)
  } finally {
    distributeToLanes()
  }
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '刚刚'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

// Listen to global comments broadcast
watch(danmakuStore.latestGlobalComment, (newMsg) => {
  if (newMsg) {
    commentsList.value.unshift(newMsg)
    distributeToLanes()
  }
})

function handleLike(item) {
  danmakuStore.toggleLike(item, client)
}

function onTrackLoop(laneIdx) {
  const lanes = [lane0Items.value, lane1Items.value, lane2Items.value, lane3Items.value]
  const targetLane = lanes[laneIdx] || []
  targetLane.forEach(item => {
    item.liked = false
  })
}

onMounted(() => {
  distributeToLanes()
  fetchHomepageComments()
})
</script>

<template>
  <div v-if="danmakuStore.danmakuEnabled.value" class="home-ambient-stage" aria-hidden="true">
    <!-- Lane 0 (Top area, across CAIE cards) -->
    <div class="h-lane lane-pos-0">
      <div class="h-lane-track track-dir-ltr track-speed-0" @animationiteration="onTrackLoop(0)">
        <div 
          v-for="(item, idx) in [...lane0Items, ...lane0Items]" 
          :key="'l0-' + idx + '-' + item.id" 
          class="h-capsule"
        >
          <span class="hc-tag">💬 {{ item.author }}</span>
          <span class="hc-msg">{{ item.message }}</span>
          <button 
            type="button" 
            class="hc-like-btn" 
            :class="{ 'is-liked': item.liked }" 
            @click.stop="handleLike(item)"
            :title="item.liked ? (locale === 'zh' ? '已点赞 (飘走前可点击取消)' : 'Liked') : (locale === 'zh' ? '点赞赞同' : 'Like')"
          >
            {{ item.liked ? '❤️' : '🤍' }} {{ item.likes || 0 }}
          </button>
        </div>
      </div>
    </div>

    <!-- Lane 1 (Across EDX cards) -->
    <div class="h-lane lane-pos-1">
      <div class="h-lane-track track-dir-rtl track-speed-1" @animationiteration="onTrackLoop(1)">
        <div 
          v-for="(item, idx) in [...lane1Items, ...lane1Items]" 
          :key="'l1-' + idx + '-' + item.id" 
          class="h-capsule"
        >
          <span class="hc-tag">💡 {{ item.author }}</span>
          <span class="hc-msg">{{ item.message }}</span>
          <button 
            type="button" 
            class="hc-like-btn" 
            :class="{ 'is-liked': item.liked }" 
            @click.stop="handleLike(item)"
            :title="item.liked ? (locale === 'zh' ? '已点赞 (飘走前可点击取消)' : 'Liked') : (locale === 'zh' ? '点赞赞同' : 'Like')"
          >
            {{ item.liked ? '❤️' : '🤍' }} {{ item.likes || 0 }}
          </button>
        </div>
      </div>
    </div>

    <!-- Lane 2 (Across AQA cards) -->
    <div class="h-lane lane-pos-2">
      <div class="h-lane-track track-dir-ltr track-speed-2" @animationiteration="onTrackLoop(2)">
        <div 
          v-for="(item, idx) in [...lane2Items, ...lane2Items]" 
          :key="'l2-' + idx + '-' + item.id" 
          class="h-capsule"
        >
          <span class="hc-tag">⚡ {{ item.author }}</span>
          <span class="hc-msg">{{ item.message }}</span>
          <button 
            type="button" 
            class="hc-like-btn" 
            :class="{ 'is-liked': item.liked }" 
            @click.stop="handleLike(item)"
            :title="item.liked ? (locale === 'zh' ? '已点赞 (飘走前可点击取消)' : 'Liked') : (locale === 'zh' ? '点赞赞同' : 'Like')"
          >
            {{ item.liked ? '❤️' : '🤍' }} {{ item.likes || 0 }}
          </button>
        </div>
      </div>
    </div>

    <!-- Lane 3 (Across Olympiad cards) -->
    <div class="h-lane lane-pos-3">
      <div class="h-lane-track track-dir-rtl track-speed-3" @animationiteration="onTrackLoop(3)">
        <div 
          v-for="(item, idx) in [...lane3Items, ...lane3Items]" 
          :key="'l3-' + idx + '-' + item.id" 
          class="h-capsule"
        >
          <span class="hc-tag">🏆 {{ item.author }}</span>
          <span class="hc-msg">{{ item.message }}</span>
          <button 
            type="button" 
            class="hc-like-btn" 
            :class="{ 'is-liked': item.liked }" 
            @click.stop="handleLike(item)"
            :title="item.liked ? (locale === 'zh' ? '已点赞 (飘走前可点击取消)' : 'Liked') : (locale === 'zh' ? '点赞赞同' : 'Like')"
          >
            {{ item.liked ? '❤️' : '🤍' }} {{ item.likes || 0 }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-ambient-stage {
  position: absolute;
  top: 0;
  left: -20px;
  right: -20px;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 5;
  mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
}

.h-lane {
  position: absolute;
  left: 0;
  right: 0;
  height: 38px;
  overflow: visible;
  white-space: nowrap;
}

/* 4 comfortable lanes distributed over card section entities */
.lane-pos-0 { top: 45px; }
.lane-pos-1 { top: 290px; }
.lane-pos-2 { top: 570px; }
.lane-pos-3 { top: 880px; }

.h-lane-track {
  display: inline-flex;
  gap: 28px;
  white-space: nowrap;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.track-dir-rtl {
  animation-name: marqueeRtl;
}

.track-dir-ltr {
  animation-name: marqueeLtr;
}

.track-speed-0 { animation-duration: 48s; }
.track-speed-1 { animation-duration: 40s; }
.track-speed-2 { animation-duration: 52s; }
.track-speed-3 { animation-duration: 44s; }

.h-lane:hover .h-lane-track {
  animation-play-state: paused;
}

@keyframes marqueeRtl {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@keyframes marqueeLtr {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0); }
}

.h-capsule {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px 0 8px;
  background: rgba(253, 250, 246, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(220, 215, 206, 0.85);
  border-radius: 17px;
  box-shadow: 0 3px 12px rgba(44, 47, 50, 0.08);
  pointer-events: auto;
  cursor: default;
  transition: all 0.16s ease;
  user-select: none;
}

.h-capsule:hover {
  transform: translateY(-2px) scale(1.02);
  border-color: var(--accent-primary);
  box-shadow: 0 6px 18px rgba(194, 65, 40, 0.16);
  z-index: 20;
}

.hc-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent-primary);
  background: var(--accent-primary-light);
  padding: 2px 7px;
  border-radius: 10px;
  white-space: nowrap;
}

.hc-msg {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-main);
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hc-like-btn {
  background: transparent;
  border: none;
  font-size: 0.76rem;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 5px;
  border-radius: 10px;
  transition: all 0.14s ease;
}

.hc-like-btn:hover {
  background: rgba(194, 65, 40, 0.08);
  color: var(--accent-primary);
}

.hc-like-btn.is-liked {
  color: #e0245e;
  font-weight: 700;
}

@media (max-width: 768px) {
  .lane-pos-2, .lane-pos-3 {
    display: none;
  }
}
</style>