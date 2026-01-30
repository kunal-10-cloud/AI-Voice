const numWords = {
    0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine",
    10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen",
    20: "twenty", 30: "thirty", 40: "forty", 50: "fifty", 60: "sixty", 70: "seventy", 80: "eighty", 90: "ninety"
};

function numberToWords(n) {
    n = parseInt(n);
    if (numWords[n]) return numWords[n];
    if (n < 100) {
        return numWords[Math.floor(n / 10) * 10] + " " + numWords[n % 10];
    }
    return n.toString(); // Return as is for large numbers to avoid bloat
}

/**
 * Formats text for natural human-like speech.
 * Removes markdown, normalizes numbers, and collapses newlines.
 */
function formatForSpeech(text) {
    if (!text) return "";

    let formatted = text;

    // 1. Remove Markdown Formatting
    formatted = formatted
        .replace(/[*_#`~>]/g, "") // Remove *, _, #, `, ~, >
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Replace markdown links [text](url) with just text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // Remove images
        .replace(/(\n){2,}/g, ". ") // Collapse multiple newlines into a sentence break
        .replace(/\n/g, ". "); // Replace single newlines with a period/pause

    // 2. Numeric Normalization (Conversational)

    // Decimals: 20.6 -> twenty point six
    formatted = formatted.replace(/(\d+)\.(\d+)/g, (match, before, after) => {
        const b = parseInt(before) < 100 ? numberToWords(before) : before;
        // For digits after decimal, speak individually: 0.12 -> zero point one two
        const a = after.split("").map(d => numberToWords(d)).join(" ");
        return `${b} point ${a}`;
    });

    // Temperatures: 31°C -> thirty one degrees celsius
    formatted = formatted.replace(/(\d+)(°|deg| degrees)?\s?([CcFf])\b/g, (match, num, deg, scale) => {
        const n = parseInt(num) < 100 ? numberToWords(num) : num;
        const unit = scale.toLowerCase() === 'c' ? 'degrees celsius' : 'degrees fahrenheit';
        return `${n} ${unit}`;
    });
    formatted = formatted.replace(/(\d+)°\b/g, (match, num) => {
        const n = parseInt(num) < 100 ? numberToWords(num) : num;
        return `${n} degrees`;
    });

    // Percentages: 50% -> fifty percent
    formatted = formatted.replace(/(\d+)%/g, (match, num) => {
        const n = parseInt(num) < 100 ? numberToWords(num) : num;
        return `${n} percent`;
    });

    // Currency: ₹500 -> five hundred rupees, $50 -> fifty dollars
    formatted = formatted.replace(/₹(\d+)/g, (match, num) => {
        const n = parseInt(num) < 100 ? numberToWords(num) : num;
        return `${n} rupees`;
    });
    formatted = formatted.replace(/\$(\d+)/g, (match, num) => {
        const n = parseInt(num) < 100 ? numberToWords(num) : num;
        return `${n} dollars`;
    });

    // Ranges: 3–4 -> three to four
    formatted = formatted.replace(/(\d+)[–-–](\d+)/g, (match, low, high) => {
        const l = parseInt(low) < 100 ? numberToWords(low) : low;
        const h = parseInt(high) < 100 ? numberToWords(high) : high;
        return `${l} to ${h}`;
    });

    // 3. List Cleanup: "1. item" -> "item"
    formatted = formatted.replace(/^\d+\.\s+/gm, "");
    formatted = formatted.replace(/^[-*+]\s+/gm, "");

    // 4. Cleanup trailing/leading punctuation and triple-dots
    formatted = formatted.replace(/\.{2,}/g, "..."); // Normalize ellipsis
    formatted = formatted.trim();

    return formatted;
}

module.exports = { formatForSpeech };
