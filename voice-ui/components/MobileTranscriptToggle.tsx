"use client";

import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TranscriptMessage } from '@/lib/websocket';

interface MobileTranscriptToggleProps {
    messages: TranscriptMessage[];
}

const MobileTranscriptToggle: React.FC<MobileTranscriptToggleProps> = ({ messages }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-full border border-white/10 backdrop-blur-xl shadow-2xl hover:bg-white/10 transition-colors"
            >
                <MessageSquare className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-300">
                    {messages.length > 0 ? `${messages.length} msgs` : 'Transcript'}
                </span>
            </button>

            {/* Mobile Transcript Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm max-h-[70vh] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-blue-400" />
                                    <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">Live Transcript</h2>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X className="h-4 w-4 text-slate-400" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto p-4 space-y-3 max-h-[50vh]">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-slate-500 space-y-2">
                                        <div className="w-10 h-10 rounded-full border border-dashed border-white/30" />
                                        <p className="text-xs font-mono">No messages yet...</p>
                                    </div>
                                ) : (
                                    messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm
                                                    ${msg.role === 'user'
                                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                                                    }
                                                    ${msg.isInterim ? 'opacity-70 italic' : ''}`}
                                            >
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default MobileTranscriptToggle;
