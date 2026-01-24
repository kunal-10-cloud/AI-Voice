const { webSearch } = require("../tools/webSearch");

/**
 * MOCK LLM for Orchestration Verification
 */
const mockGenerateResponse = async ({ messages }) => {
    const lastMsg = messages[messages.length - 1];
    const systemMsg = messages.find(m => m.role === "system");

    // Decision Phase
    if (systemMsg && systemMsg.content.includes("JSON")) {
        const content = lastMsg.content.toLowerCase();

        // Test Case: Weather in Pune (Specific)
        if (content.includes("weather") && content.includes("pune")) {
            return JSON.stringify({ search: true, query: "weather in Pune" });
        }

        // Test Case: Docker (Generic)
        if (content.includes("docker")) {
            return JSON.stringify({ search: false });
        }

        // Test Case: What is weather (Vague)
        if (content === "what is weather") {
            return JSON.stringify({ search: true, query: "what is weather" });
        }

        // Test Case: Follow-up (Context check)
        if (content === "what about the weather") {
            return JSON.stringify({ search: true, query: "what about the weather" });
        }

        return JSON.stringify({ search: false });
    }

    // Final Answer Phase
    return "I have computed the final answer.";
};

/**
 * Intent Gating Function (Copied from server.js for isolated test)
 */
function shouldTriggerSearch(query) {
    const q = query.toLowerCase();

    // 1. Skip definitional/vague questions
    const skipPatterns = [
        /^what is [a-z]+$/,
        /^explain [a-z]+$/,
        /^is [a-z]+$/,
        /what about the [a-z]+$/ // e.g., "what about the weather"
    ];
    if (skipPatterns.some(p => p.test(q))) return false;

    // 2. Identify time-sensitive or external entity keywords
    const keywords = ["today", "latest", "current", "news", "now", "weather", "stock", "price", "ceo", "score"];
    const hasKeyword = keywords.some(k => q.includes(k));

    // 3. Stricter Specificity Check
    const words = q.split(/\s+/).filter(w => !["what", "is", "the", "about", "a", "an"].includes(w));

    return hasKeyword && words.length >= 2;
}

async function runTests() {
    console.log("--- Starting Refactored Search Verification (v2) ---");

    const testCases = [
        { name: "Specific Info (Search Expected)", input: "Weather in Pune today", expectSearch: true },
        { name: "Generic Knowledge (Skip Expected)", input: "What is Docker?", expectSearch: false },
        { name: "Vague Query (Gating Expected)", input: "What is weather", expectSearch: false },
        { name: "Context Follow-up (Context Hygiene Expected)", input: "What about the weather", expectSearch: false }
    ];

    for (const test of testCases) {
        console.log(`\nTest: ${test.name}`);
        console.log(`Input: "${test.input}"`);

        // 1. Decision
        const decisionStr = await mockGenerateResponse({ messages: [{ role: "system", content: "JSON" }, { role: "user", content: test.input }] });
        let decision = { search: false };
        try { decision = JSON.parse(decisionStr); } catch (e) { }

        // 2. Gating
        const searchTriggered = decision.search && shouldTriggerSearch(decision.query);

        console.log(`LLM Decision: ${decisionStr}`);
        console.log(`Intent Gating Status: ${searchTriggered ? "PASSED" : "BLOCKED"}`);

        if (searchTriggered !== test.expectSearch) {
            console.error(`❌ FAILED: Expected search ${test.expectSearch}, but got ${searchTriggered}`);
        } else {
            console.log(`✅ PASSED`);
        }
    }

    console.log("\n--- Verification Complete ---");
}

runTests();
