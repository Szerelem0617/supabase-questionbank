<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useDanmaku, checkIsLiked, DEFAULT_COMMUNITY_COMMENTS, CURATED_PHYSICS_TIPS } from '~/composables/useDanmaku'

const client = useSupabaseClient()
const { t, locale } = useI18n()
const danmakuStore = useDanmaku()

const props = defineProps({
  showToast: { type: Function, default: null }
})

// Unified pool of comments
const allComments = computed(() => {
  const globalList = danmakuStore.globalCommentsList.value || []
  return [...globalList, ...CURATED_PHYSICS_TIPS.map((t, idx) => ({
    id: `seed-home-${idx}`,
    author: t.author,
    message: t.message,
    likes: t.likes,
    time: t.time,
    liked: false
  }))]
})

// 5 evenly distributed vertical lanes (independent of exam board headers)
const laneTops = [50, 180, 310, 440, 570]

// Each lane maintains an array of items for continuous looping
const laneItems = ref([[], [], [], [], []])

function distributeComments() {
  const list = allComments.value
  if (!list || list.length === 0) return

  const lanes = [[], [], [], [], []]
  list.forEach((item, idx) => {
    lanes[idx % 5].push(item)
  })

  // Ensure each lane has at least 3 items for infinite marquee
  laneItems.value = lanes.map((arr, i) => {
    if (arr.length < 3) return [...arr, ...arr, ...arr]
    return arr
  })
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

      // Prepend to store's global comments
      dbComments.forEach(c => {
        if (!danmakuStore.globalCommentsList.value.some(existing => existing.id === c.id)) {
          danmakuStore.globalCommentsList.value.unshift(c)
        }
      })
    }
  } catch (err) {
    console.warn('[HomeDanmaku] Failed to fetch comments:', err)
  } finally {
    distributeComments()
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

watch(danmakuStore.latestGlobalComment, (newMsg) => {
  if (newMsg) {
    distributeComments()
  }
})

function handleLike(item) {
  danmakuStore.toggleLike(item, client, props.showToast)
}

function onIteration(laneIdx) {
  const lane = laneItems.value[laneIdx]
  if (lane) {
    lane.forEach(item => { item.liked = false })
  }
}

onMounted(() => {
  distributeComments()
  fetchHomepageComments()
})
</script>

<template>
  <div v-if="danmakuStore.danmakuEnabled.value" class="home-ambient-stage" aria-hidden="true">
    <!-- 5 Independent Vertical Lanes spanning from Left Gutter across Cards to Right Gutter -->
    <div 
      v-for="(lane, lIdx) in laneItems" 
      :key="'lane-' + lIdx"
      class="danmaku-lane-row"
      :style="{ top: `${laneTops[lIdx % laneTops.length]}px` }"
    >
      <!-- Alternating directions: even lanes fly Right-to-Left, odd lanes fly Left-to-Right -->
      <div 
        class="danmaku-marquee-track" 
        :class="lIdx % 2 === 0 ? 'track-dir-rtl track-speed-' + (lIdx % 3) : 'track-dir-ltr track-speed-' + (lIdx % 3)"
        @animationiteration="onIteration(lIdx)"
      >
        <div 
          v-for="(item, idx) in [...lane, ...lane]" 
          :key="'item-' + lIdx + '-' + idx + '-' + item.id"
          class="danmaku-capsule"
        >
          <!-- Compact Elegant Rounded Pill (Matches Subject Page) -->
          <div class="danmaku-text-preview">
            <span class="preview-dot"></span>
            {{ item.message }}
          </div>

          <!-- Hover Card Popover with Author, Full Message and Like button (Matches Subject Page) -->
          <div class="danmaku-hover-card" @click.stop>
            <div class="hover-card-header">
              <span class="hover-tag">💬 {{ item.author }}</span>
              <span class="hover-time">{{ item.time || '刚刚' }}</span>
            </div>
            <div class="hover-card-content">
              {{ item.message }}
            </div>
            <div class="hover-card-footer">
              <button 
                type="button"
                class="hover-like-btn" 
                :class="{ 'is-liked': item.liked }"
                @click.stop="handleLike(item)"
                :title="item.liked ? (locale === 'zh' ? '已点赞 (飘走前可取消)' : 'Liked') : (locale === 'zh' ? '赞同' : 'Like')"
              >
                <span class="like-heart">{{ item.liked ? '❤️' : '🤍' }}</span>
                <span class="like-num">{{ item.likes || 0 }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-ambient-stage {
  position: absolute;
  top: 0;
  bottom: 0;
  /* Extends into the left and right gutters flanking the central card area */
  left: -280px;
  right: -280px;
  pointer-events: none;
  overflow: hidden;
  z-index: 10;
  /* Smooth edge fading as comments enter and leave the side spaces */
  mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
}

.danmaku-lane-row {
  position: absolute;
  left: 0;
  right: 0;
  height: 40px;
  white-space: nowrap;
  pointer-events: none;
}

.danmaku-marquee-track {
  display: inline-flex;
  gap: 36px;
  white-space: nowrap;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  pointer-events: none;
}

.danmaku-lane-row:hover .danmaku-marquee-track {
  animation-play-state: paused;
}

/* Flight paths: crossing through right space, card area, and left space */
.track-dir-rtl {
  animation-name: flyRtlAcross;
}

.track-dir-ltr {
  animation-name: flyLtrAcross;
}

.track-speed-0 { animation-duration: 44s; }
.track-speed-1 { animation-duration: 52s; }
.track-speed-2 { animation-duration: 48s; }

@keyframes flyRtlAcross {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@keyframes flyLtrAcross {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0); }
}

/* Isomorphic capsule structure matching DanmakuStage.vue */
.danmaku-capsule {
  position: relative;
  display: inline-block;
  cursor: pointer;
  pointer-events: auto;
}

.danmaku-text-preview {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px 5px 12px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #3d3b38;
  background: rgba(253, 250, 246, 0.94);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(220, 215, 206, 0.9);
  box-shadow: 0 2px 8px rgba(44, 47, 50, 0.06);
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.16s ease;
  user-select: none;
}

.preview-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-primary);
  flex-shrink: 0;
  opacity: 0.85;
}

.danmaku-capsule:hover .danmaku-text-preview {
  background: #ffffff;
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  box-shadow: 0 4px 14px rgba(194, 65, 40, 0.18);
  transform: translateY(-1px);
}

/* Hover Card Popover */
.danmaku-hover-card {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 250px;
  max-width: 300px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(44, 47, 50, 0.12);
  padding: 10px 14px;
  z-index: 100;
  white-space: normal;
  pointer-events: auto;
  cursor: default;
}

.danmaku-capsule:hover .danmaku-hover-card {
  display: block;
}

.hover-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.hover-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent-primary);
  background: var(--accent-primary-light);
  padding: 1px 7px;
  border-radius: 6px;
}

.hover-time {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.hover-card-content {
  font-size: 0.8rem;
  color: var(--text-main);
  line-height: 1.45;
  margin-bottom: 8px;
}

.hover-card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.hover-like-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  font-size: 0.76rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.hover-like-btn:hover {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  border-color: var(--accent-primary-border);
}

.hover-like-btn.is-liked {
  color: #e0245e;
  font-weight: 700;
  border-color: rgba(224, 36, 94, 0.3);
}

@media (max-width: 1280px) {
  .home-ambient-stage {
    left: -20px;
    right: -20px;
  }
}
</style>