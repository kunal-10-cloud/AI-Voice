require("dotenv").config();
const WebSocket = require("ws");

const SessionManager = require("./sessions/SessionManager");
const { speechToText } = require("./stt/sttService");
const { generateResponse } = require("./llm/llmService");
const { webSearch } = require("./tools/webSearch");

const PORT = 8080;
const TURN_END_SILENCE_MS = 800;
const TURN_CHECK_INTERVAL_MS = 200;

const wss = new WebSocket.Server({ port: PORT });
const sessionManager = new SessionManager();

console.log(`Voice Agent WebSocket server running on :${PORT}`);

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
 * Audio → STT → Search Decision → (Optional Search) → Final Response
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

    const messagesForDecision = [decisionPrompt, ...session.messages];
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
      content: "You are a helpful, concise voice assistant. site sources if you use search results."
    };

    const finalMessages = [mainSystemPrompt, ...session.messages];

    // Inject EPHEMERAL search results if available
    if (searchContent) {
      finalMessages.push({
        role: "system",
        content: `Grounded search results for current context: ${searchContent}`
      });
    }

    const finalResponse = await generateResponse({ messages: finalMessages });

    // 5. FINALIZE: save only assistant content to history
    session.messages.push({ role: "assistant", content: finalResponse });
    console.log(`[LLM RESPONSE] (${session.sessionId}): ${finalResponse}`);

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
    const vadStatus = session.vad.process(data);

    if (vadStatus === "speech_start" && !session.isSpeaking) {
      session.isSpeaking = true;
      session.currentTurnAudio = [];
      console.log(`[TURN] Speech started (${session.sessionId})`);
    }

    if (session.isSpeaking) {
      session.currentTurnAudio.push(data);
    }

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

async function finalizeTurn(session) {
  if (!session.isSpeaking) return;
  session.isSpeaking = false;
  console.log(`[TURN] Speech ended (${session.sessionId})`);
  await handleUserTurn(session);
}

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