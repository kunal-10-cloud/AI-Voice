export class TTSPlayer {
    constructor() {
        this.audioContext = null;
        this.sentenceQueue = []; // Queue of {index, audioBuffer, total}
        this.isPlaying = false;
        this.currentSource = null;
        this.currentRequestId = null;
        this.isResumed = false;
    }

    async init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (!this.isResumed && this.audioContext.state === "suspended") {
            await this.audioContext.resume();
            this.isResumed = true;
            console.log("[AUDIO] AudioContext resumed");
        }
    }

    async handleFullAudio(payload) {
        if (!this.audioContext) await this.init();

        const { audio, index, total, requestId } = payload;

        // Drop if from old request
        if (this.currentRequestId !== null && requestId !== this.currentRequestId) {
            console.log(`[AUDIO] Dropping sentence from old request ${requestId}`);
            return;
        }

        // Set current request ID
        if (this.currentRequestId === null) {
            this.currentRequestId = requestId;
            console.log(`[AUDIO] Started playback for request ${requestId}`);
        }

        try {
            // Decode base64 to ArrayBuffer
            const binaryString = window.atob(audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            console.log(`[AUDIO] Decoding sentence ${index + 1}/${total} (${bytes.length} bytes)`);

            // Decode WAV to AudioBuffer
            const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);

            console.log(`[AUDIO] Decoded sentence ${index + 1}/${total} -> ${audioBuffer.duration.toFixed(2)}s`);

            // Add to queue
            this.sentenceQueue.push({ index, audioBuffer, total });

            // Sort queue by index to ensure correct order
            this.sentenceQueue.sort((a, b) => a.index - b.index);

            // Start playback if not already playing
            if (!this.isPlaying) {
                this.playNext();
            }

        } catch (error) {
            console.error(`[AUDIO] Failed to decode sentence ${index + 1}/${total}:`, error);
        }
    }

    handleComplete(requestId) {
        if (requestId === this.currentRequestId) {
            console.log(`[AUDIO] All sentences received for request ${requestId}`);
        }
    }

    playNext() {
        if (this.isPlaying || this.sentenceQueue.length === 0) {
            return;
        }

        const { index, audioBuffer, total } = this.sentenceQueue.shift();
        this.isPlaying = true;

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        source.onended = () => {
            this.isPlaying = false;
            this.currentSource = null;

            console.log(`[AUDIO] Finished sentence ${index + 1}/${total}`);

            // Play next sentence if available
            if (this.sentenceQueue.length > 0) {
                this.playNext();
            } else {
                console.log("[AUDIO] Playback complete");
                this.currentRequestId = null;
            }
        };

        this.currentSource = source;
        source.start(0);
        console.log(`[AUDIO] Playing sentence ${index + 1}/${total} (${audioBuffer.duration.toFixed(2)}s)`);
    }

    stopAll() {
        console.log("[AUDIO] Barge-in: Stopping playback");

        if (this.currentSource) {
            try { this.currentSource.stop(); } catch (e) { }
            this.currentSource = null;
        }

        this.sentenceQueue = [];
        this.isPlaying = false;
        this.currentRequestId = null;
    }
}
