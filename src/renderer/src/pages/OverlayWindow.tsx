import { useEffect, useRef, useState, useCallback } from 'react'
import { useSettings, PhrasePair } from '../hooks/useSettings'

const IDLE_WIDTH = 40
const IDLE_HEIGHT = 8
const RECORDING_WIDTH = 70
const RECORDING_HEIGHT = 28
const WAVEFORM_BAR_COUNT = 13
const WAVEFORM_BAR_WIDTH = 2.5
const WAVEFORM_BAR_MAX_HEIGHT = 15
const WAVEFORM_GAP = 1.5

// Apply phrase replacements to transcription text
const applyPhraseReplacements = (text: string, phraseReplacements: PhrasePair[]): string => {
  if (!phraseReplacements || phraseReplacements.length === 0) {
    return text
  }

  let result = text
  phraseReplacements.forEach((phrase) => {
    // Use global, case-insensitive replacement
    const regex = new RegExp(phrase.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    result = result.replace(regex, phrase.replacement)
  })
  return result
}

export function OverlayWindow() {
  const { settings } = useSettings()
  const [recording, setRecording] = useState(false)
  const [audioLevels, setAudioLevels] = useState(Array(WAVEFORM_BAR_COUNT).fill(0))

  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingRef = useRef(false)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const recordingStartTimeRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const isSettingUpRef = useRef(false) // Track if we're in the middle of setup

  const startRecording = useCallback(async () => {
    console.log('startRecording called with device:', settings.inputDevice)
    if (recordingRef.current || isSettingUpRef.current) return

    recordingRef.current = true
    isSettingUpRef.current = true
    recordingStartTimeRef.current = Date.now()
    setRecording(true)

    try {
      // Always read the latest settings directly from localStorage
      const savedSettings = localStorage.getItem('dawn-settings')
      const currentSettings = savedSettings ? JSON.parse(savedSettings) : {}
      const currentDevice = currentSettings.inputDevice || 'default'

      console.log('Using device from localStorage:', currentDevice)

      // Use the selected input device from settings
      const audioConstraints: MediaStreamConstraints = {
        audio: currentDevice === 'default' ? true : { deviceId: { exact: currentDevice } }
      }

      streamRef.current = await navigator.mediaDevices.getUserMedia(audioConstraints)

      // Check if recording was canceled during async getUserMedia
      if (!recordingRef.current) {
        console.log('[OverlayWindow] Recording canceled during getUserMedia, cleaning up')
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        isSettingUpRef.current = false
        return
      }
    } catch (error) {
      console.error(
        'Failed to get audio stream with selected device, falling back to default:',
        error
      )

      // Fallback to default device if the selected device is not available
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })

        // Check again if recording was canceled during fallback
        if (!recordingRef.current) {
          console.log('[OverlayWindow] Recording canceled during fallback, cleaning up')
          streamRef.current?.getTracks().forEach((t) => t.stop())
          streamRef.current = null
          isSettingUpRef.current = false
          return
        }
      } catch (fallbackError) {
        console.error('Failed to get any audio stream:', fallbackError)
        recordingRef.current = false
        isSettingUpRef.current = false
        setRecording(false)
        return
      }
    }

    // Final check before setting up audio processing
    if (!recordingRef.current) {
      console.log('[OverlayWindow] Recording canceled before audio setup, cleaning up')
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      isSettingUpRef.current = false
      return
    }

    const audioContext = new AudioContext()
    audioContextRef.current = audioContext
    const source = audioContext.createMediaStreamSource(streamRef.current)
    const analyser = audioContext.createAnalyser()

    analyser.fftSize = 64
    source.connect(analyser)
    analyserRef.current = analyser

    // Check once more if recording was canceled during audio setup
    if (!recordingRef.current) {
      console.log('[OverlayWindow] Recording canceled during audio setup, cleaning up')
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      audioContext.close()
      audioContextRef.current = null
      isSettingUpRef.current = false
      return
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateWaveform = () => {
      analyser.getByteFrequencyData(dataArray)
      const levels = Array.from(dataArray.slice(0, WAVEFORM_BAR_COUNT)).map((v) => v / 255)
      setAudioLevels(levels)
      animationRef.current = requestAnimationFrame(updateWaveform)
    }
    updateWaveform()

    const rec = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm' })
    chunksRef.current = []
    rec.ondataavailable = (e) => e.data && e.data.size && chunksRef.current.push(e.data)
    recRef.current = rec
    rec.start()

    isSettingUpRef.current = false
    console.log('[OverlayWindow] Recording setup complete')
  }, []) // No dependencies needed since we read from localStorage

  async function stopRecording() {
    if (!recordingRef.current) return

    recordingRef.current = false
    isSettingUpRef.current = false
    setRecording(false)

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    const rec = recRef.current
    if (rec && rec.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        rec.onstop = () => resolve()
        rec.stop()
      })
    }

    // Stop microphone immediately to prevent it from staying active
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log('[OverlayWindow] Stopped track:', track.kind, track.label)
      })
      streamRef.current = null
    }

    // Close AudioContext to release audio resources
    if (audioContextRef.current) {
      await audioContextRef.current.close()
      audioContextRef.current = null
      console.log('[OverlayWindow] Closed AudioContext')
    }

    const duration = recordingStartTimeRef.current
      ? (Date.now() - recordingStartTimeRef.current) / 1000
      : 0

    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const blobSize = blob.size
      chunksRef.current = []

      console.log('[OverlayWindow] Recording blob size:', blobSize, 'bytes, duration:', duration, 's')

      // Check if the blob has meaningful content (minimum 100 bytes for valid audio)
      // Empty or near-empty files indicate the recorder didn't capture any audio
      if (blobSize < 100) {
        console.log('[OverlayWindow] Blob too small, skipping transcription')
        return
      }

      const buf = await blob.arrayBuffer()
      const res = await window.bridge.transcribe(blob.type, buf, duration)
      const originalText = res?.text || ''

      // Get the latest settings from localStorage to ensure we have current phrase replacements
      const savedSettings = localStorage.getItem('dawn-settings')
      const currentSettings = savedSettings ? JSON.parse(savedSettings) : {}
      const currentPhraseReplacements = currentSettings.phraseReplacements || []

      // Apply phrase replacements to the transcribed text
      const processedText = applyPhraseReplacements(originalText, currentPhraseReplacements)

      console.log('Phrase replacement in paste:', {
        originalText,
        processedText,
        phraseReplacements: currentPhraseReplacements
      })

      await window.bridge.pasteText(processedText)
    } catch (err) {
      console.error('[renderer] transcription/paste failed', err)
    }
  }

  async function cancelRecording() {
    if (!recordingRef.current && !isSettingUpRef.current) return

    console.log('[OverlayWindow] Canceling recording (quick release)')

    // Set recordingRef to false FIRST so startRecording can detect cancellation
    recordingRef.current = false
    setRecording(false)

    // Wait briefly for any ongoing setup to detect the cancellation
    // This gives getUserMedia time to complete and clean up
    if (isSettingUpRef.current) {
      console.log('[OverlayWindow] Setup in progress, waiting for cleanup...')
      let waitCount = 0
      while (isSettingUpRef.current && waitCount < 20) {
        await new Promise((resolve) => setTimeout(resolve, 10))
        waitCount++
      }
      console.log('[OverlayWindow] Setup cleanup wait complete')
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    const rec = recRef.current
    if (rec && rec.state !== 'inactive') {
      // Stop recorder immediately without waiting
      rec.stop()
    }

    // Stop microphone immediately and aggressively for quick releases
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log('[OverlayWindow] Force stopped track:', track.kind, track.label)
      })
      streamRef.current = null
    }

    // Close AudioContext immediately to release audio resources
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close()
        audioContextRef.current = null
        console.log('[OverlayWindow] Force closed AudioContext')
      } catch (error) {
        console.error('[OverlayWindow] Error closing AudioContext:', error)
      }
    }

    // Clear the recorded chunks without sending to API
    chunksRef.current = []
    
    // Reset all references to ensure clean state
    recRef.current = null
    isSettingUpRef.current = false
    
    console.log('[OverlayWindow] Recording canceled and cleaned up (microphone released)')
  }

  useEffect(() => {
    console.log('Setting up event listeners')
    const offStart = window.bridge?.onRecordStart?.(startRecording)
    const offStop = window.bridge?.onRecordStop?.(stopRecording)
    const offCancel = window.bridge?.onRecordCancel?.(cancelRecording)
    return () => {
      console.log('Cleaning up event listeners')
      offStart?.()
      offStop?.()
      offCancel?.()
    }
  }, []) // Only run once on mount

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent'
      }}
    >
      <div
        style={{
          width: recording ? RECORDING_WIDTH : IDLE_WIDTH,
          height: recording ? RECORDING_HEIGHT : IDLE_HEIGHT,
          borderRadius: 10,
          background: 'rgba(19, 19, 19, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: WAVEFORM_GAP,
          padding: recording ? '0 8px' : 0,
          transition: 'all 0.3s ease'
        }}
      >
        {recording &&
          audioLevels.map((level, i) => (
            <div
              key={i}
              style={{
                width: WAVEFORM_BAR_WIDTH,
                height: Math.max(2, level * WAVEFORM_BAR_MAX_HEIGHT),
                background: '#fff',
                borderRadius: 1,
                transition: 'height 0.05s ease'
              }}
            />
          ))}
      </div>
    </div>
  )
}
