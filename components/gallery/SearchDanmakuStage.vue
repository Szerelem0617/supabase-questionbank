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
          <DanmakuCapsule 
            v-for="(item, idx) in [...leftLanes[0], ...leftLanes[0]]" 
            :key="'sl0-' + idx + '-' + item.id"
            :item="item"
            :showDot="true"
            @like="handleLike(item)"
          />
        </div>
      </div>

      <!-- Lane 1 -->
      <div class="search-lane lane-bottom">
        <div class="search-track track-rtl track-speed-left-1" @animationiteration="onIteration('left', 1)">
          <DanmakuCapsule 
            v-for="(item, idx) in [...leftLanes[1], ...leftLanes[1]]" 
            :key="'sl1-' + idx + '-' + item.id"
            :item="item"
            :showDot="true"
            @like="handleLike(item)"
          />
        </div>
      </div>
    </div>

    <!-- Right Flank of Search Area -->
    <div class="search-stage search-stage-right">
      <!-- Lane 0 -->
      <div class="search-lane lane-top">
        <div class="search-track track-rtl track-speed-right-0" @animationiteration="onIteration('right', 0)">
          <DanmakuCapsule 
            v-for="(item, idx) in [...rightLanes[0], ...rightLanes[0]]" 
            :key="'sr0-' + idx + '-' + item.id"
            :item="item"
            :showDot="true"
            @like="handleLike(item)"
          />
        </div>
      </div>

      <!-- Lane 1 -->
      <div class="search-lane lane-bottom">
        <div class="search-track track-ltr track-speed-right-1" @animationiteration="onIteration('right', 1)">
          <DanmakuCapsule 
            v-for="(item, idx) in [...rightLanes[1], ...rightLanes[1]]" 
            :key="'sr1-' + idx + '-' + item.id"
            :item="item"
            :showDot="true"
            @like="handleLike(item)"
          />
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

@media (max-width: 1280px) {
  .search-ambient-container {
    display: none;
  }
}
</style>