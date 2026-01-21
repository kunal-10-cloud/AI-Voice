class VAD {
    constructor() {
      this.speechThreshold = 0.01;
      this.silenceFrames = 0;
      this.speaking = false;
  
      this.SILENCE_LIMIT = 6; 
    }
  
    process(frame) {
      let energy = 0;
      for (let i = 0; i < frame.length; i++) {
        energy += frame[i] * frame[i];
      }
      energy /= frame.length;
  
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