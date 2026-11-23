<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useDanmaku, CURATED_PHYSICS_TIPS } from '~/composables/useDanmaku'

const { locale } = useI18n()
const danmakuStore = useDanmaku()
const client = useSupabaseClient()

const props = defineProps({
  showToast: { type: Function, default: null }
})

// Combined global comments: tips + community comments
const searchComments = computed(() => {
  const custom = danmakuStore.globalCommentsList.value || []
  return [...custom, ...CURATED_PHYSICS_TIPS.map((t, idx) => ({
    id: `tip-search-${idx}`,
    author: t.author,
    message: t.message,
    likes: t.likes,
    time: t.time,
    liked: false
  }))]
})

// Left & Right lanes
const leftLanes = ref([[], []])
const rightLanes = ref([[], []])

function distributeSearchComments() {
  const all = searchComments.value
  if (!all || all.length === 0) return

  const l0 = []
  const l1 = []
  const r0 = []
  const r1 = []

  all.forEach((item, idx) => {
    const mod = idx % 4
    if (mod === 0) l0.push(item)
    else if (mod === 1) l1.push(item)
    else if (mod === 2) r0.push(item)
    else r1.push(item)
  })

  const ensureMin = (arr) => (arr.length < 2 ? [...arr, ...arr] : arr)
  leftLanes.value = [ensureMin(l0), ensureMin(l1)]
  rightLanes.value = [ensureMin(r0), ensureMin(r1)]
}

onMounted(() => {
  distributeSearchComments()
})

watch(() => danmakuStore.globalCommentsList.value.length, () => {
  distributeSearchComments()
})

function handleLike(item) {
  danmakuStore.toggleLike(item, client, props.showToast)
}

function onIteration(laneGroup, laneIdx) {
  const target = laneGroup === 'left' ? leftLanes.value[laneIdx] : rightLanes.value[laneIdx]
  if (target) {
    target.forEach(item => { item.liked = false })
  }
}
</script>

<template>
  <div v-if="danmakuStore.danmakuEnabled.value" class="search-ambient-container" aria-hidden="true">
    <!-- Left Flank of Search Area -->
    <div class="search-stage search-stage-left">
      <!-- Lane 0 -->
      <div class="search-lane lane-top">
        <div class="search-track track-ltr track-speed-left-0" @animationiteration="onIteration('left', 0)">
          <div 
            v-for="(item, idx) in [...leftLanes[0], ...leftLanes[0]]" 
            :key="'sl0-' + idx + '-' + item.id"
            class="danmaku-capsule"
            :class="{ 'is-liked': item.liked }"
            @click.stop="handleLike(item)"
            :title="item.liked ? (locale === 'zh' ? '点击取消点赞' : 'Click to unlike') : (locale === 'zh' ? '点击直接点赞' : 'Click to like')"
          >
            <div class="danmaku-text-preview">
              <span class="preview-dot"></span>
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

            <div class="danmaku-hover-card" @click.stop>
              <div class="hover-card-header">
                <div class="hover-author-wrap">
                  <img 
                    v-if="item.avatarUrl" 
                    :src="item.avatarUrl" 
                    class="hover-avatar" 
                    alt="Avatar"
                  />
                  <span class="hover-tag">{{ item.avatarUrl ? '' : '💬 ' }}{{ item.author }}</span>
                </div>
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

      <!-- Lane 1 -->
      <div class="search-lane lane-bottom">
        <div class="search-track track-rtl track-speed-left-1" @animationiteration="onIteration('left', 1)">
          <div 
            v-for="(item, idx) in [...leftLanes[1], ...leftLanes[1]]" 
            :key="'sl1-' + idx + '-' + item.id"
            class="danmaku-capsule"
            :class="{ 'is-liked': item.liked }"
            @click.stop="handleLike(item)"
            :title="item.liked ? (locale === 'zh' ? '点击取消点赞' : 'Click to unlike') : (locale === 'zh' ? '点击直接点赞' : 'Click to like')"
          >
            <div class="danmaku-text-preview">
              <span class="preview-dot"></span>
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

            <div class="danmaku-hover-card" @click.stop>
              <div class="hover-card-header">
                <div class="hover-author-wrap">
                  <img 
                    v-if="item.avatarUrl" 
                    :src="item.avatarUrl" 
                    class="hover-avatar" 
                    alt="Avatar"
                  />
                  <span class="hover-tag">{{ item.avatarUrl ? '' : '💬 ' }}{{ item.author }}</span>
                </div>
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

    <!-- Right Flank of Search Area -->
    <div class="search-stage search-stage-right">
      <!-- Lane 0 -->
      <div class="search-lane lane-top">
        <div class="search-track track-rtl track-speed-right-0" @animationiteration="onIteration('right', 0)">
          <div 
            v-for="(item, idx) in [...rightLanes[0], ...rightLanes[0]]" 
            :key="'sr0-' + idx + '-' + item.id"
            class="danmaku-capsule"
            :class="{ 'is-liked': item.liked }"
            @click.stop="handleLike(item)"
            :title="item.liked ? (locale === 'zh' ? '点击取消点赞' : 'Click to unlike') : (locale === 'zh' ? '点击直接点赞' : 'Click to like')"
          >
            <div class="danmaku-text-preview">
              <span class="preview-dot"></span>
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

            <div class="danmaku-hover-card" @click.stop>
              <div class="hover-card-header">
                <div class="hover-author-wrap">
                  <img 
                    v-if="item.avatarUrl" 
                    :src="item.avatarUrl" 
                    class="hover-avatar" 
                    alt="Avatar"
                  />
                  <span class="hover-tag">{{ item.avatarUrl ? '' : '💬 ' }}{{ item.author }}</span>
                </div>
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

      <!-- Lane 1 -->
      <div class="search-lane lane-bottom">
        <div class="search-track track-ltr track-speed-right-1" @animationiteration="onIteration('right', 1)">
          <div 
            v-for="(item, idx) in [...rightLanes[1], ...rightLanes[1]]" 
            :key="'sr1-' + idx + '-' + item.id"
            class="danmaku-capsule"
            :class="{ 'is-liked': item.liked }"
            @click.stop="handleLike(item)"
            :title="item.liked ? (locale === 'zh' ? '点击取消点赞' : 'Click to unlike') : (locale === 'zh' ? '点击直接点赞' : 'Click to like')"
          >
            <div class="danmaku-text-preview">
              <span class="preview-dot"></span>
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

            <div class="danmaku-hover-card" @click.stop>
              <div class="hover-card-header">
                <div class="hover-author-wrap">
                  <img 
                    v-if="item.avatarUrl" 
                    :src="item.avatarUrl" 
                    class="hover-avatar" 
                    alt="Avatar"
                  />
                  <span class="hover-tag">{{ item.avatarUrl ? '' : '💬 ' }}{{ item.author }}</span>
                </div>
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
  </div>
