<script setup>
const { t } = useI18n()
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
      <NuxtLink to="/" class="back-link">
        <span class="back-arrow">&larr;</span> {{ t('nav.allSpecs') }}
      </NuxtLink>
      <div class="title-row">
        <div class="subject-indicator"></div>
        <h1 class="title">{{ subjectId }}</h1>
      </div>
    </div>
    
    <QuestionGallery :subjectId="subjectId" />
  </div>
</template>

<style scoped>
.subject-container {
  max-width: 980px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.header {
  margin-bottom: 22px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.88rem;
  margin-bottom: 12px;
  transition: color 0.15s ease;
}

.back-link:hover {
  color: var(--accent-primary);
}

.back-arrow {
  transition: transform 0.15s ease;
}

.back-link:hover .back-arrow {
  transform: translateX(-3px);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.subject-indicator {
  width: 4px;
  height: 26px;
  background: var(--accent-primary);
  border-radius: 2px;
}

.title {
  font-family: var(--font-serif);
  margin: 0;
  font-size: 1.85rem;
  color: var(--text-main);
  font-weight: 700;
  letter-spacing: -0.01em;
}
</style>
