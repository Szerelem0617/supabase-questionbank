<script setup>
const { t, locale } = useI18n()

const props = defineProps({
  activeSlots: { type: Array, default: () => [] },
  laneTops: { type: Array, default: () => [80, 165, 250, 335, 420] },
  danmakuEnabled: { type: Boolean, default: true },
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
          <div 
            class="danmaku-capsule"
            @mouseenter="slot.isPaused = true"
            @mouseleave="slot.isPaused = false"
          >
            <div class="danmaku-text-preview" @click="emit('focus-subq', slot.item.subQId)">
              {{ slot.item.message }}
            </div>

            <!-- 悬停详情卡片 -->
            <div class="danmaku-hover-card" @click.stop>
              <div class="hover-card-header">
                <span class="hover-tag">{{ slot.item.qnum }}</span>
                <span class="hover-author">{{ slot.item.author }}</span>
                <span class="hover-time">{{ slot.item.time }}</span>
              </div>
              <div class="hover-card-content">
                {{ slot.item.message }}
              </div>
              <div class="hover-card-footer">
                <button 
                  class="hover-like-btn" 
                  :class="{ 'is-liked': slot.item.liked }"
                  @click="emit('toggle-like', slot.item)"
                >
                  <span class="like-heart">{{ slot.item.liked ? '❤️' : '🤍' }}</span>
                  <span class="like-num">{{ slot.item.likes || 0 }}</span>
                </button>
                <button class="hover-locate-btn" @click="emit('focus-subq', slot.item.subQId)">
                  {{ locale === 'zh' ? '定位小题' : 'Go to Part' }} &rarr;
                </button>
              </div>
            </div>
          </div>
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
          <div 
            class="danmaku-capsule"
            @mouseenter="slot.isPaused = true"
            @mouseleave="slot.isPaused = false"
          >
            <div class="danmaku-text-preview" @click="emit('focus-subq', slot.item.subQId)">
              {{ slot.item.message }}
            </div>

            <!-- 悬停详情卡片 -->
            <div class="danmaku-hover-card" @click.stop>
              <div class="hover-card-header">
                <span class="hover-tag">{{ slot.item.qnum }}</span>
                <span class="hover-author">{{ slot.item.author }}</span>
                <span class="hover-time">{{ slot.item.time }}</span>
              </div>
              <div class="hover-card-content">
                {{ slot.item.message }}
              </div>
              <div class="hover-card-footer">
                <button 
                  class="hover-like-btn" 
                  :class="{ 'is-liked': slot.item.liked }"
                  @click="emit('toggle-like', slot.item)"
                >
                  <span class="like-heart">{{ slot.item.liked ? '❤️' : '🤍' }}</span>
                  <span class="like-num">{{ slot.item.likes || 0 }}</span>
                </button>
                <button class="hover-locate-btn" @click="emit('focus-subq', slot.item.subQId)">
                  {{ locale === 'zh' ? '定位小题' : 'Go to Part' }} &rarr;
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
  box-shadow: var(--shadow-md);
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
  gap: 8px;
  margin-bottom: 6px;
}

.hover-tag {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  font-size: 0.72rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
}

.hover-author {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text-main);
}

.hover-time {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.hover-card-content {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
  word-break: break-word;
}

.hover-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-subtle);
  padding-top: 6px;
}

.hover-like-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface-subtle);
  color: var(--text-secondary);
  font-size: 0.72rem;
  cursor: pointer;
}

.hover-like-btn.is-liked {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.hover-locate-btn {
  font-size: 0.72rem;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
}

.hover-locate-btn:hover {
  color: var(--accent-primary);
}

@media (max-width: 1200px) {
  .danmaku-portal-stage {
    display: none;
  }
}
</style>

