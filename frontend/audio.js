let audioContext = null;
let processor = null;

export async function startAudio(ws) {
    try {
      audioContext = new AudioContext({ sampleRate: 16000 });
      await audioContext.resume();
  
      console.log("[AUDIO] AudioContext state:", audioContext.state);
  
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[AUDIO] Microphone permission granted");
  
      const source = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);
  
      source.connect(processor);
      processor.connect(audioContext.destination);
  
      processor.onaudioprocess = (event) => {
        console.log("[AUDIO] onaudioprocess fired");
  
        const floatData = event.inputBuffer.getChannelData(0);
        const pcm16 = float32ToPCM16(floatData);
        ws.send(pcm16);
  
        console.log("[AUDIO] Sent audio chunk:", pcm16.byteLength);
      };
  
      console.log("[AUDIO] Audio processing started");
    } catch (err) {
      console.error("[AUDIO] Failed to start audio:", err);
    }
  }
/**
 * Stops microphone capture
 */
export function stopAudio() {
  if (processor) {
    processor.disconnect();
    processor = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  console.log("[AUDIO] Microphone streaming stopped");
}


function float32ToPCM16(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}