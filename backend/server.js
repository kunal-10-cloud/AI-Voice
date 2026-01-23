require("dotenv").config();
const WebSocket = require("ws");

const SessionManager = require("./sessions/SessionManager");
const { speechToText } = require("./stt/sttService");
const { generateResponse } = require("./llm/llmService");

const PORT = 8080;
const TURN_END_SILENCE_MS = 800;
const TURN_CHECK_INTERVAL_MS = 200;

const wss = new WebSocket.Server({ port: PORT });
const sessionManager = new SessionManager();

console.log(`Voice Agent WebSocket server running on :${PORT}`);

/**
 * Handle one completed user turn:
 * Audio → STT → LLM
 */
async function handleUserTurn(session) {
  const audioChunks = session.currentTurnAudio;
  session.currentTurnAudio = [];

  if (!audioChunks || audioChunks.length === 0) {
    console.log("[TURN] Empty turn, skipping");
    return;
  }

  console.log(`[STT] Processing ${audioChunks.length} audio chunks`);

  try {
    const transcript = await speechToText(audioChunks);

    if (!transcript) {
      console.log(`[USER SAID] (${session.sessionId}): <empty>`);
      return;
    }

    console.log(`[USER SAID] (${session.sessionId}): ${transcript}`);

    const messages = [
      {
        role: "system",
        content: "You are a helpful, concise voice assistant.",
      },
      {
        role: "user",
        content: transcript,
      },
    ];

    const llmResponse = await generateResponse({ messages });

    console.log(`[LLM RESPONSE] (${session.sessionId}): ${llmResponse}`);
  } catch (err) {
    console.error("[TURN] Failed to process user turn:", err.message);
  }
}

/**
 * WebSocket connection handler
 */
wss.on("connection", (ws) => {
  const session = sessionManager.createSession();

  ws.send(
    JSON.stringify({
      type: "session_started",
      sessionId: session.sessionId,
    })
  );

  ws.on("message", (data) => {
    session.lastAudioTimestamp = Date.now();

    // Use VAD as the authoritative signal for speech_start
    const vadStatus = session.vad.process(data);

    if (vadStatus === "speech_start" && !session.isSpeaking) {
      session.isSpeaking = true;
      session.currentTurnAudio = [];
      console.log(`[TURN] Speech started (${session.sessionId})`);
    }

    // Only collect audio if we are in the SPEAKING state
    if (session.isSpeaking) {
      session.currentTurnAudio.push(data);
    }

    // VAD-triggered end (Clean completion)
    if (vadStatus === "speech_end" && session.isSpeaking) {
      finalizeTurn(session);
    }
  });

  ws.on("close", () => {
    sessionManager.deleteSession(session.sessionId);
    console.log(`Session closed: ${session.sessionId}`);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
    sessionManager.deleteSession(session.sessionId);
  });
});

/**
 * Cleanly end a turn and trigger processing
 */
async function finalizeTurn(session) {
  if (!session.isSpeaking) return;

  session.isSpeaking = false;
  console.log(`[TURN] Speech ended (${session.sessionId})`);
  await handleUserTurn(session);
}

/**
 * FALLBACK HEARTBEAT
 * Safely ends turns if VAD misses silence for too long
 */
setInterval(() => {
  const now = Date.now();
  for (const session of sessionManager.getAllSessions()) {
    if (
      session.isSpeaking &&
      now - session.lastAudioTimestamp > TURN_END_SILENCE_MS
    ) {
      console.log(`[TURN] Heartbeat fallback end (${session.sessionId})`);
      finalizeTurn(session);
    }
  }
}, TURN_CHECK_INTERVAL_MS);