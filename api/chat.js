import fs from "fs/promises";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { systemPromptName, userMessage } = req.body;

  if (!systemPromptName || !userMessage) {
    return res.status(400).json({ error: "Missing systemPromptName or userMessage" });
  }

  try {
    // Load and parse prompts from prompt.text
    const promptData = JSON.parse(await fs.readFile("./prompt.text", "utf-8"));
    const systemPrompt = promptData.data.find((p) => p.name === systemPromptName);

    if (!systemPrompt) {
      return res.status(404).json({ error: `System prompt '${systemPromptName}' not found.` });
    }

    // Prepare payload for Cloudflare AI API
    const payload = {
      messages: [
        { role: "system", content: systemPrompt.system_message },
        { role: "user", content: userMessage }
      ]
    };

    // Call Cloudflare AI API
    const response = await fetch(
      "https://api.cloudflare.com/client/v4/accounts/183ecd46407b11442f4befcc6e2b695b/ai/run/@cf/meta/llama-3-8b-instruct",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer yAD-yqwlds52sZOPKgB1bk42aTnw83kcoiq54xu_"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: error || "Cloudflare API call failed" });
    }

    const data = await response.json();
    res.status(200).json({ reply: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
                          }
