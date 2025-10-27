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

  const totalWords = transcriptions.reduce((sum, t) => sum + t.wordCount, 0)

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'white', fontFamily: 'Calibri, sans-serif' }}>
      <div style={{ WebkitAppRegion: 'drag', height: '52px', background: 'white', borderBottom: '1px solid #e0e0e0', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 } as any} />
      <div style={{ paddingTop: '132px', paddingBottom: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '800px', padding: '0 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
            <span style={{ fontSize: '18px', fontWeight: '400', color: '#1a1a1a' }}>Welcome back, Ahitagni</span>
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#666' }}>
              <span>🔥 1 week</span>
              <span>✏️ {totalWords} words</span>
              <span>🏆 150 WPM</span>
            </div>
          </div>

          <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>TODAY</h2>

          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e8e8e8' }}>
            {transcriptions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No transcriptions yet. Press Option to start recording.</div>
            ) : (
              transcriptions.map((transcription, idx) => (
                <div key={transcription.id} style={{ padding: '20px 24px', borderBottom: idx < transcriptions.length - 1 ? '1px solid #e8e8e8' : 'none', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#999', fontSize: '14px', minWidth: '80px', paddingTop: '2px' }}>
                    {new Date(transcription.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                  <p style={{ flex: 1, margin: 0, color: '#1a1a1a', fontSize: '15px', lineHeight: '1.5' }}>{transcription.text}</p>
                  <button onClick={() => navigator.clipboard.writeText(transcription.text)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }} title="Copy transcript">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
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
