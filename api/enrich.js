module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { word } = req.body || {};
  if (!word || typeof word !== "string") {
    return res.status(400).json({ error: "word is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Service not configured" });

  const w = word.trim();
  const prompt = `You are a vocabulary tutor helping Indian students. For the word "${w}", return a JSON object with exactly these keys:
- "definition": a clear, concise definition (one sentence, no more than 22 words). Do not restate the word at the start.
- "example": one natural example sentence that uses the word "${w}" in context.
- "memoryHook": a short, vivid mnemonic using Indian cultural references — Bollywood, cricket, mythology, street food, festivals, or everyday Indian life — to make the word unforgettable. One sentence only.

Respond with ONLY the raw JSON object, no markdown, no code fences, no commentary.`;

  const geminiResp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!geminiResp.ok) {
    const err = await geminiResp.json().catch(() => ({}));
    return res.status(502).json({ error: err?.error?.message || `Upstream error ${geminiResp.status}` });
  }

  const data = await geminiResp.json();
  let txt = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) txt = fence[1].trim();
  const first = txt.indexOf("{");
  const last = txt.lastIndexOf("}");
  if (first !== -1 && last !== -1) txt = txt.slice(first, last + 1);

  try {
    const parsed = JSON.parse(txt);
    return res.status(200).json({
      definition: (parsed.definition || "").trim(),
      example: (parsed.example || "").trim(),
      memoryHook: (parsed.memoryHook || parsed.hook || "").trim(),
    });
  } catch (e) {
    return res.status(502).json({ error: "Failed to parse AI response" });
  }
};
