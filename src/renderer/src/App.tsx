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
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'general' | 'transcription' | 'assistant' | 'output'>('general')
  
  // General settings state
  const [soundEffects, setSoundEffects] = useState(false)
  const [autoMute, setAutoMute] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  
  // Transcription settings state
  const [smartTranscription, setSmartTranscription] = useState(false)
  const [pushToTalk, setPushToTalk] = useState(true)
  const [localTranscription, setLocalTranscription] = useState(true)
  
  // Assistant settings state
  const [autoCaptureScreenshot, setAutoCaptureScreenshot] = useState(false)
  
  // Output settings state
  const [autoCopy, setAutoCopy] = useState(true)
  const [pressEnterAfter, setPressEnterAfter] = useState(false)

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

  // Toggle component
  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        border: 'none',
        background: checked ? '#1a1a1a' : '#e0e0e0',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s'
      }}
    >
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '10px',
        background: 'white',
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        transition: 'left 0.2s'
      }} />
    </button>
  )

  // Settings row component
  const SettingsRow = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: '1px solid #f0f0f0' }}>
      <div>
        <div style={{ fontSize: '16px', fontWeight: '500', color: '#1a1a1a', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '14px', color: '#999' }}>{description}</div>
      </div>
      {children}
    </div>
  )

  if (showSettings) {
    return (
      <div style={{ width: '100%', height: '100vh', background: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Drag region */}
        <div style={{ WebkitAppRegion: 'drag', height: '52px', background: 'white', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 } as any} />
        
        {/* Settings content */}
        <div style={{ flex: 1, padding: '100px 120px 100px 120px', overflowY: 'auto' }}>
          {settingsTab === 'general' && (
            <>
              <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 40px 0' }}>General</h1>
              
              <div>
                <SettingsRow title="Sound Effects" description="Play audio feedback for recording and typing">
                  <Toggle checked={soundEffects} onChange={setSoundEffects} />
                </SettingsRow>

                <SettingsRow title="Auto-Mute System" description="Mute system volume during recording">
                  <Toggle checked={autoMute} onChange={setAutoMute} />
                </SettingsRow>

                <SettingsRow title="Dark Mode" description="Use dark theme for the interface">
                  <Toggle checked={darkMode} onChange={setDarkMode} />
                </SettingsRow>

                <SettingsRow title="API Key" description="Configure your Groq API key">
                  <button style={{
                    padding: '8px 24px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    Set Key
                  </button>
                </SettingsRow>

                <SettingsRow title="Input Device" description="Select microphone for recording">
                  <button style={{
                    padding: '8px 24px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    Select Device
                  </button>
                </SettingsRow>

                <SettingsRow title="Data Location" description="Access your app data and recordings">
                  <button style={{
                    padding: '8px 24px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    Open Folder
                  </button>
                </SettingsRow>

                <SettingsRow title="App Updates" description="Check for the latest version">
                  <button style={{
                    padding: '8px 24px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    Check Updates
                  </button>
                </SettingsRow>
              </div>
            </>
          )}

          {settingsTab === 'transcription' && (
            <>
              <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 40px 0' }}>Transcription</h1>
              
              <div>
                <SettingsRow title="Transcription Hotkey" description="Keyboard shortcut to start transcription">
                  <button style={{
                    padding: '8px 24px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    Option ⌥ + Shift ⇧ + Z
                  </button>
                </SettingsRow>

                <SettingsRow title="Push to Talk Hotkey" description="Hold this key for push-to-talk recording">
                  <button style={{
                    padding: '8px 24px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    Option ⌥ + ~
                  </button>
                </SettingsRow>

                <SettingsRow title="Smart Transcription" description="Enhance transcriptions with formatting and emoji conversion">
                  <Toggle checked={smartTranscription} onChange={setSmartTranscription} />
                </SettingsRow>

                <SettingsRow title="Push to Talk" description="Hold hotkey to record, release to transcribe">
                  <Toggle checked={pushToTalk} onChange={setPushToTalk} />
                </SettingsRow>

                <SettingsRow title="Local Transcription" description="Use offline models for transcription">
                  <Toggle checked={localTranscription} onChange={setLocalTranscription} />
                </SettingsRow>

                <SettingsRow title="Local Model" description="Select offline transcription model">
                  <button style={{
                    padding: '8px 24px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    Base
                  </button>
                </SettingsRow>
              </div>
            </>
          )}

          {settingsTab === 'assistant' && (
            <>
              <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 40px 0' }}>Assistant</h1>
              
              <div>
                <SettingsRow title="Assistant Hotkey" description="Keyboard shortcut to activate AI assistant">
                  <button style={{
                    padding: '8px 24px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    Option ⌥ + Shift ⇧ + S
                  </button>
                </SettingsRow>

                <SettingsRow title="Auto-capture Screenshot" description="Take screenshot when assistant hotkey is pressed for visual context">
                  <Toggle checked={autoCaptureScreenshot} onChange={setAutoCaptureScreenshot} />
                </SettingsRow>

                <SettingsRow title="Assistant Model" description="Select AI model for assistant responses">
                  <button style={{
                    padding: '8px 24px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    Llama 3.3 70B Versatile
                  </button>
                </SettingsRow>
              </div>
            </>
          )}

          {settingsTab === 'output' && (
            <>
              <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 40px 0' }}>Output</h1>
              
              <div>
                <SettingsRow title="Auto Copy" description="Copy transcriptions to clipboard automatically">
                  <Toggle checked={autoCopy} onChange={setAutoCopy} />
                </SettingsRow>

                <SettingsRow title="Press Enter After" description="Automatically press Enter after pasting">
                  <Toggle checked={pressEnterAfter} onChange={setPressEnterAfter} />
                </SettingsRow>

                <SettingsRow title="Languages" description="Select transcription languages (1 selected)">
                  <button style={{
                    padding: '8px 24px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    Manage Languages
                  </button>
                </SettingsRow>

                <SettingsRow title="Dictionary" description="Custom words for better transcription (0 words)">
                  <button style={{
                    padding: '8px 24px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    Manage Words
                  </button>
                </SettingsRow>

                <SettingsRow title="Phrase Replacements" description="Replace phrases in transcriptions (0 rules)">
                  <button style={{
                    padding: '8px 24px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    Manage Phrases
                  </button>
                </SettingsRow>
              </div>
            </>
          )}
        </div>
        
        {/* Bottom navigation */}
        <div style={{ position: 'absolute', bottom: '32px', left: '32px', right: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Back button */}
            <button onClick={() => setShowSettings(false)} style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'} title="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            
            {/* Settings tab - General */}
            <button onClick={() => setSettingsTab('general')} style={{ background: settingsTab === 'general' ? '#f0f0f0' : 'transparent', border: 'none', borderRadius: '8px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="General">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={settingsTab === 'general' ? '#1a1a1a' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            
            {/* Transcription tab */}
            <button onClick={() => setSettingsTab('transcription')} style={{ background: settingsTab === 'transcription' ? '#f0f0f0' : 'transparent', border: 'none', borderRadius: '8px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Transcription">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={settingsTab === 'transcription' ? '#1a1a1a' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
            
            {/* Assistant tab */}
            <button onClick={() => setSettingsTab('assistant')} style={{ background: settingsTab === 'assistant' ? '#f0f0f0' : 'transparent', border: 'none', borderRadius: '8px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Assistant">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={settingsTab === 'assistant' ? '#1a1a1a' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </button>
            
            {/* Output tab */}
            <button onClick={() => setSettingsTab('output')} style={{ background: settingsTab === 'output' ? '#f0f0f0' : 'transparent', border: 'none', borderRadius: '8px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Output">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={settingsTab === 'output' ? '#1a1a1a' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
          </div>
          
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
        <button onClick={() => setShowSettings(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'} title="Settings">
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
