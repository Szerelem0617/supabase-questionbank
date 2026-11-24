<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  showDot: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['like', 'toggle-like', 'focus-subq'])
const { locale } = useI18n()

function onLike() {
  emit('like', props.item)
  emit('toggle-like', props.item)
}

function onLocateSubQ() {
  if (props.item.subQId) {
    emit('focus-subq', props.item.subQId)
  }
}
</script>

<template>
  <div 
    class="danmaku-capsule"
    :class="{ 'is-liked': item.liked }"
    @click.stop="onLike"
    :title="item.liked ? (locale === 'zh' ? '点击取消点赞' : 'Click to unlike') : (locale === 'zh' ? '点击直接点赞' : 'Click to like')"
  >
    <!-- 胶囊样式：包含弹幕文本与悬停时无需移动鼠标即可直点的点赞按钮 -->
    <div class="danmaku-text-preview">
      <span v-if="showDot" class="preview-dot" aria-hidden="true"></span>
      <span class="preview-text">{{ item.message }}</span>
      <button 
        type="button" 
        class="capsule-like-btn" 
        :class="{ 'is-liked': item.liked }"
        @click.stop="onLike"
        :title="item.liked ? (locale === 'zh' ? '取消点赞' : 'Unlike') : (locale === 'zh' ? '点赞' : 'Like')"
      >
        <span class="like-heart">{{ item.liked ? '❤️' : '🤍' }}</span>
        <span class="like-num">{{ item.likes || 0 }}</span>
      </button>
    </div>

    <!-- 悬停详情卡片：展示留言者、头像、时间与完整内容 -->
    <div class="danmaku-hover-card" @click.stop>
      <div class="hover-card-header">
        <div class="hover-author-wrap">
          <img 
            v-if="item.avatarUrl" 
            :src="item.avatarUrl" 
            class="hover-avatar" 
            alt="Avatar"
          />
          <span class="hover-tag">{{ item.avatarUrl ? '' : '💬 ' }}{{ item.author || (locale === 'zh' ? '考友' : 'Student') }}</span>
        </div>
        <span v-if="item.qnum" class="hover-qnum-tag">{{ item.qnum }}</span>
        <span class="hover-time">{{ item.time || (locale === 'zh' ? '刚刚' : 'Just now') }}</span>
      </div>
      <div class="hover-card-content">
        {{ item.message }}
      </div>
      <div class="hover-card-footer">
        <button 
          type="button"
          class="hover-like-btn" 
          :class="{ 'is-liked': item.liked }"
          @click.stop="onLike"
          :title="item.liked ? (locale === 'zh' ? '已点赞' : 'Liked') : (locale === 'zh' ? '赞同' : 'Like')"
        >
          <span class="like-heart">{{ item.liked ? '❤️' : '🤍' }}</span>
          <span class="like-num">{{ item.likes || 0 }}</span>
        </button>
        <button 
          v-if="item.subQId"
          type="button" 
          class="hover-locate-btn" 
          @click.stop="onLocateSubQ"
        >
          {{ locale === 'zh' ? '定位小题' : 'Go to Part' }} &rarr;
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.preview-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-primary);
  flex-shrink: 0;
}

.preview-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 170px;
}

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
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.hover-qnum-tag {
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 600;
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
  gap: 8px;
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

.hover-locate-btn {
  font-size: 0.72rem;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  transition: color 0.15s ease;
}

.hover-locate-btn:hover {
  color: var(--accent-primary);
}
</style>
