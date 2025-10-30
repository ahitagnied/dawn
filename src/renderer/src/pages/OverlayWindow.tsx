import { useEffect, useRef, useState } from 'react'

const IDLE_WIDTH = 40
const IDLE_HEIGHT = 8
const RECORDING_WIDTH = 70
const RECORDING_HEIGHT = 28
const WAVEFORM_BAR_COUNT = 13
const WAVEFORM_BAR_WIDTH = 2.5
const WAVEFORM_BAR_MAX_HEIGHT = 15
const WAVEFORM_GAP = 1.5

export function OverlayWindow() {
  const [recording, setRecording] = useState(false)
  const [audioLevels, setAudioLevels] = useState(Array(WAVEFORM_BAR_COUNT).fill(0))

  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingRef = useRef(false)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const recordingStartTimeRef = useRef<number | null>(null)

  useEffect(() => {
    const offStart = window.bridge?.onRecordStart?.(startRecording)
    const offStop = window.bridge?.onRecordStop?.(stopRecording)
    return () => {
      offStart?.()
      offStop?.()
    }
  }, [])

  async function startRecording() {
    if (recordingRef.current) return

    recordingRef.current = true
    recordingStartTimeRef.current = Date.now()
    setRecording(true)

    streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })

    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(streamRef.current)
    const analyser = audioContext.createAnalyser()

    analyser.fftSize = 64
    source.connect(analyser)
    analyserRef.current = analyser

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
  }

  async function stopRecording() {
    if (!recordingRef.current) return

    recordingRef.current = false
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

    streamRef.current?.getTracks().forEach((t) => t.stop())

    const duration = recordingStartTimeRef.current ? (Date.now() - recordingStartTimeRef.current) / 1000 : 0

    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      chunksRef.current = []
      const buf = await blob.arrayBuffer()
      const res = await window.bridge.transcribe(blob.type, buf, duration)
      const text = res?.text || ''
      await window.bridge.pasteText(text)
    } catch (err) {
      console.error('[renderer] transcription/paste failed', err)
    }
  }

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'transparent' 
    }}>
      <div style={{ 
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
      }}>
        {recording && audioLevels.map((level, i) => (
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

