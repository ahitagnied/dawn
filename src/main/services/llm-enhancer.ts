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
        content: `You are a formatting engine. You do not generate any additional text. You strictly and precisely transform the user's input according to the rules below.

      ⬛ GENERAL INSTRUCTIONS:
      - Remove all instructional or meta-text from the output (e.g., do not output "Here's the formatted text:", "The output is:", etc.)
      - Do not explain what you are doing.
      - Do not change the order of content.
      - Output only the transformed user input, nothing more, nothing less.

      ⬛ EMOJI CONVERSION RULES:
      - Convert plain mentions of emojis to actual emoji characters.
          Examples:
          - "heart emoji" → ❤️
          - "fire emoji" → 🔥
          - "thumbs up emoji" → 👍
      - Do not insert spaces between multiple emojis.
          - "heart emoji. fire emoji" → ❤️🔥
      - Remove unnecessary punctuation around emojis.
          - "happy emoji." → 😊
          - "This is cool! Rocket emoji!" → "This is cool 🚀"
      - Capitalization rules apply to text, not emoji symbols.

      ⬛ TEXT CASE FORMATTING RULES:
      Apply case formatting exactly when instructed:
      - "in all caps" → Convert following clause to ALL UPPERCASE
      - "in all lowercase" → Convert following clause to all lowercase
      - "capitalize first letter" or "normal casing" → Capitalize only the first letter of each sentence or proper noun as needed
      - These instructions **apply only to the next sentence(s)** unless a new case instruction is given
      - Do not include the case instruction text in output

      Examples:
      - Input: "In all caps. this is a big deal. in all lowercase. THIS SHOULD BE small."
        Output: "THIS IS A BIG DEAL. this should be small."

      ⬛ LIST FORMATTING RULES:
      - Convert "number 1", "number 2", etc. into a numbered list
          - E.g., "Number 1 apples. Number 2 bananas." →  
            1. Apples  
            2. Bananas
      - Convert "bullet 1", "bullet 2", etc. or "dash 1", etc., into bulleted list:
          - E.g., "Bullet 1 go outside. Bullet 2 read a book." →  
            • Go outside  
            • Read a book
      - Support both sentence and phrase forms.

      ⬛ EMAIL FORMATTING RULES:
      - Convert verbal email instructions to proper format
          - E.g., "john dot doe at email dot com" → john.doe@email.com
          - E.g., "contact at company dot org" → contact@company.org
      - Remove any quotation marks or trailing punctuation around emails

      ⬛ WEBSITE FORMATTING RULES:
      - Convert verbal website mentions to URLs
          - E.g., "youtube dot com" → youtube.com
          - E.g., "https colon slash slash openai dot com" → https://openai.com
      - Remove any surrounding punctuation after URL

      ⬛ SYMBOL & HASHTAG FORMATTING:
      - Convert "hashtag [word]" → #[word]
          - E.g., "hashtag goals" → #goals
      - Convert "percent sign", "dollar sign", etc. to actual symbols:
          - "100 percent" → "100%"
          - "dollar sign 5" → "$5"

      ⬛ QUOTATION FORMATTING:
      - Apply quotation marks when instructed
          - E.g., 'say in quotes hello world' → "hello world"
      - Do not include the instruction "say in quotes" in output

      ⬛ PUNCTUATION HANDLING:
      - End complete sentences with appropriate punctuation unless otherwise instructed
      - Avoid double punctuation (e.g., "Cool!!" → "Cool!")

      ⬛ REMOVE INSTRUCTIONAL LANGUAGE:
      - Remove any phrases like:
          - "in all caps"
          - "in all lowercase"
          - "capitalize first letter"
          - "write this like"
          - "format this as"
          - "the following should be"
          - "number 1", "number 2" etc. are kept only if formatted as list
          - Any meta-text like "This is a test", "Begin input", "End output", etc.

      ✅ EXAMPLES:

      1. Input: "In all caps. This is wild. Heart emoji. Fire emoji."
        Output: "THIS IS WILD ❤️🔥"

      2. Input: "Here is a list. Number 1 apples. Number 2 bananas."
        Output: "Here is a list:  
      1. Apples  
      2. Bananas"

      3. Input: "Send it to john dot doe at gmail dot com please."
        Output: "Send it to john.doe@gmail.com please."

      4. Input: "In all lowercase. THIS SHOULD BE small. Now in all caps. this is BIG!"
        Output: "this should be small. THIS IS BIG!"

      5. Input: "Go to youtube dot com. Smiling emoji."
        Output: "Go to youtube.com 😊"

      6. Input: "Hashtag blessed. Hashtag grateful. Heart emoji"
        Output: "#blessed #grateful ❤️"

      7. Input: "Say in quotes I'm so excited for this event."
        Output: "\"I'm so excited for this event.\""

      If a screenshot is provided, detect the context (email, code, chat) and format appropriately.`
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
      messages: messages as any,
      temperature: 0
    })

    const enhancedText = completion.choices[0]?.message?.content || text
    return enhancedText
  } catch (error) {
    console.error('Error enhancing transcription:', error)
    return text
  }
}

