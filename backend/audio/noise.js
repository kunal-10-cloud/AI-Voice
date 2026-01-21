class NoiseSuppressor {
    constructor() {
      this.noiseFloor = 0.001;
      this.alpha = 0.95;
    }
  
    suppress(frame) {
      let energy = 0;
      for (let i = 0; i < frame.length; i++) {
        energy += frame[i] * frame[i];
      }
      energy /= frame.length;
  
      this.noiseFloor =
        this.alpha * this.noiseFloor + (1 - this.alpha) * energy;
  
      if (energy < this.noiseFloor * 1.2) {
        return new Float32Array(frame.length);
      }
  
      return frame;
    }
  }
  
  module.exports = NoiseSuppressor;