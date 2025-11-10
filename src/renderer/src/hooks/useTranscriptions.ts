import { useState, useEffect } from 'react'
import { Transcription } from '../../../types/transcription'
import { PhrasePair } from './useSettings'

const TRANSCRIPTIONS_STORAGE_KEY = 'transcriptions'

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

type RawTranscription = {
  id?: unknown
  text?: unknown
  timestamp?: unknown
  wordsIn?: unknown
  wordsOut?: unknown
  duration?: unknown
}

// Apply phrase replacements to transcription text
const applyPhraseReplacements = (text: string, phraseReplacements: PhrasePair[]): string => {
  console.log('Applying phrase replacements:', { text, phraseReplacements })

  if (!phraseReplacements || phraseReplacements.length === 0) {
    console.log('No phrase replacements to apply')
    return text
  }

  let result = text
  phraseReplacements.forEach((phrase) => {
    // Use global, case-insensitive replacement
    const regex = new RegExp(phrase.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    console.log('Applying replacement:', {
      original: phrase.original,
      replacement: phrase.replacement,
      regex: regex.toString()
    })
    const before = result
    result = result.replace(regex, phrase.replacement)
    console.log('Replacement result:', { before, after: result, changed: before !== result })
  })
  console.log('Final result:', result)
  return result
}

// Transcription from the main process
const normalizeTranscription = (
  raw: RawTranscription,
  phraseReplacements: PhrasePair[] = []
): Transcription => {
  const originalText = typeof raw?.text === 'string' ? raw.text : ''
  console.log('Normalizing transcription:', { raw, originalText, phraseReplacements })
  const processedText = applyPhraseReplacements(originalText, phraseReplacements)

  return {
    id:
      typeof raw?.id === 'string'
        ? raw.id
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    text: processedText,
    timestamp: typeof raw?.timestamp === 'number' ? raw.timestamp : Date.now(),
    wordsIn: toNumber(raw?.wordsIn),
    wordsOut: toNumber(raw?.wordsOut),
    duration: toNumber(raw?.duration)
  }
}

// Transcriptions from the renderer process
export function useTranscriptions(phraseReplacements: PhrasePair[] = []): {
  transcriptions: Transcription[]
} {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>(() => {
    const saved = localStorage.getItem(TRANSCRIPTIONS_STORAGE_KEY)
    if (!saved) return []
    try {
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed)) return []
      return parsed.map((raw) => normalizeTranscription(raw, phraseReplacements))
    } catch (error) {
      console.error('Failed to parse saved transcriptions:', error)
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(TRANSCRIPTIONS_STORAGE_KEY, JSON.stringify(transcriptions))
  }, [transcriptions])

  useEffect(() => {
    const unsubscribe = window.bridge?.onTranscriptionAdd?.((transcription) => {
      setTranscriptions((prev) => [
        normalizeTranscription(transcription, phraseReplacements),
        ...prev
      ])
    })
    return unsubscribe
  }, [phraseReplacements])

  return { transcriptions }
}
