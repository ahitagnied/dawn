import { useState, useEffect } from 'react'
import { Transcription } from '../../../types/transcription'

const TRANSCRIPTIONS_STORAGE_KEY = 'transcriptions'

export function useTranscriptions() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>(() => {
    const saved = localStorage.getItem(TRANSCRIPTIONS_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem(TRANSCRIPTIONS_STORAGE_KEY, JSON.stringify(transcriptions))
  }, [transcriptions])

  useEffect(() => {
    const unsubscribe = window.bridge?.onTranscriptionAdd?.((transcription) => {
      setTranscriptions(prev => [transcription, ...prev])
    })
    return unsubscribe
  }, [])

  return { transcriptions }
}

