<script setup>
const route = useRoute()
const subjectId = route.params.id

// SEO Meta
useSeoMeta({
  title: () => `Past Papers for Subject ${subjectId}`,
  description: () => `Browse and practice real exam questions for ${subjectId}.`
})
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Subject: {{ subjectId }}</h1>
      <NuxtLink to="/" class="back-link">&larr; Back to Subjects</NuxtLink>
    </div>
    
    <QuestionGallery :subjectId="subjectId" />
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}
.back-link {
  color: #666;
  text-decoration: none;
}
.back-link:hover {
  text-decoration: underline;
}
</style>
