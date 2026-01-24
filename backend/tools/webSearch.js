/**
 * Real-time web search tool using Tavily API.
 * Performs grounded search for time-sensitive or external information.
 */
async function webSearch(query) {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
        console.error("[SEARCH] Tavily request failed: TAVILY_API_KEY missing");
        return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout

    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: "basic",
                include_images: false,
                include_answer: false,
                max_results: 5,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`[SEARCH] Tavily request failed: status ${response.status}`);
            return [];
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            console.log(`[SEARCH] Tavily returned no results`);
            return [];
        }

        // Normalize and sanitize results
        const normalizedResults = data.results
            .map((r) => ({
                title: r.title ? r.title.trim() : "No Title",
                snippet: r.content ? r.content.trim() : "No snippet available",
                source: r.url ? r.url.trim() : "Unknown Source",
            }))
            .filter((r) => r.snippet !== "No snippet available");

        const finalResults = normalizedResults.slice(0, 5);
        console.log(`[SEARCH] Tavily request successful (${finalResults.length} results)`);

        return finalResults;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
            console.error("[SEARCH] Tavily request failed: Timeout after 4s");
        } else {
            console.error(`[SEARCH] Tavily request failed: ${err.message}`);
        }
        return [];
    }
}

module.exports = { webSearch };
