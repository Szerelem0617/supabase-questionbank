# Technical Strategy & SEO Architecture (Migration to Nuxt 3)

**Date:** 2025-11-29
**Objective:** Optimize for "Subject/Topic" search visibility while maintaining a responsive "App-like" experience for solving questions.

## 1. Core Philosophy: Aggregation-First SEO

We recognize that users search for **Topics** (e.g., "Logic Gates") and **Papers** (e.g., "9618 Summer 2022"), not specific Question IDs. Therefore, we prioritize server-side rendering for aggregation pages and keep interaction pages client-side.

## 2. Hybrid Rendering Strategy (Nuxt 3)

We utilize Nuxt's `routeRules` to apply different rendering modes based on the page type:

| Page Type | Route Pattern | Rendering Mode | Reason |
| :--- | :--- | :--- | :--- |
| **Home / Landing** | `/` | **SSR** (Server-Side Rendering) | Fast First Contentful Paint (FCP), always fresh. |
| **Subjects / Topics** | `/subject/**`<br>`/topic/**` | **ISR** (Incremental Static Regeneration)<br>*TTL: 24 hours* | **SEO Critical.** High content density. Low update frequency. Cache at Edge. |
| **Paper Index** | `/paper/**` | **ISR** or **SSG**<br>*TTL: Infinite/Long* | **SEO Secondary.** Papers never change once published. |
| **Question Detail** | `/question/**` | **SPA** (Client-Side / SSR: false) | **Interaction Focus.** Modal/Popup experience. Fast transitions. No SEO needed for individual IDs. |
| **User / Admin** | `/user/**` | **SPA** | Private content. No SEO required. |

## 3. Architecture Changes

### Data Fetching
- **Old (Vue):** `onMounted` + `supabase.from().select()` (Client-side only).
- **New (Nuxt Aggregation Pages):** `useAsyncData` + `useSupabaseClient()` (Server-side execution).
- **New (Interaction Pages):** Keep using client-side fetching for dynamic interactions (Ask AI, Comments).

### URL Structure
- Moving away from query params (`?id=...`) to path-based routing for SEO pages:
    - `p3-supabase.com/9618/topic/database`
    - `p3-supabase.com/9618/2022-summer/11`

## 4. Tech Stack
- **Framework:** Nuxt 3
- **Database:** Supabase (via `@nuxtjs/supabase` module)
- **UI:** Vue 3 (Composition API)
- **Hosting:** Vercel or Netlify (Compatible with ISR/Edge functions)

---
*This document serves as the architectural blueprint for the migration.*
