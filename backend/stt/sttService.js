async function speechToText(audioBuffer) {
    console.log(`[STT] Received ${audioBuffer.length} audio chunks`);
  
    return "mock transcript";
  }
  
  module.exports = { speechToText };