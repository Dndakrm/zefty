// pages/api/chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    // Kirim ke OpenAI GPT-4o
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",   // pakai GPT-4o
        messages: [
          { role: "system", content: "You are Zefty AI, a helpful assistant for Zefty ID (game topup & marketplace)." },
          { role: "user", content: message }
        ],
        temperature: 0.4
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ error: "OpenAI error", detail: errText });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "⚠️ Tidak ada jawaban.";

    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: String(e) });
  }
}
