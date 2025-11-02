import { useState, useEffect } from 'react'
import { Transcription } from '../../../types/transcription'

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

// Transcription from the main process
const normalizeTranscription = (raw: RawTranscription): Transcription => {
  return {
    id:
      typeof raw?.id === 'string'
        ? raw.id
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    text: typeof raw?.text === 'string' ? raw.text : '',
    timestamp: typeof raw?.timestamp === 'number' ? raw.timestamp : Date.now(),
    wordsIn: toNumber(raw?.wordsIn),
    wordsOut: toNumber(raw?.wordsOut),
    duration: toNumber(raw?.duration)
  }
}

// Transcriptions from the renderer process
export function useTranscriptions(): { transcriptions: Transcription[] } {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>(() => {
    const saved = localStorage.getItem(TRANSCRIPTIONS_STORAGE_KEY)
    if (!saved) return []
    try {
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed)) return []
      return parsed.map(normalizeTranscription)
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
      setTranscriptions((prev) => [normalizeTranscription(transcription), ...prev])
    })
    return unsubscribe
  }, [])

  return { transcriptions }
}
