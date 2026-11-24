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
  return [...globalList, ...CURATED_PHYSICS_TIPS.map((tip, idx) => ({
    id: `seed-home-${idx}`,
    author: tip.author,
    message: tip.message,
    likes: tip.likes,
    time: tip.time,
    liked: false
  }))]
})

// 7 组错落有致的垂直泳道高度（不与考试局标题绑定，自然错开）
const laneTops = [45, 155, 275, 400, 530, 660, 790]

// 每条泳道拥有独立的速度与交替的运行方向，形成无规律、不同步的灵动飘移感
const laneConfigs = [
  { dir: 'rtl', speed: 34, delay: 0 },
  { dir: 'ltr', speed: 42, delay: -15 },
  { dir: 'rtl', speed: 30, delay: -8 },
  { dir: 'ltr', speed: 46, delay: -22 },
  { dir: 'rtl', speed: 36, delay: -12 },
  { dir: 'ltr', speed: 38, delay: -5 },
  { dir: 'rtl', speed: 32, delay: -18 }
]

// 泳道分配的数据槽
const laneItems = ref([[], [], [], [], [], [], []])

function distributeComments() {
  const list = allComments.value
  if (!list || list.length === 0) return

  const lanes = [[], [], [], [], [], [], []]
  list.forEach((item, idx) => {
    lanes[idx % 7].push(item)
  })

  // 保证每条泳道有至少 3 条数据实现平滑无缝循环
  laneItems.value = lanes.map(arr => {
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
        avatarUrl: c.profiles?.avatar_url || null,
        message: c.message,
        likes: c.likes || 0,
        liked: checkIsLiked(c.id),
        time: formatTimeAgo(c.created_at)
      }))

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
    <!-- 7 条错落有致、横跨全页的浮动跑道 -->
    <div 
      v-for="(lane, lIdx) in laneItems" 
      :key="'lane-' + lIdx"
      class="danmaku-lane-row"
      :style="{ top: `${laneTops[lIdx % laneTops.length]}px` }"
    >
      <div 
        class="danmaku-marquee-track" 
        :class="laneConfigs[lIdx].dir === 'rtl' ? 'track-dir-rtl' : 'track-dir-ltr'"
        :style="{ 
          animationDuration: `${laneConfigs[lIdx].speed}s`,
          animationDelay: `${laneConfigs[lIdx].delay}s`
        }"
        @animationiteration="onIteration(lIdx)"
      >
        <DanmakuCapsule 
          v-for="(item, idx) in [...lane, ...lane]" 
          :key="'item-' + lIdx + '-' + idx + '-' + item.id"
          :item="item"
          @like="handleLike(item)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-ambient-stage {
  position: absolute;
  top: 0;
  bottom: 0;
  /* 横跨两侧留白与卡片空白空间，宽度为 100% + 580px */
  left: -290px;
  right: -290px;
  pointer-events: none;
  overflow: hidden;
  /* 置于卡片 (z-index: 2) 下方，卡片实体与卡片间 16px 缝隙自然盖住弹幕 */
  z-index: 1;
  mask-image: linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%);
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
  gap: 260px; /* 胶囊之间保持充足距离，错落有致，不扎堆 */
  white-space: nowrap;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  pointer-events: none;
}

.danmaku-lane-row:hover .danmaku-marquee-track {
  animation-play-state: paused;
}

/* 贯穿左右留白与空白卡片区的完整平移动画 */
.track-dir-rtl {
  animation-name: flyRtlFullWidth;
}

.track-dir-ltr {
  animation-name: flyLtrFullWidth;
}

@keyframes flyRtlFullWidth {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@keyframes flyLtrFullWidth {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0); }
}

@media (max-width: 1200px) {
  .home-ambient-stage {
    left: 0;
    right: 0;
  }
}
</style>