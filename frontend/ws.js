
import { startAudio, stopAudio } from "./audio.js";

export function initWebSocket() {
  const ws = new WebSocket("ws://localhost:8080");

  ws.onopen = () => {
    console.log("[WS] Connected to voice server");
    startAudio(ws);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "session_started") {
      console.log("[SESSION] Session ID:", msg.sessionId);
    }
  };

  ws.onclose = () => {
    console.log("[WS] Disconnected from server");
    stopAudio();
  };

  ws.onerror = (err) => {
    console.error("[WS] Error:", err);
  };
}