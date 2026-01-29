require("dotenv").config();
const http = require("http");
const WebSocket = require("ws");

const SessionManager = require("./sessions/SessionManager");
const { createStreamingSTT } = require("./stt/sttService");
const { generateResponse } = require("./llm/llmService");
const { webSearch } = require("./tools/webSearch");
const { streamTTS } = require("./tts/ttsService");

const PORT = 8080;
const TURN_END_SILENCE_MS = 800;
const TURN_CHECK_INTERVAL_MS = 200;

// 1. Create HTTP Server for Admin API
const server = http.createServer((req, res) => {
  // Add CORS headers for all requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Admin API: POST /admin/context
  if (req.method === "POST" && req.url === "/admin/context") {
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const { sessionId, content } = JSON.parse(body);

        if (!sessionId || !content) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing sessionId or content" }));
          return;
        }

        const session = sessionManager.getSession(sessionId);
        if (!session) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Session not found" }));
          return;
        }

        // Apply Context Update Atomicially
        session.dynamicContext = [{ role: "system", content: content.trim() }];
        session.contextVersion++;
        console.log(`[CONTEXT] Session ${session.sessionId}: updated (v${session.contextVersion}) via ADMIN API`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, version: session.contextVersion }));

      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  // Health Check
  if (req.url === "/health") {
    res.writeHead(200);
    res.end("OK");
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

// 2. Attach WebSocket Server to HTTP Server
const wss = new WebSocket.Server({ server });
const sessionManager = new SessionManager();

console.log(`Voice Agent Server (HTTP + WS) running on :${PORT}`);

/**
 * Intent Gating Logic: Only trigger search for specific, time-sensitive queries.
 */
function shouldTriggerSearch(query) {
  const q = query.toLowerCase();

  // 1. Skip definitional/vague questions
  const skipPatterns = [
    /^what is [a-z]+$/, // e.g., "what is weather"
    /^explain [a-z]+$/,  // e.g., "explain weather"
    /^is [a-z]+$/,
    /what about the [a-z]+$/ // e.g., "what about the weather"
  ];
  if (skipPatterns.some(p => p.test(q))) return false;

  // 2. Identify time-sensitive or external entity keywords
  const keywords = ["today", "latest", "current", "news", "now", "weather", "stock", "price", "ceo", "score"];
  const hasKeyword = keywords.some(k => q.includes(k));

  // 3. Stricter Specificity Check: Has keyword AND isn't just a basic question
  // e.g. "what is the weather today" (4 words including "today")
  // vs "weather in pune" (3 words including "pune")
  const words = q.split(/\s+/).filter(w => !["what", "is", "the", "about", "a", "an"].includes(w));

  return hasKeyword && words.length >= 2;
}

/**
 * Handle one completed user turn:
 * Uses session.finalTranscript accumulated during streaming.
 */
async function handleUserTurn(session) {
  const transcript = session.finalTranscript.trim();

  // Reset transcript buffers for next turn immediately to avoid leakage
  session.finalTranscript = "";
  session.interimTranscript = "";

  if (!transcript) {
    console.log(`[USER SAID] (${session.sessionId}): <empty> (Skipping turn)`);
    // Authority: Return to idle if nothing was said
    if (session.ws && session.ws.readyState === 1) {
      session.ws.send(JSON.stringify({ type: "state", value: "idle" }));
    }
    return;
  }

  console.log(`[STT FINAL COMMIT] (${session.sessionId}): ${transcript}`);

  // STT Metric
  session.sttFinishTime = Date.now();
  session.turnId++;

  try {
    // 1. Append user transcript to history
    session.messages.push({ role: "user", content: transcript });

    // Memory bounding: keep only last 12 entries
    if (session.messages.length > 12) {
      session.messages = session.messages.slice(-12);
    }

    // 2. SEARCH DECISION (Call 1)
    const decisionPrompt = {
      role: "system",
      content: "Analyze the user query. If it requires real-time facts (weather, news, stocks) and specifies a subject or location, respond ONLY with valid JSON: { \"search\": true, \"query\": \"...\" }. If it is a general question, definition, or skip-able, respond { \"search\": false }."
    };

    // Inject Dynamic Context for Decision
    const messagesForDecision = [
      decisionPrompt,
      ...session.dynamicContext,
      ...session.messages
    ];
    console.log(`[MEMORY] Session ${session.sessionId}: sending ${messagesForDecision.length} messages to decision LLM`);

    const decisionResponse = await generateResponse({ messages: messagesForDecision });

    let decision = { search: false };
    try {
      decision = JSON.parse(decisionResponse);
    } catch (e) {
      console.log(`[SEARCH] Session ${session.sessionId}: decision parse failed, defaulting to skip`);
    }

    let searchContent = null;

    // 3. FINAL SEARCH GATE
    if (decision.search && shouldTriggerSearch(decision.query)) {
      console.log(`[SEARCH] Session ${session.sessionId}: triggered for query "${decision.query}"`);
      const results = await webSearch(decision.query);
      searchContent = JSON.stringify(results);
    } else {
      console.log(`[SEARCH] Session ${session.sessionId}: skipped (intent not met or decision false)`);
    }

    // 4. FINAL RESPONSE (Call 2)
    const mainSystemPrompt = {
      role: "system",
      content: "You are a helpful voice assistant. Keep your responses conversational and concise."
    };

    // Inject Dynamic Context for Final Response (Priority: System -> Dynamic -> History)
    const finalMessages = [
      mainSystemPrompt,
      ...session.dynamicContext,
      ...session.messages
    ];

    // Inject EPHEMERAL search results if available
    if (searchContent) {
      finalMessages.push({
        role: "system",
        content: `Grounded search results for current context: ${searchContent}`
      });
    }

    session.llmTtftTime = Date.now();
    const finalResponse = await generateResponse({ messages: finalMessages });

    // 5. FINALIZE: save only assistant content to history
    session.llmFinishTime = Date.now();
    session.messages.push({ role: "assistant", content: finalResponse });
    console.log(`[LLM RESPONSE] (${session.sessionId}): ${finalResponse}`);

    // 6. STREAM TTS
    if (session.ws && session.ws.readyState === 1) {
      session.ws.send(JSON.stringify({ type: "state", value: "speaking" }));
      session.ws.send(JSON.stringify({ type: "transcript_assistant", text: finalResponse }));
    }
    await streamTTS(finalResponse, session, session.ws);

    // 7. EMIT METRICS
    if (session.ws && session.ws.readyState === 1) {
      const sttLatency = session.sttFinishTime - session.turnStartTime;
      const llmTtft = session.llmTtftTime ? (session.llmTtftTime - session.sttFinishTime) : 0;
      const llmTotal = session.llmFinishTime - session.sttFinishTime;
      const ttsLatency = session.ttsFirstChunkTime ? (session.ttsFirstChunkTime - session.llmFinishTime) : 0;
      const e2eLatency = (session.ttsFirstChunkTime || Date.now()) - session.turnStartTime;

      session.ws.send(JSON.stringify({
        type: "metrics",
        turnId: session.turnId,
        data: {
          sttLatencyMs: sttLatency,
          llmTtftMs: llmTtft,
          llmTotalMs: llmTotal,
          ttsLatencyMs: ttsLatency,
          e2eLatencyMs: e2eLatency,
          bargeIn: session.hasBargeIn
        }
      }));
      // Reset flags
      session.hasBargeIn = false;
    }

  } catch (err) {
    console.error("[TURN] Failed to process user turn:", err.message);
  }
}

/**
 * WebSocket connection handler
 */
wss.on("connection", (ws) => {
  const session = sessionManager.createSession();
  session.ws = ws; // Store client WS for TTS streaming
  console.log(`[SERVER] New Session Created: ${session.sessionId}`);

  ws.send(
    JSON.stringify({
      type: "session_started",
      sessionId: session.sessionId,
    })
  );

  // Initialize Deepgram connection IMMEDIATELY
  session.sttSocket = createStreamingSTT(session);

  ws.on("message", (data) => {
    // 1. Handle JSON Control Messages (Context Updates) - KEEPING WS SUPPORT FOR COMPLETENESS
    if (!Buffer.isBuffer(data)) {
      try {
        const message = JSON.parse(data);
        if (message.type === "context_update") {
          const content = message.payload?.content;

          if (!content || typeof content !== "string" || !content.trim()) {
            console.log(`[CONTEXT] Session ${session.sessionId}: update ignored (invalid payload)`);
            return;
          }

          // Atomic Replace-by-Default
          session.dynamicContext = [{ role: "system", content: content.trim() }];
          session.contextVersion++;

          console.log(`[CONTEXT] Session ${session.sessionId}: updated (v${session.contextVersion}) via WS`);
        }
        if (message.type === "debug_input") { // Added debug text input for testing
          session.finalTranscript = message.text || "";
          finalizeTurn(session);
        }
        if (message.type === "playback_complete") {
          console.log(`[TTS] Client finished playback (${session.sessionId})`);
          session.isSpeakingTTS = false;
          // Authority: Now that audio is done, we can go idle
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: "state", value: "idle" }));
          }
        }
      } catch (e) {
        // Ignore non-JSON text messages if any
      }
      return;
    }

    // 2. Handle Binary Audio Data
    session.lastAudioTimestamp = Date.now();
    const vadStatus = session.vad.process(data);

    // Stream ALL audio to Deepgram if socket is open (Always-On)
    if (session.sttSocket && session.sttSocket.readyState === WebSocket.OPEN) {
      session.sttSocket.send(data);
    }

    if (vadStatus === "speech_start" && !session.isSpeaking) {
      session.isSpeaking = true;
      console.log(`[TURN] Speech started (${session.sessionId})`);

      // Emit listening state to UI
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "state", value: "listening" }));
      }

      // HARD BARGE-IN: Invalidate all existing TTS
      session.ttsRequestId += 1;
      session.isSpeakingTTS = false;

      if (session.ttsSocket) {
        try {
          session.ttsSocket.close();
        } catch (e) { }
        session.ttsSocket = null;
      }

      // Send barge-in control message to frontend
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "barge_in" }));
      }

      session.hasBargeIn = true;
      console.log(`[TTS] Hard cancel triggered (requestId=${session.ttsRequestId})`);

      // Reset buffers for clean turn start
      session.finalTranscript = "";
      session.interimTranscript = "";
    }

    if (vadStatus === "speech_end" && session.isSpeaking) {
      finalizeTurn(session);
    }
  });

  ws.on("close", () => {
    if (session.sttSocket) session.sttSocket.close();
    sessionManager.deleteSession(session.sessionId);
    console.log(`Session closed: ${session.sessionId}`);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
    if (session.sttSocket) session.sttSocket.close();
    sessionManager.deleteSession(session.sessionId);
  });
});

