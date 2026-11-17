<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useDanmaku, checkIsLiked, DEFAULT_COMMUNITY_COMMENTS, CURATED_PHYSICS_TIPS } from '~/composables/useDanmaku'

const client = useSupabaseClient()
const { t, locale } = useI18n()
const danmakuStore = useDanmaku()

const props = defineProps({
  showToast: { type: Function, default: null }
})

// Unified pool of comments (community + high frequency curated tips)
const commentsPool = computed(() => {
  const globalList = danmakuStore.globalCommentsList.value || []
  return [...globalList, ...CURATED_PHYSICS_TIPS.map((tip, idx) => ({
    id: `home-seed-${idx}`,
    author: tip.author,
    message: tip.message,
    likes: tip.likes,
    time: tip.time,
    liked: false
  }))]
})

// Staggered, irregular vertical lane tops (isomorphic with subject page)
const laneTops = [40, 140, 245, 360, 485, 615, 750]
const MAX_SLOTS = 7
const CYCLE_DURATION = 15

const activeSlots = ref([])
const poolPointer = ref(0)

function initSlots() {
  const list = commentsPool.value
  if (!list || list.length === 0) return

  const count = Math.min(MAX_SLOTS, list.length)
  const slots = []
  for (let i = 0; i < count; i++) {
    // Irregular staggered negative delays and varied durations so they don't form a line
    const variedDuration = CYCLE_DURATION + (i % 3) * 2.5
    const negativeDelay = -Number((i * (variedDuration / count) + (i % 2) * 1.5).toFixed(2))
    slots.push({
      slotId: `hslot-${i}-${Date.now()}`,
      laneIndex: i,
      item: list[i % list.length],
      duration: variedDuration,
      delay: negativeDelay,
      isPaused: false
    })
  }
  poolPointer.value = count - 1
  activeSlots.value = slots
}

function onSlotIteration(sIdx) {
  const list = commentsPool.value
  if (!list || list.length <= MAX_SLOTS) return

  if (activeSlots.value[sIdx]?.item) {
    activeSlots.value[sIdx].item.liked = false
  }

  poolPointer.value = (poolPointer.value + 1) % list.length
  if (activeSlots.value[sIdx]) {
    activeSlots.value[sIdx].item = list[poolPointer.value]
  }
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

      dbComments.forEach(c => {
        if (!danmakuStore.globalCommentsList.value.some(existing => existing.id === c.id)) {
          danmakuStore.globalCommentsList.value.unshift(c)
        }
      })
    }
  } catch (err) {
    console.warn('[HomeDanmaku] Failed to fetch comments:', err)
  } finally {
    if (activeSlots.value.length === 0) {
      initSlots()
    }
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
  if (newMsg && activeSlots.value.length > 0) {
    // Instantly inject newly posted comment into the first slot
    activeSlots.value[0].item = newMsg
  }
})

function handleLike(item) {
  danmakuStore.toggleLike(item, client, props.showToast)
}

onMounted(() => {
  initSlots()
  fetchHomepageComments()
})
</script>

