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
      role: 'system' | 'user' | 'assistant'
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
    }> = []

    // System prompt
    if (screenshot) {
      messages.push({
        role: 'system',
        content: isEditingMode
          ? 'You are a text editor that rewrites text based on instructions and visual context. Your response MUST contain ONLY the edited text with NO introductory phrases or explanations.'
          : 'You are a helpful text generation assistant that uses visual context to inform your responses. Your response MUST contain ONLY the generated text with NO introductory phrases or explanations.'
      })
    } else {
      messages.push({
        role: 'system',
        content: isEditingMode
          ? 'You are a text editor that rewrites text based on instructions. CRITICAL: Your response MUST contain ONLY the edited text with ABSOLUTELY NO introductory phrases, NO explanations, NO "Here is the rewritten text", NO comments about what you did, and NO concluding remarks. Do not start with "Here", "I", or any other introductory word. Just give the edited text directly. The user will only see your exact output, so it must be ready to use immediately.'
          : 'You are a helpful text generation assistant. CRITICAL: Your response MUST contain ONLY the generated text with ABSOLUTELY NO introductory phrases, NO explanations, NO "Here is the text", NO comments about what you did, and NO concluding remarks. Do not start with "Here", "I", or any other introductory word. Just give the generated text directly. The user will only see your exact output, so it must be ready to use immediately.'
      })
    }

    // User messages
    if (screenshot) {
      const contentArray: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        {
          type: 'text',
          text: isEditingMode
            ? `I will give you instructions followed by text to edit. The format will be "[INSTRUCTIONS]: [TEXT]". The screenshot shows what is on my screen for context. Only return the edited text with no additional comments or explanations. Here is my request: ${instructions}: ${selectedText}`
            : `I need you to generate text based on the following instructions. The screenshot shows what is on my screen for context. Only return the generated text with no additional comments or explanations. Here is my request: ${instructions}`
        },
        {
          type: 'image_url',
          image_url: { url: screenshot }
        }
      ]
      messages.push({ role: 'user', content: contentArray })
    } else {
      // Multi-message reinforcement pattern
      messages.push(
        {
          role: 'user',
          content: isEditingMode
            ? 'I will give you instructions followed by text to edit. The format will be "[INSTRUCTIONS]: [TEXT]". Only return the edited text with no additional comments or explanations. Do not start with "Here", "I", or any other introductory word or phrase.'
            : 'I will give you instructions for generating text. Only return the generated text with no additional comments or explanations. Do not start with "Here", "I", or any other introductory word or phrase.'
        },
        {
          role: 'assistant',
          content: isEditingMode
            ? 'I understand. I will only return the edited text with no additional comments or explanations.'
            : 'I understand. I will only return the generated text with no additional comments or explanations.'
        },
        {
          role: 'user',
          content: isEditingMode
            ? `IMPORTANT: Your response must start with the edited text directly. Do not include any preamble like "Here is" or "I have". ${instructions}: ${selectedText}`
            : `IMPORTANT: Your response must start with the generated text directly. Do not include any preamble like "Here is" or "I have". ${instructions}`
        }
      )
    }

    const selectedModel = model || 'llama3-70b-8192'

    const completion = await groq.chat.completions.create({
      model: selectedModel,
      messages: messages as any,
      temperature: 0.0,
      max_tokens: 2000
    })

    const responseText = completion.choices[0]?.message?.content || ''
    return responseText
  } catch (error) {
    console.error('Error processing assistant request:', error)
    throw error
  }
}

