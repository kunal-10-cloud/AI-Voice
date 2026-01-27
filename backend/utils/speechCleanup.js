/**
 * Lightweight cleanup to remove markdown and formatting before TTS.
 * This ensures the assistant sounds natural and doesn't read formatting characters.
 */
function cleanTextForSpeech(text) {
    if (!text) return "";

    let cleaned = text
        // 1. Remove markdown bold and italic markers
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")

        // 2. Remove bullet points and numbered list prefixes
        .replace(/^\u2022\s*/gm, "") // Bullet character
        .replace(/^-\s*/gm, "")      // Dash bullet
        .replace(/^\d+\.\s*/gm, "")  // Numbered list (1., 2., etc)

        // 3. Remove other common markdown
        .replace(/#+\s/g, "")        // Headings (#, ##)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links [text](url) -> text

        // 4. Remove words that shouldn't be spoken
        .replace(/\b(bullet point|asterisk|star)\b/gi, "")

        // 5. Cleanup whitespace
        .replace(/\n+/g, " ")        // Multiple newlines to single space
        .replace(/\s+/g, " ")        // Multiple spaces to single space
        .trim();

    return cleaned;
}

module.exports = { cleanTextForSpeech };
