<script setup>
const subjects = [
  { id: 'CAIE-AL-9702', name: 'Cambridge A Level Physics (9702)', level: 'A Level', board: 'CAIE', icon: '⚛️' },
  { id: 'CAIE-IG-0625', name: 'Cambridge IGCSE Physics (0625)', level: 'IGCSE', board: 'CAIE', icon: '🔭' },
  { id: 'AQA-IAL-9630', name: 'OxfordAQA IAL Physics (9630)', level: 'IAL', board: 'OxfordAQA', icon: '⚡' },
  { id: 'AQA-本土AL', name: 'AQA UK A Level Physics (7408)', level: 'UK A Level', board: 'AQA UK', icon: '💡' },
  { id: 'AQA-本土GCSE', name: 'AQA UK GCSE Physics (8463)', level: 'UK GCSE', board: 'AQA UK', icon: '🧲' },
  { id: 'EDX-IAL', name: 'Edexcel International A Level Physics', level: 'IAL', board: 'Edexcel', icon: '🔬' },
  { id: 'EDX-IG', name: 'Edexcel International GCSE Physics', level: 'IGCSE', board: 'Edexcel', icon: '🚀' },
  { id: 'EDX-本土AL', name: 'Edexcel UK A Level Physics', level: 'UK A Level', board: 'Edexcel UK', icon: '🎯' },
  { id: 'EDX-本土GCSE', name: 'Edexcel UK GCSE Physics', level: 'UK GCSE', board: 'Edexcel UK', icon: '📡' },
]

useSeoMeta({
  title: 'Physics Question Bank - Real Exam Papers & Mark Schemes',
  description: 'Access over 30,000+ real exam questions across Cambridge, OxfordAQA, and Edexcel past papers with instant Mark Schemes and Cloudflare CDN fast loading.'
})
</script>

<template>
  <div class="container">
    <div class="hero">
      <div class="badge-tag">⚡ Powered by Cloudflare R2 & Supabase</div>
      <h1>Physics Exam Question Bank</h1>
      <p class="subtitle">
        Over <strong>30,000+</strong> categorized past paper questions & mark schemes across 9 major physics exam specifications.
      </p>
    </div>

    <div class="subject-grid">
      <NuxtLink 
        v-for="sub in subjects" 
        :key="sub.id" 
        :to="`/subject/${encodeURIComponent(sub.id)}`"
        class="subject-card"
      >
        <div class="card-header">
          <span class="badge">{{ sub.level }}</span>
          <span class="board-tag">{{ sub.board }}</span>
        </div>
        <div class="card-body">
          <div class="card-icon">{{ sub.icon }}</div>
          <h3>{{ sub.name }}</h3>
          <p class="action-text">Browse & Practice Questions &rarr;</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.hero {
  text-align: center;
  margin-bottom: 40px;
}

.badge-tag {
  display: inline-block;
  padding: 6px 14px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.hero h1 {
  font-size: 2.4rem;
  color: #1a2a26;
  margin-bottom: 12px;
  font-weight: 800;
}

.subtitle {
  color: #555;
  font-size: 1.1rem;
  max-width: 700px;
  margin: 0 auto;
}

.subject-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.subject-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  display: block;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.subject-card:hover {
  transform: translateY(-4px);
  border-color: #3e635f;
  box-shadow: 0 12px 24px -4px rgba(62, 99, 95, 0.15);
}

.card-header {
  background: #f8fafc;
  padding: 14px 18px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge {
  background: #3e635f;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
}

.board-tag {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
}

.card-body {
  padding: 22px 20px;
}

.card-icon {
  font-size: 2rem;
  margin-bottom: 12px;
}

.card-body h3 {
  margin: 0 0 10px 0;
  font-size: 1.15rem;
  color: #1e293b;
  font-weight: 700;
  line-height: 1.4;
}

.action-text {
  margin: 0;
  color: #3e635f;
  font-weight: 600;
  font-size: 0.9rem;
}
</style>
