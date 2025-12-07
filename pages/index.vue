<script setup>
// 模拟从数据库获取科目列表
// 在实际开发中，这里会是: await client.from('subjects').select('*')
const { data: subjects } = await useAsyncData('subjects', async () => {
  return [
    { id: '9618', name: 'Computer Science (9618)', level: 'A Level' },
    { id: '9709', name: 'Mathematics (9709)', level: 'A Level' }
  ]
})

// SEO Meta
useSeoMeta({
  title: 'Past Paper Universe - A Level Resources',
  description: 'Access thousands of A Level past paper questions, categorized by topic and year.'
})
</script>

<template>
  <div class="container">
    <h1>Select a Subject</h1>
    <p class="subtitle">Choose a subject to browse topics and past papers.</p>

    <div class="subject-grid">
      <NuxtLink 
        v-for="sub in subjects" 
        :key="sub.id" 
        :to="`/subject/${sub.id}`"
        class="subject-card"
      >
        <div class="card-header">
          <span class="badge">{{ sub.level }}</span>
          <h2>{{ sub.id }}</h2>
        </div>
        <div class="card-body">
          <h3>{{ sub.name }}</h3>
          <p>Browse Topics & Papers &rarr;</p>
        </div>
      </NuxtLink>
    </div>
    
    <!-- Temporary Link to old functionality -->
    <div style="margin-top: 50px; padding: 20px; border: 1px dashed #ccc;">
      <h3>🚧 Migration Zone</h3>
      <p>This is the new Nuxt home. The original gallery logic will be migrated to specific topic pages.</p>
    </div>
  </div>
</template>

<style scoped>
.subtitle {
  color: #666;
  margin-bottom: 30px;
}

.subject-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.subject-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  display: block;
  color: inherit;
}

.subject-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.card-header {
  background: #f8f9fa;
  padding: 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.badge {
  background: #3e635f;
  color: white;
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 4px;
}

.card-body {
  padding: 20px;
}
.card-body h3 {
  margin-top: 0;
  font-size: 1rem;
  color: #444;
}
.card-body p {
  margin-bottom: 0;
  color: #888;
  font-size: 0.9rem;
}
</style>
