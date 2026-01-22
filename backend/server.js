
const WebSocket = require("ws");
const SessionManager = require("./sessions/SessionManager");
const { speechToText } = require("./stt/sttService");

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });
const sessionManager = new SessionManager();

console.log(` Voice Agent WebSocket server running on :${PORT}`);

wss.on("connection", (ws) => {
  const session = sessionManager.createSession();
  console.log(" New session created:", session.sessionId);

  ws.send(JSON.stringify({
    type: "session_started",
    sessionId: session.sessionId
  }));

  ws.on("message", async (data) => {
    try {
      const floatFrame = new Float32Array(data.length / 2);
      for (let i = 0; i < floatFrame.length; i++) {
        floatFrame[i] = data.readInt16LE(i * 2) / 32768;
      }
      const cleanFrame = session.noise.suppress(floatFrame);
      const vadEvent = session.vad.process(cleanFrame);
      if (session.isSpeaking) {
        session.currentTurnAudio.push(Buffer.from(data));
      }

      if (vadEvent === "speech_start") {
        session.isSpeaking = true;
        session.currentTurnAudio = [];
        console.log(`[TURN] Speech started (${session.sessionId})`);
      }

      if (vadEvent === "speech_end") {
        session.isSpeaking = false;
        console.log(`[TURN] Speech ended (${session.sessionId})`);

        await handleUserTurn(session);
      }

    } catch (err) {
      console.error(" Error processing audio:", err);
    }
  });

  ws.on("close", () => {
    console.log(" Session closed:", session.sessionId);
    sessionManager.deleteSession(session.sessionId);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
    sessionManager.deleteSession(session.sessionId);
  });
});
async function handleUserTurn(session) {
  const audioChunks = session.currentTurnAudio;
  session.currentTurnAudio = [];

  if (!audioChunks || audioChunks.length === 0) {
    console.log("[TURN] Empty turn, ignoring");
    return;
  }

  console.log(`[STT] Processing ${audioChunks.length} audio chunks`);

  try {
    const transcript = await speechToText(audioChunks);
    console.log(`[USER SAID] (${session.sessionId}):`, transcript);
  } catch (err) {
    console.error("[STT] Failed to transcribe:", err);
  }
}