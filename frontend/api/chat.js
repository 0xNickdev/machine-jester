// frontend/api/chat.js
// Vercel Serverless Function — проксирует запросы к DeepSeek
// DEEPSEEK_KEY хранится в Vercel Environment Variables — никогда не попадает в браузер

export default async function handler(req, res) {
  // Только POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.DEEPSEEK_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "DEEPSEEK_KEY not configured on server" });
  }

  const { messages = [], system, max_tokens = 500 } = req.body || {};

  // Собираем сообщения
  const msgs = [];
  if (system) msgs.push({ role: "system", content: system });
  msgs.push(...messages.slice(-14)); // последние 14 сообщений максимум

  try {
    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: Math.min(max_tokens, 800),
        messages: msgs,
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error("DeepSeek error:", upstream.status, err);
      return res.status(502).json({ error: "DeepSeek unavailable. Try again." });
    }

    const data = await upstream.json();
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "No response";
    return res.status(200).json({ reply });
  } catch (e) {
    console.error("Proxy error:", e);
    return res.status(500).json({ error: "Server error. Try again." });
  }
}