<template>
  <div v-if="danmakuStore.danmakuEnabled.value && activeSlots.length > 0" class="home-portal-wrapper" aria-hidden="true">
    <!-- 左侧留白舞台：从卡片左边缘穿出，向左外侧滑行 (完全同构于 subject 页面) -->
    <div class="danmaku-portal-stage danmaku-stage-left">
      <div 
        v-for="(slot, sIdx) in activeSlots" 
        :key="'left-' + slot.slotId"
        class="danmaku-lane"
        :style="{ top: `${laneTops[sIdx % laneTops.length]}px` }"
      >
        <div 
          v-if="slot.item"
          class="danmaku-runner-left"
          :class="{ 'is-paused': slot.isPaused }"
          :style="{ 
            animationDuration: `${slot.duration}s`, 
            animationDelay: `${slot.delay}s`
          }"
          @animationiteration="onSlotIteration(sIdx)"
        >
          <div 
            class="danmaku-capsule"
            @mouseenter="slot.isPaused = true"
            @mouseleave="slot.isPaused = false"
          >
            <div class="danmaku-text-preview">
              {{ slot.item.message }}
            </div>

            <!-- 悬停详情卡片 -->
            <div class="danmaku-hover-card" @click.stop>
              <div class="hover-card-header">
                <span class="hover-tag">💬 {{ slot.item.author }}</span>
                <span class="hover-time">{{ slot.item.time || '刚刚' }}</span>
              </div>
              <div class="hover-card-content">
                {{ slot.item.message }}
              </div>
              <div class="hover-card-footer">
                <button 
                  type="button"
                  class="hover-like-btn" 
                  :class="{ 'is-liked': slot.item.liked }"
                  @click.stop="handleLike(slot.item)"
                  :title="slot.item.liked ? (locale === 'zh' ? '已点赞' : 'Liked') : (locale === 'zh' ? '赞同' : 'Like')"
                >
                  <span class="like-heart">{{ slot.item.liked ? '❤️' : '🤍' }}</span>
                  <span class="like-num">{{ slot.item.likes || 0 }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧留白舞台：从右外侧向左滑行，滑入卡片右边缘穿入 (完全同构于 subject 页面) -->
    <div class="danmaku-portal-stage danmaku-stage-right">
      <div 
        v-for="(slot, sIdx) in activeSlots" 
        :key="'right-' + slot.slotId"
        class="danmaku-lane"
        :style="{ top: `${laneTops[sIdx % laneTops.length]}px` }"
      >
        <div 
          v-if="slot.item"
          class="danmaku-runner-right"
          :class="{ 'is-paused': slot.isPaused }"
          :style="{ 
            animationDuration: `${slot.duration}s`, 
            animationDelay: `${slot.delay}s`
          }"
        >
          <div 
            class="danmaku-capsule"
            @mouseenter="slot.isPaused = true"
            @mouseleave="slot.isPaused = false"
          >
            <div class="danmaku-text-preview">
              {{ slot.item.message }}
            </div>

            <!-- 悬停详情卡片 -->
            <div class="danmaku-hover-card" @click.stop>
              <div class="hover-card-header">
                <span class="hover-tag">💡 {{ slot.item.author }}</span>
                <span class="hover-time">{{ slot.item.time || '刚刚' }}</span>
              </div>
              <div class="hover-card-content">
                {{ slot.item.message }}
              </div>
              <div class="hover-card-footer">
                <button 
                  type="button"
                  class="hover-like-btn" 
                  :class="{ 'is-liked': slot.item.liked }"
                  @click.stop="handleLike(slot.item)"
                  :title="slot.item.liked ? (locale === 'zh' ? '已点赞' : 'Liked') : (locale === 'zh' ? '赞同' : 'Like')"
                >
                  <span class="like-heart">{{ slot.item.liked ? '❤️' : '🤍' }}</span>
                  <span class="like-num">{{ slot.item.likes || 0 }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-portal-wrapper {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.danmaku-portal-stage {
  position: absolute;
  top: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 15;
}

.danmaku-stage-left {
  left: -290px;
  width: 290px;
}

.danmaku-stage-right {
  right: -290px;
  width: 290px;
}

.danmaku-lane {
  position: absolute;
  left: 0;
  right: 0;
  height: 40px;
  pointer-events: none;
}

.danmaku-runner-left,
.danmaku-runner-right {
  position: absolute;
  top: 0;
  pointer-events: auto;
  white-space: nowrap;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.danmaku-runner-right {
  animation-name: flyRightVoid;
}

@keyframes flyRightVoid {
  0% { transform: translateX(290px); }
  100% { transform: translateX(-240px); }
}

.danmaku-runner-left {
  animation-name: flyLeftVoid;
}

@keyframes flyLeftVoid {
  0% { transform: translateX(290px); }
  100% { transform: translateX(-240px); }
}

.danmaku-runner-left.is-paused,
.danmaku-runner-right.is-paused {
  animation-play-state: paused !important;
  z-index: 100 !important;
}

.danmaku-capsule {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.danmaku-text-preview {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #3d3b38;
  background: #fdfaf6;
  border: 1px solid #dfdbd4;
  box-shadow: 0 2px 6px rgba(44, 47, 50, 0.06);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.16s ease;
}

.danmaku-capsule:hover .danmaku-text-preview {
  background: #fff;
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  box-shadow: 0 4px 12px rgba(255, 95, 64, 0.18);
}

.danmaku-hover-card {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 240px;
  max-width: 280px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(44, 47, 50, 0.12);
  padding: 10px 14px;
  z-index: 999;
  white-space: normal;
  pointer-events: auto;
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
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.hover-time {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.hover-card-content {
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--text-main);
  margin-bottom: 8px;
}

.hover-card-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.hover-like-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.75rem;
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

@media (max-width: 1200px) {
  .danmaku-portal-stage {
    display: none;
  }
}
</style>