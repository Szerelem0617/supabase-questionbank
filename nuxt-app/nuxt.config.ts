// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  // 1. 启用模块
  modules: ['@nuxtjs/supabase'],

  // 2. Supabase 配置
  supabase: {
    // 自动重定向到登录页（我们暂时关掉，手动控制）
    redirect: false, 
    cookieOptions: {
      secure: false,
      sameSite: 'lax',
    }
  },

  // 3. 混合渲染策略 (Hybrid Rendering Strategy)
  routeRules: {
    // 首页：SSR (保证加载速度和SEO)
    '/': { ssr: true },
    
    // 知识点/科目页面：ISR (增量静态再生，缓存 1 天) -> SEO 核心
    '/topic/**': { swr: 86400 },
    '/paper/**': { swr: 86400 },
    
    // 交互页面：SPA (纯客户端渲染) -> 体验核心
    '/question/**': { ssr: false },
    '/user/**': { ssr: false },
  },

  // 4. 全局样式 (稍后我们会迁移 style.css)
  // css: ['./assets/css/main.css']
})