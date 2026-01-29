"use client";

import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import Avatar from '@/components/Avatar';
import TranscriptPanel from '@/components/TranscriptPanel';
import MetricsPanel from '@/components/MetricsPanel';
import { motion } from 'framer-motion';

export default function Home() {
  const { state, transcript, metrics, isAudioStarted, activateAudio } = useVoiceAgent();

  return (
    <main
      onClick={activateAudio}
      className="flex h-screen w-full bg-[#0a0a0b] text-white overflow-hidden font-sans selection:bg-blue-500/30 cursor-pointer"
    >
      {/* Sidebar Metrics (Left) */}
      <aside className="w-[300px] flex-shrink-0 relative z-20 hidden lg:block">
        <MetricsPanel metrics={metrics} />
      </aside>

      {/* Central Content Area */}
      <div className="relative flex-1 flex flex-col items-center justify-between p-8 pt-24 pb-20">
        {/* Header Status */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center space-x-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-xl shadow-2xl">
            <div className={`w-2 h-2 rounded-full animate-pulse
              ${state === 'idle' ? 'bg-slate-400' :
                state === 'listening' ? 'bg-blue-500' :
                  state === 'thinking' ? 'bg-purple-500' :
                    'bg-emerald-500'}`}
            />
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-300 whitespace-nowrap">
              Assistant: {state}
            </span>
          </div>
        </div>

        {/* Avatar Orb Container - centered in the middle of space */}
        <div className="flex-1 flex items-center justify-center w-full min-h-0">
          <Avatar state={state} />
        </div>

        {/* Footer Guidance */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full text-center px-4 pointer-events-none z-30">
          <motion.p
            animate={{ opacity: state === 'idle' ? 0.6 : 0.2 }}
            className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.25em]"
          >
            {state === 'idle' ? 'Click anywhere to start talking' :
              state === 'listening' ? 'Listening...' :
                state === 'thinking' ? 'Thinking...' :
                  'Speaking...'}
          </motion.p>
        </div>
      </div>

      {/* Sidebar Transcript (Right) */}
      <aside className="w-[320px] lg:w-[400px] flex-shrink-0 relative z-20">
        <TranscriptPanel messages={transcript} />
      </aside>
    </main>
  );
}
