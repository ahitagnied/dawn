import Groq from 'groq-sdk'

export async function enhanceTranscription(text: string, screenshot?: string, apiKey?: string): Promise<string> {
  try {
    const groq = new Groq({ apiKey })

    const messages: Array<{
      role: 'system' | 'user'
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
    }> = [
      {
        role: 'system',
        content: `You are a transcription enhancer. Your job is to:

            1. Convert emoji requests to actual emojis:
              - "happy emoji" or "happy face emoji" → 😊
              - "sad emoji" or "sad face emoji" → 😢
              - "thumbs up emoji" → 👍
              - "fire emoji" → 🔥
              - "heart emoji" → ❤️
              - etc.

            2. Fix basic formatting (punctuation, capitalization)

            3. If a screenshot is provided, detect the context (email, code, chat) and format appropriately

            Return ONLY the enhanced text with no extra commentary or explanations.`
      }
    ]

    if (screenshot) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: screenshot
            }
          },
          {
            type: 'text',
            text: text
          }
        ]
      })
    } else {
      messages.push({
        role: 'user',
        content: text
      })
    }

    const model = screenshot ? 'llama-3.2-11b-vision-preview' : 'llama-3.1-8b-instant'

    const completion = await groq.chat.completions.create({
      model,
      messages: messages as any
    })

    const enhancedText = completion.choices[0]?.message?.content || text
    return enhancedText
  } catch (error) {
    console.error('Error enhancing transcription:', error)
    return text
  }
}

