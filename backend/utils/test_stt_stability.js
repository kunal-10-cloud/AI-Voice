const Session = require("../sessions/Session");
const { cleanTranscript } = require("./transcriptHelper");

function simulateDeepgramMessage(session, message) {
    const transcript = message.channel?.alternatives?.[0]?.transcript || "";

    if (!transcript || transcript.length < 2) return;

    if (message.is_final === false) {
        // Unstable interim result: replace
        session.interimTranscript = transcript;
        console.log(`[STT INTERIM] ${transcript}`);
    } else if (message.is_final === true) {
        // Stable final result: clean and append
        const cleaned = cleanTranscript(transcript);
        if (cleaned) {
            session.finalTranscript = (session.finalTranscript + " " + cleaned).trim();
            session.interimTranscript = ""; // Clear interim as it's now final
            console.log(`[STT FINAL] ${cleaned}`);
        }
    }
}

function testSTTStability() {
    const session = new Session("test-stt-session");

    console.log("--- Testing STT Stability Logic ---");

    // Scenario 1: "Pune" arrives as "pun" (interim) then "Pune" (final)
    console.log("\nScenario 1: Word Stability ('pun' -> 'Pune')");

    simulateDeepgramMessage(session, {
        channel: { alternatives: [{ transcript: "pun" }] },
        is_final: false
    });
    console.log(`Buffer Check 1: Interim="${session.interimTranscript}", Final="${session.finalTranscript}"`);

    if (session.interimTranscript !== "pun" || session.finalTranscript !== "") {
        console.error("❌ Failed: Interim should be 'pun', Final empty");
    }

    simulateDeepgramMessage(session, {
        channel: { alternatives: [{ transcript: "pune" }] },
        is_final: true
    });
    console.log(`Buffer Check 2: Interim="${session.interimTranscript}", Final="${session.finalTranscript}"`);

    if (session.interimTranscript !== "" || session.finalTranscript !== "pune") {
        console.error("❌ Failed: Interim should be empty, Final 'pune'");
    } else {
        console.log("✅ Passed");
    }

    // Scenario 2: Two words "Galentine's" then "Day"
    console.log("\nScenario 2: Sentence Accumulation");

    simulateDeepgramMessage(session, {
        channel: { alternatives: [{ transcript: "galen" }] },
        is_final: false
    });

    simulateDeepgramMessage(session, {
        channel: { alternatives: [{ transcript: "galentine's" }] },
        is_final: true
    });

    simulateDeepgramMessage(session, {
        channel: { alternatives: [{ transcript: "day" }] },
        is_final: true
    });

    console.log(`Final Result: "${session.finalTranscript}"`);

    if (session.finalTranscript === "pune galentine's day") {
        console.log("✅ Passed: Correct accumulation");
    } else {
        console.error(`❌ Failed: Expected "pune galentine's day", got "${session.finalTranscript}"`);
    }

    console.log("\n--- STT Stability Test Complete ---");
}

testSTTStability();
