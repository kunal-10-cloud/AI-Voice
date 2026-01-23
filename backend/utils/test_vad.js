const VAD = require("../audio/vad");

/**
 * MOCK TEST DATA GENERATOR
 * Returns a Buffer of PCM16 audio
 */
function createFrame(amplitude) {
    const frameSize = 3200; // 200ms at 16kHz
    const buf = Buffer.alloc(frameSize * 2);
    for (let i = 0; i < frameSize; i++) {
        const sample = Math.sin(i * 0.1) * amplitude * 32767;
        buf.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
    }
    return buf;
}

const vad = new VAD();

console.log("--- Starting VAD Logic Test ---");

// 1. SILENCE
console.log("Phase 1: Silence/Noise (Energy: 0.0001)");
for (let i = 0; i < 5; i++) {
    const status = vad.process(createFrame(0.01)); // Low level noise
    console.log(`Frame ${i}: ${status}`);
}

// 2. SPEECH START
console.log("\nPhase 2: Speech Start (Energy: 0.1)");
const startStatus = vad.process(createFrame(0.5));
console.log(`Speech Start Frame: ${startStatus}`);

// 3. CONTINUED SPEECH
console.log("\nPhase 3: Continued Speech");
for (let i = 0; i < 3; i++) {
    const status = vad.process(createFrame(0.5));
    console.log(`Frame ${i}: ${status}`);
}

// 4. SPEECH END
console.log("\nPhase 4: Silence (Energy: 0.0001) - Waiting for end trigger");
for (let i = 0; i < 10; i++) {
    const status = vad.process(createFrame(0.01));
    console.log(`Frame ${i}: ${status}`);
    if (status === "speech_end") break;
}

console.log("\n--- VAD Logic Test Complete ---");
