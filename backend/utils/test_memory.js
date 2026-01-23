const Session = require("../sessions/Session");

// Mocking STT and LLM services
const mockSTT = (chunks) => chunks.join(" "); // Just for simulation
const mockLLM = async (messages) => {
    const lastUserMessage = messages.findLast(m => m.role === "user").content;
    if (lastUserMessage.toLowerCase().includes("docker")) return "Docker is a platform for containers.";
    if (lastUserMessage.toLowerCase().includes("simply")) return "It's like a box for your app.";
    return "I understand.";
};

async function testMemory() {
    const session = new Session("test-session");

    console.log("--- Starting Conversation Memory Test ---");

    // Turn 1
    console.log("\nTurn 1: 'What is Docker?'");
    session.messages.push({ role: "user", content: "What is Docker?" });
    let response1 = await mockLLM([
        { role: "system", content: "..." },
        ...session.messages
    ]);
    session.messages.push({ role: "assistant", content: response1 });
    console.log(`Assistant: ${response1}`);
    console.log(`Memory Length: ${session.messages.length}`);

    // Turn 2
    console.log("\nTurn 2: 'Explain it simply.'");
    session.messages.push({ role: "user", content: "Explain it simply." });

    // Verify system prompt injection (dynamic)
    const messagesForLLM = [
        { role: "system", content: "system prompt" },
        ...session.messages
    ];
    console.log("LLM Request Messages:", JSON.stringify(messagesForLLM, null, 2));

    let response2 = await mockLLM(messagesForLLM);
    session.messages.push({ role: "assistant", content: response2 });
    console.log(`Assistant: ${response2}`);
    console.log(`Final Memory state roles: ${session.messages.map(m => m.role).join(", ")}`);

    // Verify memory bounding
    console.log("\nTesting Memory Bounding (adding 10 more messages)...");
    for (let i = 0; i < 10; i++) {
        session.messages.push({ role: "user", content: `msg ${i}` });
        if (session.messages.length > 12) {
            session.messages = session.messages.slice(-12);
        }
    }
    console.log(`Memory Length after bounding: ${session.messages.length} (Expected: 12)`);

    console.log("\n--- Conversation Memory Test Complete ---");
}

testMemory();
