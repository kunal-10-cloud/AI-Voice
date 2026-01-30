"use client";

import React, { useState } from 'react';
import { Activity, Clock, Cpu, MessageSquare, Zap, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MetricEntry {
    turnId: number;
    sttLatencyMs: number;
    llmTtftMs: number;
    llmTotalMs: number;
    ttsLatencyMs: number;
    e2eLatencyMs: number;
    bargeIn: boolean;
}

interface MobileMetricsToggleProps {
    metrics: MetricEntry[];
}

const MobileMetricsToggle: React.FC<MobileMetricsToggleProps> = ({ metrics }) => {
    const [isOpen, setIsOpen] = useState(false);

    const latestMetric = metrics[metrics.length - 1];

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
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-300">
                    {latestMetric ? `${latestMetric.e2eLatencyMs}ms` : 'Metrics'}
                </span>
            </button>

            {/* Mobile Metrics Modal */}
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
                                    <Activity className="h-4 w-4 text-blue-400" />
                                    <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">Metrics Dashboard</h2>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X className="h-4 w-4 text-slate-400" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto p-4 space-y-4 max-h-[50vh]">
                                {metrics.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-slate-500 space-y-2">
                                        <Clock className="h-8 w-8 opacity-20" />
                                        <p className="text-xs font-mono">Waiting for metrics...</p>
                                    </div>
                                ) : (
                                    [...metrics].reverse().map((m) => (
                                        <div key={m.turnId} className="group rounded-lg border border-white/5 bg-slate-950/40 p-3 transition-colors hover:bg-slate-950/60">
                                            <div className="mb-2 flex items-center justify-between border-b border-white/5 pb-2">
                                                <span className="text-[10px] font-bold text-blue-400 font-mono">TURN #{m.turnId}</span>
                                                {m.bargeIn && (
                                                    <div className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 border border-amber-500/20">
                                                        <AlertCircle className="h-3 w-3 text-amber-500" />
                                                        <span className="text-[9px] font-bold text-amber-500 uppercase">Barge-in</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-y-2">
                                                <MetricItem label="STT" value={`${m.sttLatencyMs}ms`} icon={<MessageSquare className="h-3 w-3" />} />
                                                <MetricItem label="TTFT" value={`${m.llmTtftMs}ms`} icon={<Zap className="h-3 w-3" />} />
                                                <MetricItem label="LLM" value={`${m.llmTotalMs}ms`} icon={<Cpu className="h-3 w-3" />} />
                                                <MetricItem label="TTS" value={`${m.ttsLatencyMs}ms`} icon={<Activity className="h-3 w-3" />} />
                                            </div>

                                            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                                                <span className="text-[10px] text-slate-500 font-mono uppercase">Total E2E</span>
                                                <span className="text-xs font-bold text-slate-300 font-mono">{m.e2eLatencyMs}ms</span>
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

const MetricItem = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
    <div className="flex items-center gap-2">
        <div className="text-slate-500">{icon}</div>
        <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-tight text-slate-500 font-mono">{label}</span>
            <span className="text-[11px] font-semibold text-slate-300 font-mono leading-none">{value}</span>
        </div>
    </div>
);

export default MobileMetricsToggle;
