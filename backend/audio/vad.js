class VAD {
  constructor() {
    this.speechThreshold = 0.005; // Slightly lower threshold for raw PCM
    this.silenceFrames = 0;
    this.speaking = false;
    this.SILENCE_LIMIT = 8; // ~1.6s if frames are 200ms
  }

  /**
   * Process a frame of audio
   * @param {Buffer|Float32Array} frame - The audio frame
   * @returns {string|null} - "speech_start", "speech_end", or null
   */
  process(frame) {
    let samples;

    if (Buffer.isBuffer(frame)) {
      // Convert PCM16 Buffer to Float32Array
      samples = new Float32Array(frame.length / 2);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = frame.readInt16LE(i * 2) / 32768.0;
      }
    } else {
      samples = frame;
    }

    let energy = 0;
    for (let i = 0; i < samples.length; i++) {
      energy += samples[i] * samples[i];
    }
    energy /= samples.length || 1;

    if (energy > this.speechThreshold) {
      this.silenceFrames = 0;
      if (!this.speaking) {
        this.speaking = true;
        return "speech_start";
      }
    } else {
      this.silenceFrames++;
      if (this.speaking && this.silenceFrames > this.SILENCE_LIMIT) {
        this.speaking = false;
        return "speech_end";
      }
    }

    return null;
  }
}

module.exports = VAD;