"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceWebSocket, AgentState, TranscriptMessage, WebSocketMessage } from '@/lib/websocket';
import { startAudio } from '@/lib/audioManager';
import { TTSPlayer } from '@/lib/ttsPlayer';

export function useVoiceAgent() {
    const [state, setState] = useState<AgentState>("idle");
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
    const [metrics, setMetrics] = useState<any[]>([]);
    const [isAudioStarted, setIsAudioStarted] = useState(false);

    const wsRef = useRef<VoiceWebSocket | null>(null);
    const ttsPlayerRef = useRef<TTSPlayer | null>(null);
    const stopAudioRef = useRef<(() => void) | null>(null);

    const handleMessage = useCallback((msg: WebSocketMessage) => {
        switch (msg.type) {
            case "state":
                if (msg.value) setState(msg.value);
                break;

            case "transcript_user":
                if (msg.text) {
                    setTranscript(prev => {
                        const last = prev[prev.length - 1];
                        // If last message is a user message and was interim, replace its text
                        if (last && last.role === "user" && (last as any).isInterim) {
                            const newTranscript = [...prev.slice(0, -1), { role: "user", text: msg.text!, isInterim: msg.isInterim } as any];
                            return newTranscript;
                        }
                        // Otherwise append a new user message
                        return [...prev, { role: "user", text: msg.text!, isInterim: msg.isInterim } as any];
                    });
                }
                break;

            case "transcript_assistant":
                if (msg.text) {
                    setTranscript(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === "assistant") {
                            return [...prev.slice(0, -1), { role: "assistant", text: msg.text! }];
                        }
                        return [...prev, { role: "assistant", text: msg.text! }];
                    });
                }
                break;

            case "metrics":
                if (msg.data && msg.turnId !== undefined) {
                    setMetrics(prev => [{ turnId: msg.turnId, ...msg.data }, ...prev].slice(0, 10));
                }
                break;

            case "barge_in":
                ttsPlayerRef.current?.stopAll();
                break;

            case "tts_audio_full":
                if (msg.payload) {
                    ttsPlayerRef.current?.handleFullAudio(msg.payload);
                }
                break;

            case "session_started":
                console.log("[SESSION] Started:", msg.sessionId);
                break;
        }
    }, []);

    const activateAudio = useCallback(async () => {
        if (isAudioStarted || !wsRef.current) return;

        try {
            // Initialize TTS Player
            const player = new TTSPlayer();
            await player.init();
            player.onComplete = () => {
                if (wsRef.current) {
                    wsRef.current.send({ type: "playback_complete" });
                }
            };
            ttsPlayerRef.current = player;

            // Start microphone streaming
            const { stop } = await startAudio((pcm16) => {
                if (wsRef.current) {
                    wsRef.current.sendRaw(pcm16);
                }
            });

            stopAudioRef.current = stop;
            setIsAudioStarted(true);
            console.log("[AUDIO] System activated");
        } catch (err) {
            console.error("[AUDIO] Activation failed:", err);
        }
    }, [isAudioStarted]);

    useEffect(() => {
        // Use production URL if defined, otherwise fallback to localhost for dev
        const BACKEND_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://ai-voice-qtky.onrender.com";

        console.log(`[WS] Connecting to: ${BACKEND_URL}`);
        const ws = new VoiceWebSocket(BACKEND_URL, handleMessage);
        ws.connect();
        wsRef.current = ws;

        return () => {
            ws.close();
            if (stopAudioRef.current) stopAudioRef.current();
        };
    }, [handleMessage]);

    return {
        state,
        transcript,
        metrics,
        isAudioStarted,
        activateAudio
    };
}
