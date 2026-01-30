/**
 * Interactive Admin Client for Testing Context Updates
 * 
 * Usage:
 * 1. Run: node backend/utils/test_admin_updater.js
 * 2. Paste the Target Session ID (found in server logs).
 * 3. Type a system instruction and press ENTER.
 * 
 * This sends an HTTPS POST to /admin/context to control a specific active session on the deployed server.
 */

const https = require("https");
const readline = require("readline");

const API_HOST = "ai-voice-qtky.onrender.com";
const API_PROTOCOL = "https:";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let targetSessionId = "";

console.log("--- Admin Context Updater ---");

rl.question("Enter Target Session ID: ", (id) => {
    targetSessionId = id.trim();
    console.log(`\nTargeting Session: ${targetSessionId}`);
    console.log("Type a context update (e.g., 'Speak like a pirate') and press ENTER.");
    console.log("Type 'exit' to quit.\n");
    prompt();
});

function prompt() {
    rl.question("> ", (input) => {
        if (input.trim().toLowerCase() === "exit") {
            process.exit(0);
        }

        if (input.trim()) {
            sendUpdate(input.trim());
        } else {
            prompt();
        }
    });
}

function sendUpdate(content) {
    const postData = JSON.stringify({
        sessionId: targetSessionId,
        content: content
    });

    const options = {
        hostname: API_HOST,
        path: "/admin/context",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = "";
        res.on("data", (chunk) => { responseBody += chunk; });

        res.on("end", () => {
            if (res.statusCode === 200) {
                console.log(`✅ Success: ${responseBody}`);
            } else {
                console.error(`❌ Error (${res.statusCode}): ${responseBody}`);
            }
            prompt();
        });
    });

    req.on("error", (e) => {
        console.error(`❌ Request Error: ${e.message}`);
        prompt();
    });

    req.write(postData);
    req.end();
}
