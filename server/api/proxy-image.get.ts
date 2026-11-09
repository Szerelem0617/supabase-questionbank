import { defineEventHandler, getQuery, setResponseHeader, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const imagePath = query.path as string

  if (!imagePath) {
    throw createError({ statusCode: 400, statusMessage: 'Path query param is required' })
  }

  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
  const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('/')

  const config = useRuntimeConfig()
  const cdnBase = config.public.cdnBaseUrl || 'https://assets.66367749.xyz'
  const fallbackBase = config.public.r2DevUrl || 'https://pub-b20547c0488b456f8b6c033d9a7a1ca1.r2.dev'

  const urls = [
    `${cdnBase}/${encodedPath}`,
    `${fallbackBase}/${encodedPath}`
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'image/png'
        setResponseHeader(event, 'Content-Type', contentType)
        setResponseHeader(event, 'Cache-Control', 'public, max-age=86400, immutable')
        setResponseHeader(event, 'Access-Control-Allow-Origin', '*')
        const arrayBuffer = await res.arrayBuffer()
        return Buffer.from(arrayBuffer)
      }
    } catch (e) {
      console.warn(`[proxy-image] Failed to fetch from ${url}:`, e)
    }
  }

  throw createError({ statusCode: 404, statusMessage: 'Image not found' })
})

