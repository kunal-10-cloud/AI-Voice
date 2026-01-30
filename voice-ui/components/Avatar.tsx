"use client";

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { AgentState } from '@/lib/websocket';

interface AvatarProps {
    state: AgentState;
}

export default function Avatar({ state }: AvatarProps) {
    // Define animation variants based on state
    const variants: Variants = {
        idle: {
            scale: 1,
            opacity: 0.6,
            boxShadow: "0px 0px 0px rgba(59, 130, 246, 0)",
        },
        listening: {
            scale: [1, 1.08, 1],
            opacity: 1,
            boxShadow: [
                "0px 0px 20px rgba(59, 130, 246, 0.4)",
                "0px 0px 60px rgba(59, 130, 246, 0.7)",
                "0px 0px 20px rgba(59, 130, 246, 0.4)",
            ],
            transition: {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
            },
        },
        thinking: {
            scale: 1.05,
            opacity: 1,
            boxShadow: [
                "0px 0px 30px rgba(139, 92, 246, 0.4)",
                "0px 0px 50px rgba(139, 92, 246, 0.6)",
                "0px 0px 30px rgba(139, 92, 246, 0.4)",
            ],
            transition: {
                boxShadow: { duration: 1, repeat: Infinity, ease: "easeInOut" },
            },
        },
        speaking: {
            scale: [1, 1.1, 0.98, 1.05, 1],
            opacity: 1,
            boxShadow: [
                "0px 0px 20px rgba(16, 185, 129, 0.4)",
                "0px 0px 70px rgba(16, 185, 129, 0.8)",
                "0px 0px 20px rgba(16, 185, 129, 0.4)",
            ],
            transition: {
                duration: 0.8,
                repeat: Infinity,
                ease: "easeInOut",
            },
        },
    };

    return (
        <div className="flex items-center justify-center">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-64 lg:h-64">
                {/* Outer Glow */}
                <AnimatePresence>
                    {state !== "idle" && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1.2 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={`absolute -inset-6 sm:-inset-8 md:-inset-10 rounded-full blur-2xl sm:blur-3xl ${state === "speaking" ? "bg-emerald-500/20" :
                                state === "thinking" ? "bg-purple-500/20" :
                                    "bg-blue-500/20"
                                }`}
                        />
                    )}
                </AnimatePresence>

                {/* Main Avatar Orb */}
                <motion.div
                    animate={state}
                    variants={variants}
                    className={`w-full h-full rounded-full flex items-center justify-center relative z-10 
            ${state === "idle" ? "bg-slate-800" :
                            state === "listening" ? "bg-blue-500" :
                                state === "thinking" ? "bg-purple-500" :
                                    "bg-emerald-500"
                        } 
            transition-colors duration-700 shadow-2xl overflow-hidden`}
                >
                    {/* Internal Shine Component */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_70%)]" />

                    {/* Inner Pulse for Listening */}
                    {state === "listening" && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.1, 0.3, 0.1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="absolute inset-1 sm:inset-2 rounded-full bg-blue-300/20 blur-md"
                        />
                    )}

                    {/* Rhythmic Ring for Speaking */}
                    {state === "speaking" && (
                        <motion.div
                            animate={{ scale: [0.8, 1.2], opacity: [0.6, 0] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            className="absolute inset-0 border-[2px] sm:border-[3px] border-white/40 rounded-full"
                        />
                    )}

                    {/* Advanced Thinking Spinner */}
                    {state === "thinking" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                className="w-2/5 h-2/5 sm:w-1/2 sm:h-1/2 border-t-2 border-r-2 border-white/60 rounded-full"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute w-1/4 h-1/4 sm:w-1/3 sm:h-1/3 bg-white/20 rounded-full blur-xl"
                            />
                        </div>
                    )}

                    {/* Mobile-friendly state indicators */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] text-white/80 font-bold uppercase tracking-widest">
                        {state === "idle" ? "" : state}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
