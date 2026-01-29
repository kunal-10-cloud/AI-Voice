"use client";

import React from 'react';
import { Activity, Clock, Cpu, MessageSquare, Zap, AlertCircle } from 'lucide-react';

interface MetricEntry {
    turnId: number;
    sttLatencyMs: number;
    llmTtftMs: number;
    llmTotalMs: number;
    ttsLatencyMs: number;
    e2eLatencyMs: number;
    bargeIn: boolean;
}

interface MetricsPanelProps {
    metrics: MetricEntry[];
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
    return (
        <div className="flex h-full w-[300px] flex-col border-r border-white/5 bg-slate-900/50 backdrop-blur-xl">
            <div className="flex items-center gap-2 border-b border-white/5 p-4">
                <Activity className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">Metrics Dashboard</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {metrics.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                        <Clock className="h-8 w-8 opacity-20" />
                        <p className="text-xs font-mono">Waiting for metrics...</p>
                    </div>
                ) : (
                    metrics.map((m) => (
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
        </div>
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

export default MetricsPanel;
