<script setup>
const route = useRoute()
const subjectId = ref(decodeURIComponent(route.params.id || ''))

useSeoMeta({
  title: () => `${subjectId.value} - Physics Questions & Mark Schemes`,
  description: () => `Practice past paper physics questions and mark schemes for ${subjectId.value}.`
})
</script>

<template>
  <div class="subject-container">
    <div class="header">
      <NuxtLink to="/" class="back-link">&larr; All Exam Series</NuxtLink>
      <h1 class="title">{{ subjectId }}</h1>
    </div>
    
    <QuestionGallery :subjectId="subjectId" />
  </div>
</template>

<style scoped>
.subject-container {
  max-width: 1300px;
  margin: 0 auto;
  padding: 24px 20px;
}

.header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.back-link {
  display: inline-block;
  margin-bottom: 8px;
  color: #3e635f;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  transition: color 0.15s;
}

.back-link:hover {
  color: #243d3a;
  text-decoration: underline;
}

.title {
  margin: 0;
  font-size: 1.8rem;
  color: #0f172a;
  font-weight: 800;
}
</style>
