import { defineEventHandler, readBody, createError, getRequestIP } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { message, turnstileToken, userId, questionId, subQNumber } = body || {}

  // 1. 基础内容校验
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: '留言内容不能为空'
    })
  }

  const cleanMessage = message.trim()
  if (cleanMessage.length > 140) {
    throw createError({
      statusCode: 400,
      statusMessage: '留言内容请控制在 140 字以内'
    })
  }

  // 2. Cloudflare Turnstile 人机验证校验
  const config = useRuntimeConfig(event)
  const secretKey = config.turnstileSecretKey || process.env.NUXT_TURNSTILE_SECRET_KEY

  if (!turnstileToken) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少防人机验证凭证，请完成验证'
    })
  }

  try {
    const ip = getRequestIP(event, { xForwardedFor: true })
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', turnstileToken)
    if (ip) {
      formData.append('remoteip', ip)
    }

    const cfRes = await $fetch<any>('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!cfRes?.success) {
      console.warn('[Turnstile] Siteverify failed:', cfRes?.['error-codes'])
      throw createError({
        statusCode: 403,
        statusMessage: '人机验证未通过或已失效，请重新验证'
      })
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[Turnstile] Verification error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: '验证服务连接失败，请稍后重试'
    })
  }

  // 3. 校验通过，写入 Supabase comments 数据表
  try {
    const client = await serverSupabaseClient(event)
    const payload: any = {
      message: cleanMessage,
      user_id: userId || null
    }

    if (questionId) payload.question_id = questionId
    if (subQNumber) payload.sub_q_number = subQNumber

    const { data, error } = await client
      .from('comments')
      .insert(payload)
      .select('id, created_at, message, likes, user_id, question_id, sub_q_number, profiles(display_name, avatar_url)')
      .single()

    if (error) {
      console.error('[Comments API] Supabase insert error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: error.message || '写入留言数据失败'
      })
    }

    return {
      success: true,
      data
    }
  } catch (dbErr: any) {
    if (dbErr.statusCode) throw dbErr
    console.error('[Comments API] DB Error:', dbErr)
    throw createError({
      statusCode: 500,
      statusMessage: '保存评论失败，请重试'
    })
  }
})
