/**
 * Simple web search tool wrapper.
 * For production, use Tavily, Serper, or Google Search API.
 * This mock simulates a search for demonstration if no API key is set.
 */
async function webSearch(query) {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log(`[EXTERNAL] Searching for: ${query}`);

    // Mock results for common queries
    if (query.toLowerCase().includes("pune") && query.toLowerCase().includes("weather")) {
        return [
            { title: "Pune Weather - AccuWeather", snippet: "Mostly sunny and pleasant. High 31C. Winds light and variable.", source: "https://accuweather.com" },
            { title: "Current Weather in Pune", snippet: "24°C, Humidity: 45%. Clear skies expected for the rest of the day.", source: "https://weather.com" }
        ];
    }

    if (query.toLowerCase().includes("openai")) {
        return [
            { title: "OpenAI Blog - News", snippet: "OpenAI announces new model capabilities and safety features.", source: "https://openai.com/blog" },
            { title: "TechCrunch - OpenAI Updates", snippet: "Reports suggest OpenAI is expanding its infrastructure in 2026.", source: "https://techcrunch.com" }
        ];
    }

    return [
        { title: `Search results for ${query}`, snippet: "General information about the topic found on various educational and news sites.", source: "https://example.com" }
    ];
}

module.exports = { webSearch };
