<script setup>
import HomeDanmakuStage from '~/components/home/HomeDanmakuStage.vue'
import HomeCommentModal from '~/components/home/HomeCommentModal.vue'

const { t, locale } = useI18n()
const isCommentModalOpen = ref(false)
const latestPostedMessage = ref(null)

function onMessagePosted(msg) {
  latestPostedMessage.value = msg
}

// 1. CAIE (剑桥体系)
const caieSubjects = [
  { id: 'CAIE-AL-9702', name: 'Cambridge International A Level Physics (9702)', level: 'A Level', board: 'CAIE', icon: '⚛️', color: 'coral' },
  { id: 'CAIE-IG-0625', name: 'Cambridge IGCSE Physics (0625)', level: 'IGCSE', board: 'CAIE', icon: '🔭', color: 'amber' },
]

// 2. EDX (爱德思体系)
const edxSubjects = [
  { id: 'EDX-IAL', name: 'Edexcel International A Level Physics', level: 'IAL', board: 'Edexcel', icon: '🔬', color: 'coral' },
  { id: 'EDX-IG', name: 'Edexcel International GCSE Physics', level: 'IGCSE', board: 'Edexcel', icon: '🚀', color: 'amber' },
  { id: 'EDX-本土AL', name: 'Edexcel UK A Level Physics', level: 'UK A Level', board: 'Edexcel UK', icon: '🎯', color: 'purple' },
  { id: 'EDX-本土GCSE', name: 'Edexcel UK GCSE Physics', level: 'UK GCSE', board: 'Edexcel UK', icon: '📡', color: 'slate' },
]

// 3. AQA (牛津国际与英国本土 AQA 体系)
const aqaSubjects = [
  { id: 'AQA-IAL-9630', name: 'OxfordAQA International A Level Physics (9630)', level: 'IAL', board: 'OxfordAQA', icon: '⚡', color: 'teal' },
  { id: 'AQA-本土AL', name: 'AQA UK A Level Physics (7408)', level: 'UK A Level', board: 'AQA UK', icon: '💡', color: 'slate' },
  { id: 'AQA-本土GCSE', name: 'AQA UK GCSE Physics (8463)', level: 'UK GCSE', board: 'AQA UK', icon: '🧲', color: 'sage' },
]

// 4. 竞赛与附加考试 (Physics Olympiad & Admissions Tests)
const olympiadSubjects = [
  { id: 'BPhO-R1', name: 'British Physics Olympiad Round 1 (BPhO R1)', level: 'Olympiad', board: 'BPhO', icon: '🏆', color: 'purple' },
  { id: 'BPhO-R2', name: 'British Physics Olympiad Round 2 (BPhO R2)', level: 'Olympiad', board: 'BPhO', icon: '🥇', color: 'purple' },
  { id: 'BAAO-R1', name: 'British Astronomy & Astrophysics Olympiad R1', level: 'Olympiad', board: 'BAAO', icon: '🪐', color: 'teal' },
  { id: 'BAAO-R2', name: 'British Astronomy & Astrophysics Olympiad R2', level: 'Olympiad', board: 'BAAO', icon: '🌟', color: 'teal' },
  { id: 'PhysicsBowl', name: 'AAPT PhysicsBowl Competition', level: 'Competition', board: 'AAPT', icon: '🎳', color: 'coral' },
  { id: 'PAT', name: 'Oxford Physics Aptitude Test (PAT)', level: 'Admissions', board: 'Oxford', icon: '🎓', color: 'slate' },
  { id: 'SPC', name: 'Senior Physics Challenge (SPC)', level: 'Competition', board: 'BPhO', icon: '🎯', color: 'amber' },
  { id: 'ESAT', name: 'Cambridge ESAT (ENGAA / NSAA Admissions)', level: 'Admissions', board: 'Cambridge', icon: '🧪', color: 'sage' },
]

const sections = computed(() => [
  {
    key: 'caie',
    title: t('home.caieTitle'),
    subjects: caieSubjects,
  },
  {
    key: 'edx',
    title: t('home.edxTitle'),
    subjects: edxSubjects,
  },
  {
    key: 'aqa',
    title: t('home.aqaTitle'),
    subjects: aqaSubjects,
  },
  {
    key: 'olympiad',
    title: t('home.olympiadTitle'),
    subjects: olympiadSubjects,
  },
])

useSeoMeta({
  title: 'Physics Past Paper Repository - Real Exam Questions & Mark Schemes',
  description: 'Search, browse, and practice over 36,000+ real exam questions across Cambridge CAIE, Pearson Edexcel, AQA, and elite Physics Olympiad competitions.'
})
</script>

