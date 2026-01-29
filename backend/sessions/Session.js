
const NoiseSuppressor = require("../audio/noise");
const VAD = require("../audio/vad");

class Session {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.audioBuffer = [];
    this.currentTurnAudio = [];
    this.isSpeaking = false;
    this.lastAudioTimestamp = Date.now();
    this.context = {};
    this.noise = new NoiseSuppressor();
    this.vad = new VAD();
    this.messages = []; // Conversation history
    this.interimTranscript = ""; // Unstable, replace-only
    this.finalTranscript = "";   // Stable, append-only
    this.sttSocket = null;       // Deepgram streaming socket
    this.dynamicContext = [];    // Real-time system instructions
    this.contextVersion = 0;     // Incremental version counter

    // TTS State
    this.ttsRequest = null;         // HTTPS request for TTS stream
    this.isSpeakingTTS = false;     // Flag for active TTS
    this.ttsRequestId = 0;          // Counter for race condition prevention
    this.ttsSocket = null;          // Hard cancellation handle
    this.ws = null;                 // Client WebSocket for TTS streaming
    this.lastTTSActivity = 0;       // Timestamp of last sent TTS audio

    // Metrics Tracking
    this.turnId = 0;
    this.turnStartTime = 0;         // Timestamp when speech ends
    this.sttFinishTime = 0;         // Timestamp when STT finalized
    this.llmTtftTime = 0;           // Timestamp of first LLM token
    this.llmFinishTime = 0;         // Timestamp when full response generated
    this.ttsFirstChunkTime = 0;     // Timestamp of first TTS chunk
    this.hasBargeIn = false;        // Flag for current turn
  }
}

module.exports = Session;