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
    // Log the current working directory
    console.log("Current working directory:", process.cwd());

    // Resolve the absolute path to prompt.text
    const filePath = path.join(process.cwd(), "prompt.text");
    console.log("Resolved file path:", filePath);

    // Read and parse the prompt.text file
    const promptFileContent = await fs.readFile(filePath, "utf-8");
    console.log("Successfully read the prompt.text file");
    const promptData = JSON.parse(promptFileContent);

    // Find the system prompt
    const systemPrompt = promptData.data.find((p) => p.name === systemPromptName);
    if (!systemPrompt) {
      console.log(`System prompt '${systemPromptName}' not found`);
      return res.status(404).json({ error: `System prompt '${systemPromptName}' not found.` });
    }

    console.log("Found system prompt:", systemPrompt);

    // Prepare the payload for Cloudflare API
    const payload = {
      messages: [
        { role: "system", content: systemPrompt.system_message },
        { role: "user", content: userMessage }
      ]
    };

    console.log("Prepared payload for Cloudflare API");

    // Make the API request with a timeout
    const fetchWithTimeout = async (url, options, timeout = 5000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    };

    const response = await fetchWithTimeout(
      "https://api.cloudflare.com/client/v4/accounts/183ecd46407b11442f4befcc6e2b695b/ai/run/@cf/meta/llama-3-8b-instruct",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer yAD-yqwlds52sZOPKgB1bk42aTnw83kcoiq54xu_"
        },
        body: JSON.stringify(payload)
      },
      10000 // Timeout in milliseconds
    );

    if (!response.ok) {
      const error = await response.text();
      console.log("Cloudflare API error:", error);
      return res.status(response.status).json({ error: error || "Cloudflare API call failed" });
    }

    // Return the response from the Cloudflare API
    const data = await response.json();
    console.log("Cloudflare API response:", data);
    res.status(200).json({ reply: data });
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Request timed out");
      res.status(504).json({ error: "Request timed out." });
    } else if (error.code === "ENOENT") {
      console.log("File not found:", error.path);
      res.status(500).json({ error: `File not found: ${error.path}` });
    } else {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
        }
