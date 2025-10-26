import { useEffect, useRef, useState } from 'react'

const IDLE_WIDTH = 40
const IDLE_HEIGHT = 5
const RECORDING_WIDTH = 70
const RECORDING_HEIGHT = 28
const WAVEFORM_BAR_COUNT = 13
const WAVEFORM_BAR_WIDTH = 2.5
const WAVEFORM_BAR_MAX_HEIGHT = 15
const WAVEFORM_GAP = 1.5

export default function App() {
  const urlParams = new URLSearchParams(window.location.search)
  const windowType = urlParams.get('window') || 'overlay'

  if (windowType === 'main') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        Welcome to Dawn
      </div>
    )
  }
  const [recording, setRecording] = useState(false)
  const [audioLevels, setAudioLevels] = useState(Array(WAVEFORM_BAR_COUNT).fill(0))

  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingRef = useRef(false)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const offStart = window.bridge?.onRecordStart?.(startRecording)
    const offStop = window.bridge?.onRecordStop?.(stopRecording)
    return () => {
      offStart && offStart()
      offStop && offStop()
    }
  }, [])

  async function startRecording() {
    if (recordingRef.current) return

    recordingRef.current = true
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
      const stopped = new Promise<void>((resolve) => {
        rec.onstop = () => resolve()
      })
      rec.stop()
      await stopped
    }

    streamRef.current?.getTracks().forEach((t) => t.stop())

    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      chunksRef.current = []
      const buf = await blob.arrayBuffer()
      const res = await window.bridge.transcribe(blob.type, buf)
      const out = res?.text || ''
      await window.bridge.pasteText(out)
    } catch (err) {
      console.error('[renderer] transcription/paste failed', err)
    }
  }

  return (
    <div
      style={{
        width: recording ? RECORDING_WIDTH : IDLE_WIDTH,
        height: recording ? RECORDING_HEIGHT : IDLE_HEIGHT,
        borderRadius: recording ? 10 : 2.5,
        background: '#2a2a2a',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: WAVEFORM_GAP,
        padding: recording ? '0 8px' : 0,
        transition: 'all 0.3s ease'
      }}
    >
      {recording
        ? audioLevels.map((level, i) => (
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
          ))
        : null}
    </div>
  )
}