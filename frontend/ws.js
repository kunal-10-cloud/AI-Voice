
import { startAudio, stopAudio } from "./audio.js";
import { TTSPlayer } from "./ttsPlayer.js";

let ttsPlayer;

export function initWebSocket() {
  const ws = new WebSocket("ws://localhost:8080");
  ttsPlayer = new TTSPlayer();

  ws.onopen = () => {
    console.log("[WS] Connected to voice server");

    // Initialize TTS player on user interaction
    document.body.addEventListener("click", () => {
      ttsPlayer.init();
    }, { once: true });

    startAudio(ws);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "session_started") {
      console.log("[SESSION] Session ID:", msg.sessionId);
    }
    else if (msg.type === "tts_audio_full") {
      // Handle full WAV sentence
      ttsPlayer.handleFullAudio(msg.payload);
    }
    else if (msg.type === "tts_complete") {
      // Handle TTS completion
      ttsPlayer.handleComplete(msg.requestId);
    }
    else if (msg.type === "barge_in") {
      // Handle barge-in: immediately stop TTS playback
      ttsPlayer.stopAll();
    }
  };

  ws.onclose = () => {
    console.log("[WS] Disconnected from server");
    stopAudio();
    ttsPlayer.stopAll();
  };

  ws.onerror = (err) => {
    console.error("[WS] Error:", err);
  };
}