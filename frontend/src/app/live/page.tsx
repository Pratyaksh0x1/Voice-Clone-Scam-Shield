"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, ShieldAlert, Square, Activity, AlertTriangle, ShieldCheck, Globe, Terminal, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LivePage() {
  const [hasConsent, setHasConsent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [verdict, setVerdict] = useState<string>("Processing");
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [history, setHistory] = useState<{ time: number; score: number, verdict: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(["SYSTEM INITIALIZED.", "WAITING FOR AUDIO STREAM..."]);
  
  // NLP Transcription state
  const [transcript, setTranscript] = useState<string>("");
  const [language, setLanguage] = useState<string>("hi-IN");
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const sessionId = useRef(Math.random().toString(36).substring(7)).current;
  const startTime = useRef(0);
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => {
      const newLogs = [...prev, `[${new Date().toISOString().split('T')[1].slice(0,8)}] ${msg}`];
      if (newLogs.length > 8) return newLogs.slice(newLogs.length - 8);
      return newLogs;
    });
  };

  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.error("Failed to play beep", e);
    }
  };

  const isRecordingRef = useRef(false);

  const startMonitoring = async () => {
    try {
      setError(null);
      setLogs(["INITIALIZING NEURAL LINK..."]);
      finalTranscriptRef.current = "";
      setTranscript("");
      isRecordingRef.current = true;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname || 'localhost';
      wsRef.current = new WebSocket(`${protocol}//${hostname}:8000/api/live`);
      
      wsRef.current.onopen = () => {
        addLog("WEBSOCKET CONNECTED. PORT 8000.");
        wsRef.current?.send(JSON.stringify({ consent: true, session_id: sessionId }));
        startAudioCapture();
        startTranscription();
        
        // Start fake neural logs for visual tech effect
        logIntervalRef.current = setInterval(() => {
          const fakeLogs = [
            "EXTRACTING MEL-SPECTROGRAM...",
            "APPLYING ATTENTION WEIGHTS...",
            "ANALYZING MICRO-ACOUSTIC ARTIFACTS...",
            "COMPUTING BI-GRU MATRICES...",
            "RESNET18 FEATURE MAP UPDATED.",
            "NOISE FLOOR CALIBRATED.",
            "FREQUENCY DOMAIN SCANNED."
          ];
          addLog(fakeLogs[Math.floor(Math.random() * fakeLogs.length)]);
        }, 2000);
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
          stopMonitoring();
          return;
        }
        setVerdict(prev => {
          if (data.verdict === "Fake" && prev !== "Fake") {
            playBeep();
          }
          return data.verdict;
        });
        setCurrentScore(data.score);
        
        setHistory(prev => {
          const now = (Date.now() - startTime.current) / 1000;
          const newHistory = [...prev, { time: now, score: data.score, verdict: data.verdict }];
          if (newHistory.length > 30) return newHistory.slice(newHistory.length - 30);
          return newHistory;
        });
      };

      wsRef.current.onerror = () => {
        setError("WebSocket connection failed. Ensure backend is running.");
        stopMonitoring();
      };
      
      wsRef.current.onclose = () => {
        stopMonitoring();
      };

    } catch (err: any) {
      setError(err.message || "Failed to start monitoring.");
    }
  };

  const startTranscription = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language; 
        
        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscriptRef.current += event.results[i][0].transcript + " ";
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          setTranscript(finalTranscriptRef.current + interimTranscript);
        };

        recognition.onend = () => {
          if (isRecordingRef.current) {
            try {
              recognition.start();
            } catch (e) {}
          }
        };
        
        recognition.start();
        recognitionRef.current = recognition;
        addLog(`NLP ENGINE STARTED [LANG: ${language}]`);
      }
    } catch (err) {
      addLog("NLP ENGINE FAILED TO START.");
    }
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContext({ sampleRate: 16000 });
      if (context.state === 'suspended') {
        await context.resume();
      }
      audioContextRef.current = context;
      
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      let pcmBuffer: Int16Array[] = [];
      let accumulatedFrames = 0;
      const targetFrames = 16000 * 2; 
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        pcmBuffer.push(pcm16);
        accumulatedFrames += pcm16.length;
        
        if (accumulatedFrames >= targetFrames) {
          const chunk = new Int16Array(accumulatedFrames);
          let offset = 0;
          for (const buf of pcmBuffer) {
            chunk.set(buf, offset);
            offset += buf.length;
          }
          
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const wavBuffer = createWavFile(chunk, 16000);
            wsRef.current.send(wavBuffer);
          }
          
          pcmBuffer = [];
          accumulatedFrames = 0;
        }
      };
      
      source.connect(processor);
      const gainNode = context.createGain();
      gainNode.gain.value = 0; // Mute to prevent feedback
      processor.connect(gainNode);
      gainNode.connect(context.destination); 
      
      startTime.current = Date.now();
      setIsRecording(true);
      addLog("AUDIO STREAM ACTIVE. SAMPLING @ 16kHz.");
      
    } catch (err: any) {
      setError("Microphone access denied or unavailable.");
      stopMonitoring();
    }
  };
  
  const createWavFile = (pcmData: Int16Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); 
    view.setUint16(20, 1, true); 
    view.setUint16(22, 1, true); 
    view.setUint32(24, sampleRate, true); 
    view.setUint32(28, sampleRate * 2, true); 
    view.setUint16(32, 2, true); 
    view.setUint16(34, 16, true); 
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length * 2, true);
    
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++, offset += 2) {
      view.setInt16(offset, pcmData[i], true);
    }
    
    return buffer;
  };
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const stopMonitoring = () => {
    isRecordingRef.current = false;
    if (processorRef.current && audioContextRef.current) {
      processorRef.current.disconnect();
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (logIntervalRef.current) {
      clearInterval(logIntervalRef.current);
    }
    
    processorRef.current = null;
    audioContextRef.current = null;
    streamRef.current = null;
    wsRef.current = null;
    setIsRecording(false);
    setVerdict("Processing");
    setCurrentScore(0);
    addLog("CONNECTION TERMINATED.");
  };

  useEffect(() => {
    return () => stopMonitoring();
  }, []);

  if (!hasConsent) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen"
          src="/hud-video.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 max-w-lg w-full bg-black/60 backdrop-blur-2xl border border-primary/30 rounded-xl p-8 shadow-[0_0_80px_rgba(var(--primary),0.15)] text-center">
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6 text-destructive border border-destructive/50 shadow-[0_0_30px_rgba(255,0,0,0.3)]">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black mb-4 tracking-tighter uppercase text-white drop-shadow-lg">Security Protocol</h2>
          <p className="text-muted-foreground mb-8 font-light leading-relaxed">
            Live Monitoring requires root microphone access to capture and analyze ambient acoustics in real-time. 
            <br/><br/>
            <span className="text-destructive/80 font-mono text-sm tracking-widest uppercase">Unauthorized surveillance is strictly prohibited.</span>
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => setHasConsent(true)}
              className="w-full py-4 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-black text-sm tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(var(--primary),0.6)] border border-primary hover:scale-[1.02]"
            >
              Grant Access & Initialize
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full py-4 px-4 rounded-md border border-white/20 text-foreground hover:bg-white/10 transition-colors font-medium text-sm tracking-widest uppercase"
            >
              Abort Mission
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-12 px-4 md:px-8 relative overflow-hidden flex flex-col">
      
      {/* Immersive HUD Background */}
      <video
        autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-[0.15] mix-blend-screen z-0 pointer-events-none scale-105 blur-[2px]"
        src="/hud-video.mp4"
      />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none mix-blend-overlay"></div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto flex-1 flex flex-col">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-black mb-2 flex items-center gap-4 tracking-tighter uppercase text-white drop-shadow-md">
              Live Intercept
              {isRecording && (
                <span className="flex h-4 w-4 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 shadow-[0_0_15px_red]"></span>
                </span>
              )}
            </h1>
            <p className="text-primary font-mono text-xs tracking-[0.3em] uppercase">Tactical Acoustic Analysis Array</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Advanced NLP Selector */}
            <div className="flex items-center gap-3 bg-black/60 border border-white/20 rounded-md px-4 py-2.5 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <Globe className="w-4 h-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">NLP Engine Mode</span>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isRecording}
                  className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer disabled:opacity-50 tracking-wide"
                >
                  <option value="hi-IN" className="bg-black text-white">Hindi</option>
                  <option value="en-IN" className="bg-black text-white">Indian English</option>
                  <option value="en-US" className="bg-black text-white">Standard English</option>
                </select>
              </div>
            </div>

            <button
              onClick={isRecording ? stopMonitoring : startMonitoring}
              className={`flex items-center gap-3 px-8 py-4 rounded-md font-black uppercase tracking-widest text-sm transition-all ${
                isRecording 
                  ? "bg-destructive text-white hover:bg-destructive/90 shadow-[0_0_40px_rgba(255,0,0,0.6)] border border-red-500"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.4)]"
              }`}
            >
              {isRecording ? (
                <><Square className="w-4 h-4 fill-current" /> Terminate Link</>
              ) : (
                <><Mic className="w-4 h-4" /> Initialize Link</>
              )}
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid lg:grid-cols-4 gap-6 flex-1">
          
          {/* Left Column: Status & Neural Log */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Current Verdict Module */}
            <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-2xl p-8 flex flex-col items-center justify-center text-center shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden group">
              {/* Animated scanning line */}
              {isRecording && <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/50 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(var(--primary),1)]"></div>}
              
              <div className="mb-6 relative z-10">
                {verdict === "Processing" && <Activity className="w-24 h-24 text-primary/80 animate-pulse drop-shadow-[0_0_20px_rgba(var(--primary),0.8)]" />}
                {verdict === "Real" && <ShieldCheck className="w-24 h-24 text-green-500 drop-shadow-[0_0_30px_rgba(34,197,94,1)]" />}
                {verdict === "Fake" && <ShieldAlert className="w-24 h-24 text-destructive drop-shadow-[0_0_30px_rgba(239,68,68,1)]" />}
              </div>
              <h2 className={`text-5xl font-black uppercase tracking-widest mb-3 z-10 ${
                verdict === "Real" ? "text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]" 
                : verdict === "Fake" ? "text-destructive drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" 
                : "text-primary/80 drop-shadow-[0_0_15px_rgba(var(--primary),0.4)]"
              }`}>
                {verdict}
              </h2>
              <div className="text-xs font-mono text-white/50 tracking-[0.2em] uppercase z-10">
                Conf: {currentScore.toFixed(3)}
              </div>
            </div>

            {/* Neural Log Terminal */}
            <div className="flex-1 rounded-xl border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl p-5 flex flex-col shadow-2xl relative overflow-hidden">
              <h3 className="text-xs font-mono text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
                <Terminal className="w-4 h-4" /> System Terminal
              </h3>
              <div className="flex-1 font-mono text-[10px] text-green-400/70 tracking-wider flex flex-col justify-end space-y-1.5 overflow-hidden">
                <AnimatePresence>
                  {logs.map((log, i) => (
                    <motion.div 
                      key={i + log}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="break-words"
                    >
                      {log}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

          </div>

          {/* Right Column: Timelines and Transcript */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* Rolling Chart Matrix */}
            <div className="flex-1 rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 flex flex-col shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] relative">
              <h3 className="text-sm font-mono text-white/80 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <Cpu className="w-5 h-5 text-primary" /> Confidence Matrix Stream
              </h3>
              <div className="flex-1 relative flex items-end border-b border-l border-white/20 pb-2 pl-2">
                {/* Y-axis labels */}
                <div className="absolute -left-6 bottom-0 top-0 flex flex-col justify-between text-[10px] font-mono text-white/30 py-2">
                  <span>1.0</span>
                  <span>0.5</span>
                  <span>0.0</span>
                </div>

                {history.map((point, i) => {
                  const height = Math.max(2, point.score * 100);
                  const isFake = point.verdict === "Fake";
                  return (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      className={`flex-1 mx-[2px] rounded-t-sm opacity-90 transition-all duration-300 ${isFake ? 'bg-destructive shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]'}`}
                    />
                  );
                })}
                
                {history.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-white/20 uppercase tracking-[0.3em]">
                    {isRecording ? "Awaiting neural payload..." : "Data stream offline"}
                  </div>
                )}
              </div>
            </div>

            {/* Live Transcription Box */}
            <div className="h-[250px] rounded-xl border border-primary/20 bg-[#050505]/80 backdrop-blur-2xl p-6 flex flex-col shadow-[0_0_40px_rgba(var(--primary),0.05)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
              
              <h3 className="text-sm font-mono text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3 relative z-10">
                <Mic className="w-5 h-5 text-primary animate-pulse" /> 
                Live NLP Engine Output
              </h3>
              <div className="flex-1 bg-black/60 rounded-md border border-white/5 p-5 overflow-y-auto font-sans relative z-10 custom-scrollbar shadow-inner">
                {transcript ? (
                  <p className="text-2xl font-light leading-relaxed text-white drop-shadow-md tracking-wide">
                    {transcript}
                  </p>
                ) : (
                  <p className="text-white/20 italic text-sm font-mono flex items-center h-full justify-center tracking-widest">
                    {isRecording ? `AWAITING VERBAL INPUT [${language}]...` : "SYSTEM STANDBY."}
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(200px); opacity: 0; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
      `}} />
    </div>
  );
}
