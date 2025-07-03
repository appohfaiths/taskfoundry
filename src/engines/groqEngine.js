import { config } from "dotenv";
import fetch from "node-fetch";

config();

export async function callGroq(diff, engineConfig = {}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing Groq API key. Set GROQ_API_KEY in .env");
  }

  const model = engineConfig.model || "llama-3.3-70b-versatile"; // or llama-3.1-8b-instant, gemma2-9b-it
  const isDetailed = engineConfig.detailed || false;

  const basePrompt = `Analyze this git diff and create a task description for Azure DevOps or similar tools.`;
  
  const concisePrompt = `${basePrompt}
Respond in exactly this format:

TITLE: [Brief summary of the change]
SUMMARY: [What was changed and why]
TECHNICAL: [Implementation notes and considerations]

Keep responses concise and focused.`;

  const verbosePrompt = `${basePrompt}
Create a comprehensive task description with detailed sections.

Respond in exactly this format:

TITLE: [Clear, actionable title]
SUMMARY: [Comprehensive summary with:
- What was changed and why
- Key functionality added/modified
- Business impact or user benefits
- Requirements or acceptance criteria
- Test coverage requirements if applicable]
TECHNICAL: [Detailed technical considerations including:
- Implementation approach and architecture decisions
- Dependencies and integrations affected
- Performance considerations
- Security considerations if applicable
- Testing strategy and recommendations
- Deployment considerations
- Potential risks and mitigation strategies
- Code quality and best practices notes]

Provide detailed, actionable information that would help a developer understand the full scope and context.`;

  const prompt = isDetailed ? verbosePrompt : concisePrompt;

  const requestBody = {
    model: model,
    messages: [
      {
        role: "user",
        content: `${prompt}

Git diff:
\`\`\`
${diff}
\`\`\``,
      },
    ],
    temperature: engineConfig.temperature || 0.3,
    max_tokens: isDetailed ? (engineConfig.maxTokens || 2000) : (engineConfig.maxTokens || 1000),
  };

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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
