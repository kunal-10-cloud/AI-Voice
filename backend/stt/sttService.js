const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

const DEEPGRAM_URL =
  "https://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1";

async function speechToText(audioChunks) {
  const audioBuffer = Buffer.concat(audioChunks);

  const response = await fetch(DEEPGRAM_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": "audio/raw",
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Deepgram error: ${errText}`);
  }

  const result = await response.json();

  const transcript =
    result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

  return transcript.trim();
}

module.exports = { speechToText };