</template>

<style scoped>
.search-ambient-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 10;
}

.search-stage {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 290px;
  overflow: hidden;
  pointer-events: none;
}

.search-stage-left {
  left: -295px;
  mask-image: linear-gradient(to right, transparent, black 10%, black 95%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 95%, transparent);
}

.search-stage-right {
  right: -295px;
  mask-image: linear-gradient(to left, transparent, black 10%, black 95%, transparent);
  -webkit-mask-image: linear-gradient(to left, transparent, black 10%, black 95%, transparent);
}

.search-lane {
  position: absolute;
  left: 0;
  right: 0;
  height: 38px;
  white-space: nowrap;
}

.lane-top {
  top: 6px;
}

.lane-bottom {
  top: 50px;
}

.search-track {
  display: inline-flex;
  gap: 22px;
  white-space: nowrap;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.track-ltr {
  animation-name: searchMarqueeLtr;
}

.track-rtl {
  animation-name: searchMarqueeRtl;
}

.track-speed-left-0 { animation-duration: 36s; }
.track-speed-left-1 { animation-duration: 42s; }
.track-speed-right-0 { animation-duration: 38s; }
.track-speed-right-1 { animation-duration: 44s; }

.search-lane:hover .search-track {
  animation-play-state: paused;
}

@keyframes searchMarqueeLtr {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0); }
}

@keyframes searchMarqueeRtl {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
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
  padding: 4px 8px 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #3d3b38;
  background: rgba(253, 250, 246, 0.94);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(220, 215, 206, 0.9);
  box-shadow: 0 2px 6px rgba(44, 47, 50, 0.05);
  max-width: 250px;
  transition: all 0.16s ease;
  user-select: none;
}

.preview-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 155px;
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

.preview-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-primary);
  flex-shrink: 0;
  opacity: 0.8;
}

.danmaku-capsule:hover .danmaku-text-preview {
  background: #ffffff;
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  box-shadow: 0 4px 12px rgba(194, 65, 40, 0.16);
  transform: translateY(-1px);
}

/* Hover Card Popover */
.danmaku-hover-card {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 230px;
  max-width: 270px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(44, 47, 50, 0.12);
  padding: 10px 12px;
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

.hover-author-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.hover-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(44, 47, 50, 0.12);
  flex-shrink: 0;
}

.hover-tag {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent-primary);
  background: var(--accent-primary-light);
  padding: 1px 6px;
  border-radius: 6px;
}

.hover-time {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.hover-card-content {
  font-size: 0.78rem;
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
  gap: 3px;
  padding: 2px 7px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  font-size: 0.72rem;
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
  .search-ambient-container {
    display: none;
  }
}
</style>