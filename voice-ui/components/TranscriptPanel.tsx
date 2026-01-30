"use client";

import { useEffect, useRef } from 'react';
import { TranscriptMessage } from '@/lib/websocket';
import { motion, AnimatePresence } from 'framer-motion';

interface TranscriptPanelProps {
    messages: TranscriptMessage[];
}

export default function TranscriptPanel({ messages }: TranscriptPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="w-full h-full flex flex-col bg-slate-900/50 border-l border-white/10 overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-white/10">
                <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-400">Live Transcript</h2>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scroll-smooth"
            >
                <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[75%] sm:max-w-[85%] rounded-2xl px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm leading-relaxed shadow-sm
                  ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                                    }
                  ${msg.isInterim ? 'opacity-70 italic' : ''}`}
                            >
                                {msg.text}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center space-y-2 opacity-30">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-dashed border-white/30" />
                        <p className="text-[10px] sm:text-xs text-slate-500">No activity yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}
