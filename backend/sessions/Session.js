class Session {
    constructor(sessionId) {
      this.sessionId = sessionId;
      this.audioBuffer = [];
      this.isSpeaking = false;
      this.lastAudioTimestamp = Date.now();
      this.context = {};
    }
  }
  
  module.exports = Session;