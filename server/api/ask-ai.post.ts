import { defineEventHandler, readBody, setResponseHeader, sendStream } from 'h3'
import { PassThrough } from 'stream'

export default defineEventHandler(async (event) => {
  // 1. Setup Response Headers for SSE/Streaming
  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')
  setResponseHeader(event, 'Content-Encoding', 'none')

  try {
    const { questionText, userPrompt, imageBase64, mimeType } = await readBody(event)

    // 2. API Key Check - Try multiple sources
    // In Nuxt, useRuntimeConfig() is preferred, but process.env is usually polyfilled
    const apiKey = process.env.google_ai_studio || 
                   process.env.GOOGLE_AI_STUDIO || 
                   process.env.GEMINI_API_KEY || 
                   process.env.GOOGLE_API_KEY

    // If you are using runtimeConfig in nuxt.config.ts, access it here:
    // const config = useRuntimeConfig()
    // const apiKey = config.geminiApiKey || ...

    if (!apiKey) {
      console.error('SERVER ERROR: Missing API Key')
      return { error: 'Missing Google AI API Key on Server' }
    }

    // 3. Construct Prompt
    let fullText = `你是一个乐于助人的AI助手。
请根据提供的上下文信息（如果有）、用户的问题或上传的图片进行回答。请用中文回答。

`
    if (questionText) fullText += `相关题目/背景文本（供参考）：\n${questionText}\n\n`
    if (userPrompt) fullText += `用户的问题：\n${userPrompt}`
    else if (imageBase64) fullText += `任务：\n请详细描述并分析这张图片的内容。`
    else fullText += `任务：\n请简要概括核心考点（Key Concepts）和内容摘要。`

    const parts: any[] = [{ text: fullText }]
    if (imageBase64) {
        parts.push({
            inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 }
        })
    }

    // 4. Call Gemini API
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-pro']
    
    // Create a PassThrough stream
    const stream = new PassThrough()

    // Start background processing
    ;(async () => {
        let success = false
        for (const model of models) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: parts }] })
                })

                if (response.ok && response.body) {
                    // Send a start signal
                    stream.write(":::START:::\n")

                    const reader = response.body.getReader()
                    const decoder = new TextDecoder()
                    let buffer = ''

                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

                        buffer += decoder.decode(value, { stream: true })
                        const lines = buffer.split('\n')
                        buffer = lines.pop() || ''

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const jsonStr = line.substring(6).trim()
                                if (jsonStr === '[DONE]') continue
                                try {
                                    const data = JSON.parse(jsonStr)
                                    const candidate = data.candidates?.[0]
                                    if (candidate?.content?.parts?.[0]?.text) {
                                        const aiText = candidate.content.parts[0].text
                                        stream.write(aiText)
                                    }
                                } catch (e) {
                                    // ignore
                                }
                            }
                        }
                    }
                    success = true
                    break // Exit loop on success
                } else {
                    const err = await response.text()
                    console.warn(`Model ${model} failed: ${err}`)
                }
            } catch (e) {
                console.error(`Error with ${model}:`, e)
            }
        }
        
        if (!success) {
            stream.write(JSON.stringify({ error: "All models failed to generate content." }))
        }
        
        stream.end()
    })().catch(err => {
        console.error('Stream processing error:', err)
        stream.write(JSON.stringify({ error: `Internal Server Error: ${err.message}` }))
        stream.end()
    })

    return sendStream(event, stream)

  } catch (error) {
    console.error('API Handler Error:', error)
    // If headers sent, we can't really change status code easily, but we can try
    return { error: `Server Handler Error: ${error.message}` }
  }
})