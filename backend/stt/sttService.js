const WebSocket = require("ws");
const { cleanTranscript } = require("../utils/transcriptHelper");

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&interim_results=true&model=nova-2";

/**
 * Initialize a Deepgram Streaming connection for a session.
 */
function createStreamingSTT(session) {
  const socket = new WebSocket(DEEPGRAM_WS_URL, {
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
    },
  });

  socket.on("open", () => {
    console.log(`[STT] Deepgram connection opened (${session.sessionId})`);
  });

  socket.on("message", (data) => {
    try {
      const response = JSON.parse(data);
      const transcript = response.channel?.alternatives?.[0]?.transcript || "";

      if (!transcript || transcript.length < 2) return;

      if (response.is_final === false) {
        // Unstable interim result: replace
        session.interimTranscript = transcript;
        console.log(`[STT INTERIM] ${transcript}`);

        // Emit interim to UI
        if (session.ws && session.ws.readyState === 1) {
          session.ws.send(JSON.stringify({ type: "transcript_user", text: transcript, isInterim: true }));
        }
      } else if (response.is_final === true) {
        // Stable final result: clean and append
        const cleaned = cleanTranscript(transcript);
        if (cleaned) {
          session.finalTranscript = (session.finalTranscript + " " + cleaned).trim();
          session.interimTranscript = ""; // Clear interim as it's now final
          console.log(`[STT FINAL] ${cleaned}`);

          // Emit final to UI
          if (session.ws && session.ws.readyState === 1) {
            session.ws.send(JSON.stringify({ type: "transcript_user", text: cleaned, isInterim: false }));
          }
        }
      }
    } catch (err) {
      console.error("[STT] Failed to parse Deepgram message:", err.message);
    }
  });

  socket.on("close", () => {
    console.log(`[STT] Deepgram connection closed (${session.sessionId})`);
  });

  socket.on("error", (err) => {
    console.error("[STT] Deepgram error:", err.message);
  });

  return socket;
}

module.exports = { createStreamingSTT };