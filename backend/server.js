
const WebSocket = require("ws");
const SessionManager = require("./sessions/SessionManager");

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

  ws.on("message", (data) => {
    session.audioBuffer.push(data);
    
    const floatFrame = new Float32Array(data.length / 2);
    for (let i = 0; i < floatFrame.length; i++) {
      floatFrame[i] = data.readInt16LE(i * 2) / 32768;
    }
  
    const cleanFrame = session.noise.suppress(floatFrame);
    const vadEvent = session.vad.process(cleanFrame);
  
    if (vadEvent === "speech_start") {
      console.log(`[VAD] Speech started (${session.sessionId})`);
    }
  
    if (vadEvent === "speech_end") {
      console.log(`[VAD] Speech ended (${session.sessionId})`);
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