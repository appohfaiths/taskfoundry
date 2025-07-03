import { config } from "dotenv";
import fetch from "node-fetch";

config();

export async function callGroq(diff, engineConfig = {}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing Groq API key. Set GROQ_API_KEY in .env");
  }

  const model = engineConfig.model || "llama-3.3-70b-versatile"; // or llama-3.1-8b-instant, gemma2-9b-it

  const prompt = `Analyze this git diff and create a task description for Azure DevOps or similar tools. 
Respond in exactly this format:

TITLE: [Brief summary of the change]
SUMMARY: [What was changed and why]
TECHNICAL: [Implementation notes and considerations]

Git diff:
\`\`\`
${diff}
\`\`\`
`;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: engineConfig.temperature || 0.3,
        max_tokens: engineConfig.maxTokens || 1000,
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  const lines = content.split("\n");
  const result = { title: "", summary: "", tech: "" };

  for (const line of lines) {
    if (line.startsWith("TITLE:")) {
      result.title = line.substring(6).trim();
    } else if (line.startsWith("SUMMARY:")) {
      result.summary = line.substring(8).trim();
    } else if (line.startsWith("TECHNICAL:")) {
      result.tech = line.substring(10).trim();
    }
  }

  return result;
}
