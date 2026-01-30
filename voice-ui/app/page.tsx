"use client";

import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import Avatar from '@/components/Avatar';
import MetricsPanel from '@/components/MetricsPanel';
import TranscriptPanel from '@/components/TranscriptPanel';
import MobileMetricsToggle from '@/components/MobileMetricsToggle';
import MobileTranscriptToggle from '@/components/MobileTranscriptToggle';
import { motion } from 'framer-motion';

export default function Home() {
  const { state, transcript, metrics, activateAudio } = useVoiceAgent();

  return (
    <main
      onClick={activateAudio}
      className="h-screen w-full bg-[#0a0a0b] text-white overflow-hidden font-sans selection:bg-blue-500/30 cursor-pointer relative"
    >
      {/* Header Status - Fixed at top */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 lg:top-10">
        <div className="flex items-center space-x-2 lg:space-x-3 bg-white/5 px-3 py-1.5 lg:px-4 lg:py-1.5 rounded-full border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className={`w-2 h-2 rounded-full animate-pulse
            ${state === 'idle' ? 'bg-slate-400' :
              state === 'listening' ? 'bg-blue-500' :
                state === 'thinking' ? 'bg-purple-500' :
                  'bg-emerald-500'}`}
          />
          <span className="text-[9px] lg:text-[10px] uppercase font-bold tracking-[0.15em] lg:tracking-[0.2em] text-slate-300 whitespace-nowrap">
            Assistant: {state}
          </span>
        </div>
      </div>

      {/* Control Buttons - Mobile Only (avoid overlap with header) */}
      <div className="lg:hidden absolute top-14 right-4 z-30 flex flex-col gap-2">
        <MobileTranscriptToggle messages={transcript} />
        <MobileMetricsToggle metrics={metrics} />
      </div>

      <div className="h-full flex flex-col lg:flex-row">
        {/* Sidebar Metrics (Desktop) */}
        <aside className="hidden lg:block w-[300px] flex-shrink-0 relative z-20">
          <MetricsPanel metrics={metrics} />
        </aside>

        {/* Central Avatar */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <Avatar state={state} />

          {/* Footer Guidance */}
          <div className="absolute bottom-4 lg:bottom-10 left-1/2 -translate-x-1/2 w-full text-center px-4 pointer-events-none z-30">
            <motion.p
              animate={{ opacity: state === 'idle' ? 0.6 : 0.2 }}
              className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] lg:tracking-[0.25em]"
            >
              {state === 'idle' ? 'Click anywhere to start talking' :
                state === 'listening' ? 'Listening...' :
                  state === 'thinking' ? 'Thinking...' :
                    'Speaking...'}
            </motion.p>
          </div>
        </div>

        {/* Sidebar Transcript (Desktop) */}
        <aside className="hidden lg:block w-[400px] flex-shrink-0 relative z-20 border-l border-white/10 bg-slate-900/50">
          <TranscriptPanel messages={transcript} />
        </aside>
      </div>
    </main>
  );
}
