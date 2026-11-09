// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: {
        lang: 'zh-CN',
      },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..600&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap'
        }
      ]
    }
  },

  runtimeConfig: {
    public: {
      cdnBaseUrl: process.env.NUXT_PUBLIC_CDN_BASE_URL || 'https://assets.66367749.xyz',
      r2DevUrl: process.env.NUXT_PUBLIC_R2_DEV_URL || 'https://pub-b20547c0488b456f8b6c033d9a7a1ca1.r2.dev'
    }
  },

  // 1. 启用模块
  modules: ['@nuxtjs/supabase'],

  // 2. Supabase 配置
  supabase: {
    redirect: false, 
    cookieOptions: {
      secure: false,
      sameSite: 'lax',
    }
  },

  // 3. Nitro 云端预设 (适配 Cloudflare Pages 边缘服务与全功能 SSR)
  nitro: {
    preset: 'cloudflare-pages',
    prerender: {
      autoSubfolderIndex: false
    }
  },

  // 4. 混合渲染策略 (Hybrid Rendering Strategy)
  routeRules: {
    '/': { ssr: true },
    '/topic/**': { swr: 86400 },
    '/paper/**': { swr: 86400 },
    '/question/**': { ssr: false },
    '/user/**': { ssr: false },
  },

  // 4. 全局 Wind 书卷纸质样式
  css: ['~/assets/css/main.css']
})
