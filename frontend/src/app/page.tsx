"use client";

import { useRef } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import Waveform3D from "@/components/Waveform3D";
import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldAlert, Activity, Cpu, ChevronRight, Lock } from "lucide-react";

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  
  // Track scroll for subtle parallax effects
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Parallax transforms for the video container
  const videoY = useTransform(heroScroll, [0, 1], ["0%", "30%"]);
  const videoScale = useTransform(heroScroll, [0, 1], [1, 1.05]);
  const videoOpacity = useTransform(heroScroll, [0, 1], [1, 0.4]);

  return (
    <div className="bg-[#020202] text-foreground font-sans selection:bg-primary/30 min-h-screen">
      
      {/* 
        HERO SECTION 
        Side-by-side layout to prevent text collisions.
        Left: Content
        Right: Video Model with subtle scroll animation
      */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col justify-center overflow-hidden border-b border-white/5">
        
        {/* Abstract subtle background texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none z-0"></div>
        
        {/* Main Grid */}
        <div className="relative z-10 max-w-[1400px] w-full mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center pt-24 pb-12 lg:py-0 min-h-[80vh]">
          
          {/* Left: Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col justify-center pt-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 border border-primary/20 text-primary mb-8 font-mono text-xs uppercase tracking-[0.2em] w-fit">
              <Lock className="w-3.5 h-3.5" />
              <span>Enterprise Voice Security</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black mb-6 tracking-tighter leading-[0.95]">
              DETECT <br/> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-white">SYNTHETICS.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg mb-10 font-light tracking-wide leading-relaxed">
              Stop deepfakes and voice clones in real-time. Our neural architecture analyzes micro-acoustic signatures to secure your infrastructure against generative AI threats.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/detect"
                className="px-8 py-4 bg-white text-black font-semibold uppercase tracking-wider text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
              >
                Run Analysis <ChevronRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/live"
                className="px-8 py-4 bg-transparent border border-white/20 text-white font-semibold uppercase tracking-wider text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
              >
                Live Monitor
              </Link>
            </div>
          </motion.div>

          {/* Right: The Video Model */}
          <div className="relative h-[50vh] lg:h-[80vh] w-full flex items-center justify-center perspective-1000">
            {/* The video has subtle scroll-based animation (parallax & scale) but autoplays naturally */}
            <motion.div 
              style={{ 
                y: videoY, 
                scale: videoScale, 
                opacity: videoOpacity,
                WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 90%)",
                maskImage: "radial-gradient(circle at center, black 40%, transparent 90%)"
              }}
              className="relative w-full h-full max-h-[800px] overflow-hidden mix-blend-screen"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-80"
                src="/hud-video.mp4"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 pointer-events-none"></div>
              
              {/* Overlay abstract 3D waveform on top of the video for extra tech vibe */}
              <div className="absolute inset-0 z-10 opacity-60 mix-blend-screen pointer-events-none">
                <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
                  <Waveform3D />
                </Canvas>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* THE PROBLEM SECTION */}
      <section className="py-32 relative z-30 bg-[#020202] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">The 3-Second Threat</h2>
              <p className="text-lg text-muted-foreground mb-8 font-light leading-relaxed">
                Generative AI allows threat actors to clone a voice using merely three seconds of reference audio. 
                Traditional security perimeters and human verification consistently fail against highly localized acoustic manipulation.
              </p>
              <div className="space-y-4">
                {[
                  "Account Takeover via Phone Support",
                  "CEO Fraud & Social Engineering",
                  "Synthetic Identity Creation"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-white/80 border border-white/5 p-4 rounded-sm bg-white/[0.02]">
                    <ShieldAlert className="text-destructive w-5 h-5 flex-shrink-0" />
                    <span className="font-mono text-sm uppercase tracking-wide">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { value: "$1B+", label: "Annual Losses" },
                { value: "99%", label: "Human Bypass Rate" },
                { value: "<3s", label: "Sample Required" },
                { value: "24/7", label: "Automated Attacks" }
              ].map((stat, i) => (
                <div key={i} className="aspect-square border border-white/10 bg-black p-6 rounded-sm flex flex-col justify-center hover:border-primary/50 transition-colors">
                  <div className="text-4xl lg:text-5xl font-mono text-white mb-2">{stat.value}</div>
                  <div className="text-xs font-mono text-primary uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ARCHITECTURE SECTION */}
      <section className="py-32 relative z-30 bg-[#020202]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20 text-center">
            <h2 className="text-sm font-mono text-primary uppercase tracking-[0.2em] mb-4">Architecture</h2>
            <h3 className="text-4xl md:text-5xl font-bold tracking-tight">Precision at the micro-acoustic level.</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                title: "Temporal Ingestion", 
                desc: "Audio streams are aggressively chunked into overlapping 4-second matrices, ensuring zero data loss during high-throughput analysis.", 
                icon: Activity,
                step: "01"
              },
              { 
                title: "Spectral Extraction", 
                desc: "Waveforms are transformed into high-fidelity Mel Spectrograms, exposing frequency-domain synthetic anomalies invisible to the human ear.", 
                icon: Cpu,
                step: "02"
              },
              { 
                title: "Neural Inference", 
                desc: "Our proprietary ResNet18 + Bi-GRU engine leverages Attention pooling to isolate and flag algorithmic artifacts with 97% precision.", 
                icon: ShieldAlert,
                step: "03"
              }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative p-8 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all group rounded-sm"
              >
                <div className="absolute top-8 right-8 text-6xl font-black text-white/5 pointer-events-none group-hover:text-primary/10 transition-colors">
                  {step.step}
                </div>
                <div className="w-12 h-12 border border-white/10 flex items-center justify-center mb-10 bg-black group-hover:border-primary/50 transition-colors">
                  <step.icon className="text-white w-5 h-5" />
                </div>
                <h4 className="text-xl font-bold mb-3">{step.title}</h4>
                <p className="text-muted-foreground font-light text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA SECTION */}
      <section className="py-40 relative z-30 bg-black text-center border-t border-white/5 overflow-hidden">
        {/* Tech Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">
            SECURE YOUR <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-muted-foreground">INFRASTRUCTURE</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-12 font-light max-w-2xl mx-auto">
            Deploy our models on-premise or integrate via our ultra-low latency WebSocket API. Protect your operations today.
          </p>
          <div className="flex justify-center">
            <Link 
              href="/detect"
              className="px-10 py-5 bg-white text-black font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors rounded-sm"
            >
              Start Analyzing <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
