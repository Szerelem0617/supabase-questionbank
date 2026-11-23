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
          <div 
            class="danmaku-capsule"
            :class="{ 'is-liked': slot.item.liked }"
            @mouseenter="slot.isPaused = true"
            @mouseleave="slot.isPaused = false"
            @click.stop="emit('toggle-like', slot.item)"
            :title="slot.item.liked ? (locale === 'zh' ? '点击取消点赞' : 'Click to unlike') : (locale === 'zh' ? '点击直接点赞' : 'Click to like')"
          >
            <!-- 胶囊样式：包含弹幕文本与悬停时无需移动鼠标即可直点的点赞按钮 -->
            <div class="danmaku-text-preview">
              <span class="preview-text">{{ slot.item.message }}</span>
              <button 
                type="button" 
                class="capsule-like-btn" 
                :class="{ 'is-liked': slot.item.liked }"
                @click.stop="emit('toggle-like', slot.item)"
                :title="slot.item.liked ? (locale === 'zh' ? '取消点赞' : 'Unlike') : (locale === 'zh' ? '点赞' : 'Like')"
              >
                <span class="like-heart">{{ slot.item.liked ? '❤️' : '🤍' }}</span>
                <span class="like-num">{{ slot.item.likes || 0 }}</span>
              </button>
            </div>

            <!-- 悬停详情卡片 -->
            <div class="danmaku-hover-card" @click.stop>
              <div class="hover-card-header">
                <div class="hover-author-wrap">
                  <img 
                    v-if="slot.item.avatarUrl" 
                    :src="slot.item.avatarUrl" 
                    class="hover-avatar" 
                    alt="Avatar"
                  />
                  <span class="hover-tag">{{ slot.item.avatarUrl ? '' : '💬 ' }}{{ slot.item.author || (locale === 'zh' ? '考友' : 'Student') }}</span>
                </div>
                <span v-if="slot.item.qnum" class="hover-qnum-tag">{{ slot.item.qnum }}</span>
                <span class="hover-time">{{ slot.item.time }}</span>
              </div>
              <div class="hover-card-content">
                {{ slot.item.message }}
              </div>
              <div class="hover-card-footer">
                <button 
                  type="button"
                  class="hover-like-btn" 
                  :class="{ 'is-liked': slot.item.liked }"
                  @click.stop="emit('toggle-like', slot.item)"
                  :title="slot.item.liked ? (locale === 'zh' ? '已点赞' : 'Liked') : (locale === 'zh' ? '赞同' : 'Like')"
                >
                  <span class="like-heart">{{ slot.item.liked ? '❤️' : '🤍' }}</span>
                  <span class="like-num">{{ slot.item.likes || 0 }}</span>
                </button>
                <button 
                  v-if="slot.item.subQId"
                  type="button" 
                  class="hover-locate-btn" 
                  @click.stop="emit('focus-subq', slot.item.subQId)"
                >
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
            :class="{ 'is-liked': slot.item.liked }"
            @mouseenter="slot.isPaused = true"
            @mouseleave="slot.isPaused = false"
            @click.stop="emit('toggle-like', slot.item)"
            :title="slot.item.liked ? (locale === 'zh' ? '点击取消点赞' : 'Click to unlike') : (locale === 'zh' ? '点击直接点赞' : 'Click to like')"
          >
            <!-- 胶囊样式：包含弹幕文本与悬停时无需移动鼠标即可直点的点赞按钮 -->
            <div class="danmaku-text-preview">
              <span class="preview-text">{{ slot.item.message }}</span>
              <button 
                type="button" 
                class="capsule-like-btn" 
                :class="{ 'is-liked': slot.item.liked }"
                @click.stop="emit('toggle-like', slot.item)"
                :title="slot.item.liked ? (locale === 'zh' ? '取消点赞' : 'Unlike') : (locale === 'zh' ? '点赞' : 'Like')"
              >
                <span class="like-heart">{{ slot.item.liked ? '❤️' : '🤍' }}</span>
                <span class="like-num">{{ slot.item.likes || 0 }}</span>
              </button>
            </div>

            <!-- 悬停详情卡片 -->
            <div class="danmaku-hover-card" @click.stop>
              <div class="hover-card-header">
                <div class="hover-author-wrap">
                  <img 
                    v-if="slot.item.avatarUrl" 
                    :src="slot.item.avatarUrl" 
                    class="hover-avatar" 
                    alt="Avatar"
                  />
                  <span class="hover-tag">{{ slot.item.avatarUrl ? '' : '💬 ' }}{{ slot.item.author || (locale === 'zh' ? '考友' : 'Student') }}</span>
                </div>
                <span v-if="slot.item.qnum" class="hover-qnum-tag">{{ slot.item.qnum }}</span>
                <span class="hover-time">{{ slot.item.time }}</span>
              </div>
              <div class="hover-card-content">
                {{ slot.item.message }}
              </div>
              <div class="hover-card-footer">
                <button 
                  type="button"
                  class="hover-like-btn" 
                  :class="{ 'is-liked': slot.item.liked }"
                  @click.stop="emit('toggle-like', slot.item)"
                  :title="slot.item.liked ? (locale === 'zh' ? '已点赞' : 'Liked') : (locale === 'zh' ? '赞同' : 'Like')"
                >
                  <span class="like-heart">{{ slot.item.liked ? '❤️' : '🤍' }}</span>
                  <span class="like-num">{{ slot.item.likes || 0 }}</span>
                </button>
                <button 
                  v-if="slot.item.subQId"
                  type="button" 
                  class="hover-locate-btn" 
                  @click.stop="emit('focus-subq', slot.item.subQId)"
                >
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
  background: #fff;
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  box-shadow: 0 4px 14px rgba(255, 95, 64, 0.18);
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
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
}

.hover-qnum-tag {
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
}

.hover-time {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-left: auto;
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

