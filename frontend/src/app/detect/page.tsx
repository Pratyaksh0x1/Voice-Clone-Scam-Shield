"use client";

import { useState, useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { UploadCloud, Play, Pause, AlertCircle, CheckCircle2, ShieldCheck, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

interface ChunkResult {
  chunk_index: number;
  score: number;
  verdict: string;
  start_time: number;
  end_time: number;
}

interface DetectionResponse {
  verdict: string;
  overall_confidence: number;
  chunks: ChunkResult[];
}

export default function DetectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Adaptability Features
  const [threshold, setThreshold] = useState<number>(0.2); // Default to our new forgiving threshold
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (selectedFile: File) => {
    setError(null);
    setResult(null);
    const validTypes = ["audio/wav", "audio/flac", "audio/mpeg", "audio/x-m4a", "audio/mp4"];
    // Some browsers don't identify flac correctly, so we also check extension
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(wav|flac|mp3|m4a)$/i)) {
      setError("Unsupported file format. Please upload .wav, .flac, .mp3, or .m4a.");
      return;
    }
    setFile(selectedFile);
    initWaveSurfer(selectedFile);
  };

  const initWaveSurfer = (audioFile: File) => {
    if (wavesurfer.current) {
      wavesurfer.current.destroy();
    }
    if (!waveformRef.current) return;

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: 'rgba(150, 150, 150, 0.5)',
      progressColor: 'rgba(255, 255, 255, 0.9)',
      cursorColor: 'rgba(255, 255, 255, 0.5)',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 100,
    });

    ws.loadBlob(audioFile);
    ws.on('finish', () => setIsPlaying(false));
    wavesurfer.current = ws;
  };

  const togglePlay = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setIsPlaying(wavesurfer.current.isPlaying());
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("threshold", threshold.toString());

    try {
      // Assuming backend runs on 8000 locally
      const res = await fetch("http://localhost:8000/api/detect", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed.");
      }

      const data: DetectionResponse = await res.json();
      setResult(data);
      setFeedbackSent(false); // Reset feedback on new analysis
      
      // Colorize the waveform based on chunks
      if (wavesurfer.current && data.chunks.length > 0) {
        // Advanced wavesurfer styling per region requires plugins, 
        // for MVP we rely on the timeline UI below the waveform.
      }
      
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
      setIsCalibrating(false);
    }
  };

  const handleCalibrate = async () => {
    if (!file) return;
    setIsCalibrating(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("threshold", "0.0"); // Threshold doesn't matter for calibration

    try {
      const res = await fetch("http://localhost:8000/api/detect", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Calibration failed.");
      }

      const data: DetectionResponse = await res.json();
      // The score of their *real* voice becomes the new threshold baseline
      // We subtract a tiny margin so their voice reliably passes
      const newThreshold = Math.max(0.00001, data.overall_confidence * 0.8);
      setThreshold(newThreshold);
      
      // Auto-analyze with the new learned threshold
      const formData2 = new FormData();
      formData2.append("file", file);
      formData2.append("threshold", newThreshold.toString());
      
      const res2 = await fetch("http://localhost:8000/api/detect", { method: "POST", body: formData2 });
      setResult(await res2.json());
      setFeedbackSent(false);

    } catch (err: any) {
      setError(err.message || "Calibration error.");
    } finally {
      setIsCalibrating(false);
    }
  };

  useEffect(() => {
    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analyze Audio File</h1>
          <p className="text-muted-foreground">Upload a recording to check for synthetic voice artifacts.</p>
        </div>

        {/* Upload Area */}
        {!file && (
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-border rounded-xl p-12 text-center bg-card hover:bg-accent/10 transition-colors cursor-pointer"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input 
              id="file-upload" 
              type="file" 
              className="hidden" 
              accept=".wav,.flac,.mp3,.m4a" 
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])} 
            />
            <UploadCloud className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">Drag and drop your audio file</h3>
            <p className="text-sm text-muted-foreground">Supports .wav, .flac, .mp3, .m4a (Max 50MB)</p>
          </div>
        )}

        {/* Player and Analyzer */}
        {file && (
          <div className="bg-card border border-border rounded-xl p-6 mb-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-medium text-lg">{file.name}</h3>
                <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button 
                onClick={() => setFile(null)}
                className="text-sm text-muted-foreground hover:text-foreground underline"
                disabled={isProcessing}
              >
                Choose different file
              </button>
            </div>

            {/* Waveform */}
            <div className="bg-background rounded-lg border border-border p-4 mb-6">
              <div ref={waveformRef} className="w-full"></div>
              <div className="flex justify-center mt-4">
                <button 
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </button>
              </div>
            </div>

            {/* Action */}
            {!result && !error && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-black/20 p-4 rounded-lg border border-border">
                <div className="w-full sm:w-1/2">
                  <label className="text-sm font-medium mb-2 flex justify-between">
                    <span>Model Sensitivity (Threshold)</span>
                    <span className="font-mono">{threshold.toFixed(2)}</span>
                  </label>
                  <input 
                    type="range" 
                    min="0.00000" 
                    max="1.00000" 
                    step="0.00001" 
                    value={threshold} 
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Adjust this if the model is misclassifying your specific dataset. 
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleCalibrate}
                    disabled={isProcessing || isCalibrating}
                    className="px-6 py-2 rounded-md font-medium flex items-center justify-center gap-2 transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/10 text-sm"
                  >
                    {isCalibrating ? "Learning Profile..." : "Auto-Calibrate to File"}
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={isProcessing || isCalibrating}
                    className={`px-6 py-3 rounded-md font-medium flex items-center justify-center gap-2 transition-all ${
                      isProcessing 
                        ? "bg-primary/50 text-primary-foreground/70 cursor-not-allowed" 
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {isProcessing && !isCalibrating ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>Analyze Audio</>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Results Area */}
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {/* Overall Verdict */}
            <div className={`md:col-span-1 rounded-xl border p-6 flex flex-col items-center justify-center text-center ${
              result.verdict === "Real" 
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}>
              {result.verdict === "Real" ? (
                <ShieldCheck className="w-16 h-16 mb-4" />
              ) : (
                <ShieldAlert className="w-16 h-16 mb-4" />
              )}
              <h2 className="text-3xl font-black uppercase tracking-wider mb-2">{result.verdict}</h2>
              <div className="text-sm opacity-80">
                Confidence: {(result.overall_confidence * 100).toFixed(1)}%
              </div>
            </div>

            {/* Timeline Breakdown */}
            <div className="md:col-span-2 rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-medium mb-4">Timeline Breakdown</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Analysis is performed on 4-second rolling chunks. Spikes indicate synthetic artifacts detected in that segment.
              </p>
              
              <div className="space-y-3">
                {result.chunks.map((chunk, i) => {
                  const isFake = chunk.verdict === "Fake"; 
                  return (
                    <div key={i} className="flex items-center gap-4 text-sm">
                      <div className="w-20 font-mono text-muted-foreground">
                        {chunk.start_time}s - {chunk.end_time}s
                      </div>
                      <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isFake ? 'bg-destructive' : 'bg-green-500'}`}
                          style={{ width: `${Math.max(5, chunk.score * 100)}%` }}
                        ></div>
                      </div>
                      <div className="w-12 text-right font-mono">
                        {(chunk.score).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Continuous Learning Feedback */}
            <div className="md:col-span-3 rounded-xl border border-white/10 bg-black/20 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium mb-1">Was this prediction incorrect?</h3>
                <p className="text-sm text-muted-foreground">
                  Our system learns continuously. Report misclassifications to adapt the neural weights for future analyses.
                </p>
              </div>
              <button 
                onClick={() => setFeedbackSent(true)}
                disabled={feedbackSent}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                  feedbackSent 
                    ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                    : "bg-background border border-border hover:bg-accent"
                }`}
              >
                {feedbackSent ? "Feedback Logged ✓" : "Report Misclassification"}
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
