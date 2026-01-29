
export class TTSPlayer {
    private audioContext: AudioContext | null = null;
    private sentenceQueue: { index: number, audioBuffer: AudioBuffer, total: number }[] = [];
    private isPlaying = false;
    private currentSource: AudioBufferSourceNode | null = null;
    private currentRequestId: number | null = null;

    constructor() { }

    async init(context?: AudioContext) {
        if (!this.audioContext) {
            this.audioContext = context || new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }
    }

    async handleFullAudio(payload: { audio: string, index: number, total: number, requestId: number }) {
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
        }

        try {
            // Decode base64 to ArrayBuffer
            const binaryString = window.atob(audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Decode WAV to AudioBuffer
            const audioBuffer = await this.audioContext!.decodeAudioData(bytes.buffer);

            // Add to queue
            this.sentenceQueue.push({ index, audioBuffer, total });
            this.sentenceQueue.sort((a, b) => a.index - b.index);

            if (!this.isPlaying) {
                this.playNext();
            }

        } catch (error) {
            console.error(`[AUDIO] Failed to decode sentence ${index + 1}/${total}:`, error);
        }
    }

    public onComplete?: () => void;

    private playNext() {
        if (this.isPlaying || this.sentenceQueue.length === 0 || !this.audioContext) {
            return;
        }

        const next = this.sentenceQueue.shift()!;
        this.isPlaying = true;

        const source = this.audioContext.createBufferSource();
        source.buffer = next.audioBuffer;
        source.connect(this.audioContext.destination);

        source.onended = () => {
            this.isPlaying = false;
            this.currentSource = null;

            if (this.sentenceQueue.length > 0) {
                this.playNext();
            } else {
                this.currentRequestId = null;
                if (this.onComplete) this.onComplete();
            }
        };

        this.currentSource = source;
        source.start(0);
    }

    stopAll() {
        if (this.currentSource) {
            try { this.currentSource.stop(); } catch (e) { }
            this.currentSource = null;
        }
        this.sentenceQueue = [];
        this.isPlaying = false;
        this.currentRequestId = null;
    }
}
