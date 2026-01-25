/**
 * Lightweight cleaning for STT transcripts.
 * No word replacement or phonetic guessing.
 */
function cleanTranscript(text) {
    if (!text) return "";

    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ") // Collapse multiple spaces
        .replace(/[.,!?;:]+$/g, "") // Remove trailing punctuation noise
        .replace(/^[.,!?;:]+/g, ""); // Remove leading punctuation noise
}

module.exports = { cleanTranscript };
