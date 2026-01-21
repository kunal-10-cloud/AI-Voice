
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
    session.lastAudioTimestamp = Date.now();

    console.log(
      `[AUDIO] Session ${session.sessionId} received chunk (${data.length} bytes)`
    );
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