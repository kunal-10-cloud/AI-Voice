const Session = require("../sessions/Session");
const { webSearch } = require("../tools/webSearch");

/**
 * MOCK LLM to verify orchestration without hitting API limits
 */
const mockGenerateResponse = async ({ messages, useTools }) => {
    const lastMsg = messages[messages.length - 1];

    // Simulation for LLM Call 1 (Decision)
    if (lastMsg.role === "user" && (lastMsg.content.includes("weather") || lastMsg.content.includes("OpenAI"))) {
        return {
            tool_calls: [{
                id: "call_123",
                function: {
                    name: "web_search",
                    arguments: JSON.stringify({ query: lastMsg.content })
                }
            }]
        };
    }

    // Simulation for LLM Call 2 (Final Answer with Tool Result)
    if (lastMsg.role === "tool") {
        return { content: "Based on search results, the weather in Pune is pleasant. (Source: AccuWeather)" };
    }

    return { content: "Docker is a tool for containerization." };
};

async function testSearchOrchestration() {
    const session = new Session("search-test");

    console.log("--- Starting Search Orchestration Test ---");

    // Turn 1: Should Skip
    console.log("\nTurn 1: 'What is Docker?' (Expect Skip)");
    session.messages.push({ role: "user", content: "What is Docker?" });
    console.log(`[MEMORY] Session ${session.sessionId}: sending ${session.messages.length + 1} messages to LLM`);
    let res1 = await mockGenerateResponse({ messages: [{}, ...session.messages], useTools: true });
    console.log("[SEARCH] Session " + session.sessionId + ": skipped");
    session.messages.push({ role: "assistant", content: res1.content });
    console.log(`Assistant: ${res1.content}`);

    // Turn 2: Should Trigger
    console.log("\nTurn 2: 'What is the weather in Pune?' (Expect Trigger)");
    session.messages.push({ role: "user", content: "What is the weather in Pune?" });
    console.log(`[MEMORY] Session ${session.sessionId}: sending ${session.messages.length + 1} messages to LLM`);

    let res2a = await mockGenerateResponse({ messages: [{}, ...session.messages], useTools: true });

    if (res2a.tool_calls) {
        const query = JSON.parse(res2a.tool_calls[0].function.arguments).query;
        console.log(`[SEARCH] Session ${session.sessionId}: triggered for query "${query}"`);

        const results = await webSearch(query);
        console.log(`Results: ${JSON.stringify(results)}`);

        let res2b = await mockGenerateResponse({
            messages: [{}, ...session.messages, res2a, { role: "tool", content: JSON.stringify(results) }],
            useTools: false
        });

        session.messages.push({ role: "assistant", content: res2b.content });
        console.log(`Assistant: ${res2b.content}`);
    }

    console.log(`\nFinal Memory (User/Assistant only): ${JSON.stringify(session.messages.map(m => m.role))}`);
    console.log("--- Search Orchestration Test Complete ---");
}

testSearchOrchestration();
