const GROQ_API_KEY = process.env.GROQ_API_KEY;

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

async function generateResponse({ messages }) {
  const body = {
    model: MODEL,
    messages,
    temperature: 0.6,
  };

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq LLM error: ${errText}`);
  }

  const data = await response.json();

  return data.choices[0].message.content.trim();
}

module.exports = { generateResponse };