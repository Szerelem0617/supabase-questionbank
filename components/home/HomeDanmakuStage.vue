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
        <div 
          v-for="(item, idx) in [...lane, ...lane]" 
          :key="'item-' + lIdx + '-' + idx + '-' + item.id"
          class="danmaku-capsule"
          :class="{ 'is-liked': item.liked }"
          @click.stop="handleLike(item)"
          :title="item.liked ? (locale === 'zh' ? '点击取消点赞' : 'Click to unlike') : (locale === 'zh' ? '点击直接点赞' : 'Click to like')"
        >
          <!-- 胶囊样式：包含弹幕文本与悬停时无需移动鼠标即可直点的点赞按钮 -->
          <div class="danmaku-text-preview">
            <span class="preview-text">{{ item.message }}</span>
            <button 
              type="button" 
              class="capsule-like-btn" 
              :class="{ 'is-liked': item.liked }"
              @click.stop="handleLike(item)"
              :title="item.liked ? (locale === 'zh' ? '取消点赞' : 'Unlike') : (locale === 'zh' ? '点赞' : 'Like')"
            >
              <span class="like-heart">{{ item.liked ? '❤️' : '🤍' }}</span>
              <span class="like-num">{{ item.likes || 0 }}</span>
            </button>
          </div>

          <!-- 悬停详情卡片：展示留言者、时间与完整内容 -->
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
                :title="item.liked ? (locale === 'zh' ? '已点赞' : 'Liked') : (locale === 'zh' ? '赞同' : 'Like')"
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

/* 胶囊结构与样式（完全同构于 DanmakuStage.vue 与 SearchDanmakuStage.vue） */
.danmaku-capsule {
  position: relative;
  display: inline-block;
  cursor: pointer;
  pointer-events: auto;
}

.danmaku-text-preview {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 14px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #3d3b38;
  background: #fdfaf6;
  border: 1px solid #dfdbd4;
  box-shadow: 0 2px 6px rgba(44, 47, 50, 0.06);
  max-width: 260px;
  transition: all 0.16s ease;
  user-select: none;
}

.preview-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 170px;
}

/* 胶囊内置点赞按钮：位于悬停时光标正下方，零位移即刻点赞/取消 */
.capsule-like-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 1px 6px;
  font-size: 0.72rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
  line-height: 1.2;
}

.capsule-like-btn:hover {
  background: rgba(224, 36, 94, 0.12);
  color: #e0245e;
  transform: scale(1.08);
}

.capsule-like-btn.is-liked {
  background: rgba(224, 36, 94, 0.12);
  color: #e0245e;
  font-weight: 700;
  border-color: rgba(224, 36, 94, 0.3);
}

.capsule-like-btn .like-heart {
  font-size: 0.72rem;
  transition: transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.capsule-like-btn.is-liked .like-heart {
  transform: scale(1.18);
}

.danmaku-capsule:hover .danmaku-text-preview {
  background: #ffffff;
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  box-shadow: 0 4px 14px rgba(255, 95, 64, 0.18);
}

/* 悬停详情卡片（z-index 提高到 200，确保悬停时高亮展示在所有元素之上） */
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
  z-index: 200;
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
  .home-ambient-stage {
    left: 0;
    right: 0;
  }
}
</style>