<template>
  <div class="home-container">
    <div class="hero">
      <h1 class="hero-title">{{ t('home.title') }}</h1>
      <p class="hero-subtitle">
        {{ t('home.subtitlePrefix') }}<strong>{{ t('home.subtitleQuestions') }}</strong>{{ t('home.subtitleSuffix') }}
      </p>

      <!-- 首页功能区：互动留言与发送弹幕入口 -->
      <div class="hero-actions">
        <button 
          type="button" 
          class="btn-hero-danmaku" 
          @click="isCommentModalOpen = true"
          :title="locale === 'zh' ? '在首页或题库发布弹幕留言' : 'Post community danmaku message'"
        >
          <span class="bhd-icon">💬</span>
          <span class="bhd-text">{{ locale === 'zh' ? '考友交流留言 · 实时弹幕上墙' : 'Community Board · Post Live Danmaku' }}</span>
          <span class="bhd-badge">{{ locale === 'zh' ? '发条弹幕' : 'Post' }} &rarr;</span>
        </button>
      </div>
    </div>

    <!-- 首页全景浮动弹幕舞台 (支持顶部栏全站开关控制) -->
    <HomeDanmakuStage :newlyPostedMessage="latestPostedMessage" />

    <!-- 留言弹幕弹窗 -->
    <HomeCommentModal 
      :isOpen="isCommentModalOpen" 
      @close="isCommentModalOpen = false" 
      @message-posted="onMessagePosted" 
    />

    <!-- Four Distinct Sections: CAIE -> EDX -> AQA -> Olympiad -->
    <div 
      v-for="(sec, idx) in sections" 
      :key="sec.key" 
      class="spec-section"
      :style="idx > 0 ? 'margin-top: 36px;' : ''"
    >
      <div class="section-header">
        <h2 class="section-title">{{ sec.title }}</h2>
      </div>

      <div class="subject-grid">
        <NuxtLink 
          v-for="sub in sec.subjects" 
          :key="sub.id" 
          :to="`/subject/${encodeURIComponent(sub.id)}`"
          class="subject-card"
        >
          <div class="card-top">
            <span class="board-badge">{{ sub.board }}</span>
            <span class="level-badge" :class="`badge-${sub.color}`">{{ sub.level }}</span>
          </div>

          <div class="card-main">
            <div class="card-icon">{{ sub.icon }}</div>
            <h3 class="subject-name">{{ sub.name }}</h3>
          </div>

          <div class="card-footer">
            <span class="open-link">{{ t('home.browseQuestions') }}</span>
            <span class="arrow-icon">&rarr;</span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}

.hero {
  text-align: center;
  margin-bottom: 32px;
}

.hero-title {
  font-family: var(--font-serif);
  font-size: 2.55rem;
  letter-spacing: -0.02em;
  color: var(--text-main);
  margin: 0 0 12px 0;
  font-weight: 700;
  line-height: 1.25;
}

.hero-subtitle {
  color: var(--text-muted);
  font-size: clamp(0.78rem, 1.35vw, 0.98rem);
  white-space: nowrap;
  max-width: 100%;
  margin: 0 auto;
  line-height: 1.5;
  letter-spacing: 0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-subtitle strong {
  color: var(--accent-primary);
  font-weight: 700;
}

.hero-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 18px;
}

.btn-hero-danmaku {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px 0 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(44, 47, 50, 0.05);
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
}

.btn-hero-danmaku:hover {
  transform: translateY(-1px);
  border-color: var(--accent-primary);
  box-shadow: 0 4px 14px rgba(194, 65, 40, 0.14);
}

.bhd-icon {
  font-size: 1.05rem;
  line-height: 1;
}

.bhd-text {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-main);
}

.bhd-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent-primary);
  background: var(--accent-primary-light);
  padding: 2px 8px;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.btn-hero-danmaku:hover .bhd-badge {
  background: var(--accent-primary);
  color: #ffffff;
}

.spec-section {
  margin-top: 10px;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  color: var(--text-main);
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.subject-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.subject-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 16px 16px 14px;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.subject-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-primary);
  box-shadow: 0 8px 20px rgba(184, 80, 56, 0.12);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.board-badge {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.level-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
}

.badge-coral {
  background: rgba(224, 90, 71, 0.12);
  color: #c94432;
}

.badge-amber {
  background: rgba(217, 131, 36, 0.12);
  color: #b06514;
}

.badge-teal {
  background: rgba(30, 138, 138, 0.12);
  color: #147070;
}

.badge-slate {
  background: rgba(90, 107, 124, 0.12);
  color: #435362;
}

.badge-purple {
  background: rgba(142, 68, 173, 0.12);
  color: #7d3c98;
}

.badge-sage {
  background: rgba(85, 139, 85, 0.12);
  color: #3b6e3b;
}

.card-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
  margin-bottom: 14px;
}

.card-icon {
  font-size: 1.45rem;
  line-height: 1;
  flex-shrink: 0;
}

.subject-name {
  font-size: 0.94rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
  line-height: 1.35;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px dashed var(--border-color);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  transition: color 0.15s ease;
}

.subject-card:hover .card-footer {
  color: var(--accent-primary);
}

.arrow-icon {
  transition: transform 0.2s ease;
}

.subject-card:hover .arrow-icon {
  transform: translateX(4px);
}

@media (max-width: 1080px) {
  .subject-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .home-container {
    padding: 32px 16px 48px;
  }
  .hero-title {
    font-size: 2rem;
  }
  .subject-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

@media (max-width: 500px) {
  .subject-grid {
    grid-template-columns: 1fr;
  }
}
</style>
