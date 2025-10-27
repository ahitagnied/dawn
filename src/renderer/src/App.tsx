import { useEffect, useRef, useState } from 'react'
import { Transcription } from '../../types/transcription'

const IDLE_WIDTH = 40
const IDLE_HEIGHT = 8
const RECORDING_WIDTH = 70
const RECORDING_HEIGHT = 28
const WAVEFORM_BAR_COUNT = 13
const WAVEFORM_BAR_WIDTH = 2.5
const WAVEFORM_BAR_MAX_HEIGHT = 15
const WAVEFORM_GAP = 1.5

function MainWindow() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>(() => {
    const saved = localStorage.getItem('transcriptions')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('transcriptions', JSON.stringify(transcriptions))
  }, [transcriptions])

  useEffect(() => {
    const unsubscribe = window.bridge?.onTranscriptionAdd?.((transcription) => {
      setTranscriptions(prev => [transcription, ...prev])
    })
    return unsubscribe
  }, [])

  // Calculate stats
  const wordsIn = transcriptions.reduce((sum, t) => sum + t.wordCount, 0)
  const wordsOut = transcriptions.reduce((sum, t) => sum + t.wordCount, 0)
  const totalSeconds = transcriptions.reduce((sum, t) => sum + (t.duration || 0), 0)
  const wpm = totalSeconds > 0 ? Math.round((wordsOut / totalSeconds) * 60) : 0

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'good morning,'
    if (hour < 18) return 'good afternoon,'
    return 'good evening,'
  }

  return (
    <div style={{ width: '100%', height: '100vh', background: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Drag region */}
      <div style={{ WebkitAppRegion: 'drag', height: '52px', background: 'white', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 } as any} />
      
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '80px' }}>
        {/* Greeting */}
        <h1 style={{ fontSize: '48px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 16px 0', letterSpacing: '-0.5px' }}>
          {getGreeting()}
        </h1>
        
        {/* Subtitle */}
        <p style={{ fontSize: '18px', fontWeight: '400', color: '#666', margin: '0 0 64px 0' }}>
          what would you like to build with dawn today?
        </p>
        
        {/* Stats */}
        <div style={{ display: 'flex', gap: '60px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '400', color: '#1a1a1a', marginBottom: '8px' }}>
              {wordsIn}
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>words in</div>
          </div>
          
          <div style={{ fontSize: '24px', color: '#e0e0e0' }}>·</div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '400', color: '#1a1a1a', marginBottom: '8px' }}>
              {wordsOut}
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>words out</div>
          </div>
          
          <div style={{ fontSize: '24px', color: '#e0e0e0' }}>·</div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '400', color: '#1a1a1a', marginBottom: '8px' }}>
              {totalSeconds}
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>seconds</div>
          </div>
          
          <div style={{ fontSize: '24px', color: '#e0e0e0' }}>·</div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '400', color: '#1a1a1a', marginBottom: '8px' }}>
              {wpm}
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>wpm</div>
          </div>
        </div>
      </div>
      
      {/* Bottom buttons */}
      <div style={{ position: 'absolute', bottom: '32px', left: '32px', right: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Settings button - bottom left */}
        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'} title="Settings">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        
        {/* Info button - bottom right */}
        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'} title="Info">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>
      </div>
    </div>
  )
}

function OverlayWindow() {
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
      offStart?.()
      offStop?.()
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
      await new Promise<void>((resolve) => {
        rec.onstop = () => resolve()
        rec.stop()
      })
    }

    streamRef.current?.getTracks().forEach((t) => t.stop())

    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      chunksRef.current = []
      const buf = await blob.arrayBuffer()
      const res = await window.bridge.transcribe(blob.type, buf)
      const text = res?.text || ''
      await window.bridge.pasteText(text)
      window.bridge.sendTranscription(text)
    } catch (err) {
      console.error('[renderer] transcription/paste failed', err)
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
      <div style={{ width: recording ? RECORDING_WIDTH : IDLE_WIDTH, height: recording ? RECORDING_HEIGHT : IDLE_HEIGHT, borderRadius: 10, background: 'rgba(19, 19, 19, 0.8)', border: '1px solid rgba(255, 255, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: WAVEFORM_GAP, padding: recording ? '0 8px' : 0, transition: 'all 0.3s ease' }}>
        {recording && audioLevels.map((level, i) => (
          <div key={i} style={{ width: WAVEFORM_BAR_WIDTH, height: Math.max(2, level * WAVEFORM_BAR_MAX_HEIGHT), background: '#fff', borderRadius: 1, transition: 'height 0.05s ease' }} />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search)
  const windowType = urlParams.get('window') || 'overlay'
  return windowType === 'main' ? <MainWindow /> : <OverlayWindow />
}
