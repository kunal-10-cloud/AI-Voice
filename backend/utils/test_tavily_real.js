const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { webSearch } = require("../tools/webSearch");

async function testTavily() {
    console.log("--- Testing Tavily Web Search ---");

    const query = "Latest news about OpenAI";
    console.log(`Query: "${query}"`);

    try {
        const results = await webSearch(query);

        if (results.length > 0) {
            console.log("✅ Success! Results found:");
            results.forEach((r, i) => {
                console.log(`\nResult ${i + 1}:`);
                console.log(`Title: ${r.title}`);
                console.log(`Source: ${r.source}`);
                console.log(`Snippet: ${r.snippet.substring(0, 100)}...`);
            });
        } else {
            console.log("❌ Failed: No results returned (check logs above)");
        }
    } catch (err) {
        console.error(`❌ Unexpected Error: ${err.message}`);
    }

    console.log("\n--- Tavily Test Complete ---");
}

testTavily();
