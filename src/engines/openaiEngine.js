import { config } from "dotenv";
import OpenAI from "openai";

config();

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OpenAI API key. Set OPENAI_API_KEY in .env");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export async function callOpenAI(diff) {
  const openai = getOpenAIClient();

  const prompt = `Analyze this git diff and create a task description for Azure DevOps or similar tools. 
    Respond in exactly this format:

    TITLE: [Brief summary of the change]
    SUMMARY: [What was changed and why]
    TECHNICAL: [Implementation notes and considerations]

    Git diff:
    \`\`\`
    ${diff}
    \`\`\``;

  const chat = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const content = chat.choices[0].message.content.trim();

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
