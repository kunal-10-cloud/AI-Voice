const https = require("https");

// Use a persistent agent with keep-alive to avoid socket hang-ups
const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 10,
    timeout: 10000
});

/**
 * Split text into sentences
 * @param {string} text - Text to split
 * @param {number} maxChunkSize - Maximum characters per sentence
 * @returns {string[]} Array of sentences
 */
function splitIntoSentences(text, maxChunkSize = 250) {
    // Better regex to handle abbreviations and clean splitting
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = "";

    for (const sentence of sentences) {
        const trimmed = sentence.trim();

        if (currentChunk.length + trimmed.length > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = trimmed;
        } else {
            currentChunk += (currentChunk ? " " : "") + trimmed;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
}

/**
 * Generate full WAV audio for a single sentence with retry logic
 * @param {string} text - Sentence to speak
 * @param {number} retries - Number of retries
 * @returns {Promise<Buffer>} Complete WAV audio buffer
 */
async function generateWAV(text, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
                const postData = JSON.stringify({ text: text });

                const options = {
                    hostname: 'api.deepgram.com',
                    path: '/v1/speak?encoding=linear16&sample_rate=16000&container=wav',
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    },
                    agent: httpsAgent,
                    timeout: 5000 // 5 second timeout
                };

                const chunks = [];
                const req = https.request(options, (res) => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                        return;
                    }

                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () => resolve(Buffer.concat(chunks)));
                    res.on('error', (err) => reject(err));
                });

                req.on('error', (err) => reject(err));
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Request Timeout'));
                });

                req.write(postData);
                req.end();
            });
        } catch (err) {
            if (attempt === retries) {
                console.error(`[TTS] Failed after ${retries + 1} attempts: ${err.message}`);
                throw err;
            }
            console.warn(`[TTS] Attempt ${attempt + 1} failed (${err.message}). Retrying...`);
            // Exponential backoff
            await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        }
    }
}

/**
 * Generate and send TTS audio for full response
 * @param {string} text - Full text to speak
 * @param {object} session - Session object
 * @param {WebSocket} wsClient - Client WebSocket
 */
async function streamTTS(text, session, wsClient) {
    if (!text || !text.trim()) return;

    // Increment Request ID
    const currentRequestId = ++session.ttsRequestId;
    session.isSpeakingTTS = true;

    // Split into sentences
    const sentences = splitIntoSentences(text);
    console.log(`[TTS] Session ${session.sessionId}: splitting into ${sentences.length} sentences`);

    try {
        for (let i = 0; i < sentences.length; i++) {
            // STRICT BARGE-IN CHECK (Call to LLM/TTS generation)
            if (session.ttsRequestId !== currentRequestId) {
                console.log(`[TTS] Hard stop at sentence ${i + 1}/${sentences.length} (requestId=${currentRequestId})`);
                return;
            }

            console.log(`[TTS] Generating sentence ${i + 1}/${sentences.length}: "${sentences[i].substring(0, 50)}..."`);

            // Generate full WAV buffer
            const wavBuffer = await generateWAV(sentences[i]);

            // Track first TTS chunk for metrics
            if (i === 0) {
                session.ttsFirstChunkTime = Date.now();
            }

            // STRICT BARGE-IN CHECK (After generation, before sending)
            if (session.ttsRequestId !== currentRequestId) {
                console.log(`[TTS] Dropping stale audio chunk index ${i} (requestId=${currentRequestId})`);
                return;
            }

            console.log(`[TTS] Generated sentence ${i + 1}/${sentences.length} (${wavBuffer.length} bytes)`);

            // Send complete WAV as base64
            if (wsClient.readyState === 1) {
                wsClient.send(JSON.stringify({
                    type: "tts_audio_full",
                    payload: {
                        audio: wavBuffer.toString("base64"),
                        index: i,
                        total: sentences.length,
                        requestId: currentRequestId
                    }
                }));
                console.log(`[TTS] Sent sentence ${i + 1}/${sentences.length} to client (requestId=${currentRequestId})`);
                // Update last activity time for barge-in window
                session.lastTTSActivity = Date.now();
            }

            // Small delay between requests to be gentle on connection
            await new Promise(r => setTimeout(r, 50));
        }

        if (session.ttsRequestId === currentRequestId && wsClient.readyState === 1) {
            wsClient.send(JSON.stringify({
                type: "tts_complete",
                requestId: currentRequestId
            }));
            console.log(`[TTS] Session ${session.sessionId}: all sentences sent. Waiting for playback to finish...`);
        }

    } catch (err) {
        console.error(`[TTS] Error: ${err.message}`);
    }
}

module.exports = { streamTTS };
