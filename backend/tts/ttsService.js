const https = require("https");

/**
 * Split text into sentences
 * @param {string} text - Text to split
 * @param {number} maxChunkSize - Maximum characters per sentence
 * @returns {string[]} Array of sentences
 */
function splitIntoSentences(text, maxChunkSize = 250) {
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
 * Generate full WAV audio for a single sentence
 * @param {string} text - Sentence to speak
 * @returns {Promise<Buffer>} Complete WAV audio buffer
 */
function generateWAV(text) {
    return new Promise((resolve, reject) => {
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
            }
        };

        const chunks = [];

        const req = https.request(options, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                return;
            }

            res.on('data', (chunk) => {
                chunks.push(chunk);
            });

            res.on('end', () => {
                const fullBuffer = Buffer.concat(chunks);
                resolve(fullBuffer);
            });

            res.on('error', (err) => {
                reject(err);
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(postData);
        req.end();
    });
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
            // Check if interrupted
            if (session.ttsRequestId !== currentRequestId) {
                console.log(`[TTS] Interrupted at sentence ${i + 1}/${sentences.length}`);
                break;
            }

            console.log(`[TTS] Generating sentence ${i + 1}/${sentences.length}: "${sentences[i].substring(0, 50)}..."`);

            // Generate full WAV buffer
            const wavBuffer = await generateWAV(sentences[i]);

            console.log(`[TTS] Generated sentence ${i + 1}/${sentences.length} (${wavBuffer.length} bytes)`);

            // Check again if interrupted during generation
            if (session.ttsRequestId !== currentRequestId) {
                console.log(`[TTS] Interrupted after generating sentence ${i + 1}/${sentences.length}`);
                break;
            }

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
                console.log(`[TTS] Sent sentence ${i + 1}/${sentences.length} to client`);
            }
        }

        // Send completion signal
        if (session.ttsRequestId === currentRequestId && wsClient.readyState === 1) {
            wsClient.send(JSON.stringify({
                type: "tts_complete",
                requestId: currentRequestId
            }));
            console.log(`[TTS] Session ${session.sessionId}: all sentences sent`);
        }

    } catch (err) {
        console.error(`[TTS] Error: ${err.message}`);
    } finally {
        if (session.ttsRequestId === currentRequestId) {
            session.isSpeakingTTS = false;
        }
    }
}

module.exports = { streamTTS };
