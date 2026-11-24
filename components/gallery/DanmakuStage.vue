<script setup>
const { t, locale } = useI18n()

const props = defineProps({
  activeSlots: { type: Array, default: () => [] },
  laneTops: { type: Array, default: () => [80, 165, 250, 335, 420] },
  danmakuEnabled: { type: Boolean, default: false },
  hasDanmaku: { type: Boolean, default: false }
})

const emit = defineEmits(['slot-iteration', 'toggle-like', 'focus-subq'])
</script>

<template>
  <div v-if="danmakuEnabled && hasDanmaku">
    <!-- 左侧边空弹幕舞台 -->
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
          @animationiteration="emit('slot-iteration', sIdx)"
        >
          <DanmakuCapsule
            :item="slot.item"
            @mouseenter="slot.isPaused = true"
            @mouseleave="slot.isPaused = false"
            @toggle-like="emit('toggle-like', slot.item)"
            @focus-subq="emit('focus-subq', $event)"
          />
        </div>
      </div>
    </div>

    <!-- 右侧边空弹幕舞台 -->
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
          <DanmakuCapsule
            :item="slot.item"
            @mouseenter="slot.isPaused = true"
            @mouseleave="slot.isPaused = false"
            @toggle-like="emit('toggle-like', slot.item)"
            @focus-subq="emit('focus-subq', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

@media (max-width: 1200px) {
  .danmaku-portal-stage {
    display: none;
  }
}
</style>

