<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useDanmaku, checkIsLiked } from '~/composables/useDanmaku'

const props = defineProps({
  newlyPostedMessage: { type: Object, default: null }
})

const emit = defineEmits(['like-message'])

const client = useSupabaseClient()
const { t, locale } = useI18n()
const danmakuStore = useDanmaku()

// Pre-seeded community comments pool (ensures homepage is always vibrant)
const DEFAULT_COMMUNITY_COMMENTS = [
  { id: 'hc-1', author: 'Physics_Pro', message: 'CAIE 9702 P4 准备中，大家作图记得用直尺，斜率要在图线上取相距一半以上的两点！', likes: 48, time: '刚刚' },
  { id: 'hc-2', author: 'Alex.Cambridge', message: 'CAIE 简答题要求写 force is the rate of change of momentum，不要只写 F=ma 哦！', likes: 36, time: '5分钟前' },
  { id: 'hc-3', author: 'Edexcel_Top', message: 'Edexcel 坐标轴单位经常是 cm/s 或 ms，千万先看清单位再代入公式！', likes: 29, time: '12分钟前' },
  { id: 'hc-4', author: '牛顿的小迷弟', message: '空气阻力做的功 W = ΔEk + ΔEp，千万别漏掉势能损失！', likes: 41, time: '18分钟前' },
  { id: 'hc-5', author: '考神附体2026', message: '终端速度 terminal velocity：当阻力增大等于重力时合力为0，加速度归零恒速下落。', likes: 52, time: '25分钟前' },
  { id: 'hc-6', author: 'BPhO冲金选手', message: '祝大家五月夏季大考全部稳拿 A*！物理必胜！🎉', likes: 64, time: '30分钟前' }
]

const commentsList = ref([...DEFAULT_COMMUNITY_COMMENTS])

// 2 lanes for homepage
const lane0Items = ref([])
const lane1Items = ref([])

function distributeToLanes() {
  const l0 = []
  const l1 = []
  commentsList.value.forEach((item, idx) => {
    if (idx % 2 === 0) l0.push(item)
    else l1.push(item)
  })
  lane0Items.value = l0
  lane1Items.value = l1
}

// Fetch real comments from Supabase
async function fetchHomepageComments() {
  try {
    const { data, error } = await client
      .from('comments')
      .select('id, created_at, message, likes, user_id, profiles(display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data && data.length > 0) {
      const dbComments = data.map(c => ({
        id: c.id,
        author: c.profiles?.display_name || '考友',
        message: c.message,
        likes: c.likes || 0,
        liked: checkIsLiked(c.id),
        time: formatTimeAgo(c.created_at)
      }))

      // Combine with defaults
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

// Watch for newly posted message
watch(() => props.newlyPostedMessage, (newMsg) => {
  if (newMsg) {
    commentsList.value.unshift(newMsg)
    distributeToLanes()
  }
})

function handleLike(item) {
  danmakuStore.toggleLike(item, client)
}

onMounted(() => {
  distributeToLanes()
  fetchHomepageComments()
})
</script>

<template>
  <div v-if="danmakuStore.danmakuEnabled.value" class="home-danmaku-stage">
    <!-- Lane 1 (Fly left-to-right or right-to-left) -->
    <div class="h-lane lane-top">
      <div class="h-lane-track track-speed-normal">
        <div 
          v-for="item in [...lane0Items, ...lane0Items]" 
          :key="'l0-' + item.id + '-' + Math.random()" 
          class="h-capsule"
        >
          <span class="hc-tag">💬 {{ item.author }}</span>
          <span class="hc-msg">{{ item.message }}</span>
          <button 
            type="button" 
            class="hc-like-btn" 
            :class="{ 'is-liked': item.liked }" 
            @click.stop="handleLike(item)"
            :title="item.liked ? '已赞同' : '点赞赞同'"
          >
            {{ item.liked ? '❤️' : '🤍' }} {{ item.likes || 0 }}
          </button>
        </div>
      </div>
    </div>

    <!-- Lane 2 -->
    <div class="h-lane lane-bottom">
      <div class="h-lane-track track-speed-slower">
        <div 
          v-for="item in [...lane1Items, ...lane1Items]" 
          :key="'l1-' + item.id + '-' + Math.random()" 
          class="h-capsule"
        >
          <span class="hc-tag">💡 {{ item.author }}</span>
          <span class="hc-msg">{{ item.message }}</span>
          <button 
            type="button" 
            class="hc-like-btn" 
            :class="{ 'is-liked': item.liked }" 
            @click.stop="handleLike(item)"
            :title="item.liked ? '已赞同' : '点赞赞同'"
          >
            {{ item.liked ? '❤️' : '🤍' }} {{ item.likes || 0 }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-danmaku-stage {
  position: relative;
  width: 100%;
  max-width: 1240px;
  margin: 0 auto 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
}

.h-lane {
  position: relative;
  width: 100%;
  height: 34px;
  overflow: hidden;
  white-space: nowrap;
}

.h-lane-track {
  display: inline-flex;
  gap: 20px;
  white-space: nowrap;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-name: marqueeScroll;
}

.track-speed-normal {
  animation-duration: 38s;
}

.track-speed-slower {
  animation-duration: 46s;
  animation-direction: reverse;
}

.h-lane:hover .h-lane-track {
  animation-play-state: paused;
}

@keyframes marqueeScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.h-capsule {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px 0 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 2px 6px rgba(44, 47, 50, 0.05);
  pointer-events: auto;
  cursor: default;
  transition: all 0.16s ease;
  user-select: none;
}

.h-capsule:hover {
  transform: translateY(-1px) scale(1.02);
  border-color: var(--accent-primary);
  box-shadow: 0 4px 12px rgba(194, 65, 40, 0.14);
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
  font-size: 0.8rem;
  color: var(--text-main);
  font-weight: 500;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hc-like-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.hc-like-btn:hover {
  background: rgba(194, 65, 40, 0.08);
  color: var(--accent-primary);
}

.hc-like-btn.is-liked {
  color: var(--accent-primary);
  font-weight: 700;
}
</style>
