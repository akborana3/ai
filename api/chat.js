import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  console.log("API handler started");

  if (req.method !== "POST") {
    console.log("Invalid request method");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { systemPromptName, userMessage } = req.body;

  if (!systemPromptName || !userMessage) {
    console.log("Missing required parameters");
    return res.status(400).json({ error: "Missing systemPromptName or userMessage" });
  }

  try {
    console.log("Current working directory:", process.cwd());

    const filePath = path.join(process.cwd(), "prompt.text");
    console.log("Resolved file path:", filePath);

    const promptFileContent = await fs.readFile(filePath, "utf-8");
    console.log("Successfully read the prompt.text file");
    const promptData = JSON.parse(promptFileContent);

    const systemPrompt = promptData.data.find((p) => p.name === systemPromptName);
    if (!systemPrompt) {
      console.log(`System prompt '${systemPromptName}' not found`);
      return res.status(404).json({ error: `System prompt '${systemPromptName}' not found.` });
    }

    console.log("Found system prompt:", systemPrompt);

    const payload = {
      messages: [
        { role: "system", content: systemPrompt.system_message },
        { role: "user", content: userMessage }
      ]
    };

    console.log("Prepared payload for Cloudflare API:", JSON.stringify(payload, null, 2));

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 10000); // 10-second timeout for the API call

    try {
      const response = await fetch(
        "https://api.cloudflare.com/client/v4/accounts/183ecd46407b11442f4befcc6e2b695b/ai/run/@cf/meta/llama-3-8b-instruct",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer yAD-yqwlds52sZOPKgB1bk42aTnw83kcoiq54xu_"
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Cloudflare API error response:", errorText);
        return res.status(response.status).json({ error: errorText || "Cloudflare API call failed" });
      }

      const data = await response.json();
      console.log("Cloudflare API response:", data);
      res.status(200).json({ reply: data });
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Cloudflare API request timed out");
        return res.status(504).json({ error: "Cloudflare API request timed out." });
      }
      console.error("Error during Cloudflare API call:", err);
      res.status(500).json({ error: "Error during Cloudflare API call" });
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("File not found:", error.path);
      res.status(500).json({ error: `File not found: ${error.path}` });
    } else {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