async function finalizeTurn(session) {
  // If simulated by debug_input, force isSpeaking to treat as turn end
  // But normally isSpeaking is imperative.
  // For debug logic, we just call handleUserTurn directly.

  // Normal VAD buffer flush logic for real audio
  if (session.isSpeaking) {
    session.isSpeaking = false;
    session.turnStartTime = Date.now();
    console.log(`[TURN] Speech ended (${session.sessionId})`);

    // Immediately tell the UI we are thinking to bridge the gap
    if (session.ws && session.ws.readyState === 1) {
      session.ws.send(JSON.stringify({ type: "state", value: "thinking" }));
    }

    // Small delay to ensure Deepgram's final results are processed
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  await handleUserTurn(session);
}

// Start Server
server.listen(PORT, () => {
  // console.log(`Voice Agent Server running on http://localhost:${PORT}`); -- logged above
});

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
const https = require("https");
// Self-ping to keep Render instance alive (every 5 minutes)
const RENDER_EXTERNAL_URL = "https://ai-voice-qtky.onrender.com/health";
setInterval(() => {
  https.get(RENDER_EXTERNAL_URL, (res) => {
    console.log(`[SELF-PING] Status: ${res.statusCode}`);
  }).on("error", (err) => {
    console.log(`[SELF-PING] Failed: ${err.message}`);
  });
}, 300000); // 5 minutes (300,000 ms)
