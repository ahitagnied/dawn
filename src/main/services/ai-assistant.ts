import Groq from 'groq-sdk'

interface ProcessAssistantRequestOptions {
  instructions: string
  selectedText?: string | null
  screenshot?: string | null
  model?: string
  apiKey?: string
}

export async function processAssistantRequest({
  instructions,
  selectedText,
  screenshot,
  model,
  apiKey
}: ProcessAssistantRequestOptions): Promise<string> {
  try {
    const groq = new Groq({ apiKey })

    const isEditingMode = selectedText != null && selectedText.length > 0

    const messages: Array<{
      role: 'system' | 'user'
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
    }> = [
      {
        role: 'system',
        content: isEditingMode
          ? 'You are a text editor that rewrites text based on instructions. Output ONLY the edited text with no preambles or explanations.'
          : 'You are a helpful text generation assistant.'
      }
    ]

    if (screenshot) {
      const contentArray: Array<{ type: string; text?: string; image_url?: { url: string } }> = []

      contentArray.push({
        type: 'image_url',
        image_url: {
          url: screenshot
        }
      })

      if (isEditingMode) {
        contentArray.push({
          type: 'text',
          text: `Original text: ${selectedText}\n\nInstructions: ${instructions}`
        })
      } else {
        contentArray.push({
          type: 'text',
          text: instructions
        })
      }

      messages.push({
        role: 'user',
        content: contentArray
      })
    } else {
      if (isEditingMode) {
        messages.push({
          role: 'user',
          content: `Original text: ${selectedText}\n\nInstructions: ${instructions}`
        })
      } else {
        messages.push({
          role: 'user',
          content: instructions
        })
      }
    }

    const selectedModel = model || 'meta-llama/llama-4-maverick-17b-128e-instruct'

    const completion = await groq.chat.completions.create({
      model: selectedModel,
      messages: messages as any,
      temperature: 0
    })

    const responseText = completion.choices[0]?.message?.content || ''
    return responseText
  } catch (error) {
    console.error('Error processing assistant request:', error)
    throw error
  }
}

