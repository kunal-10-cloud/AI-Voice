
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
    this.ws = null;                 // Client WebSocket for TTS streaming
  }
}

module.exports = Session;