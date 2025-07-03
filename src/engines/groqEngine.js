import { config } from "dotenv";
import fetch from "node-fetch";

config();

export async function callGroq(diff, engineConfig = {}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing Groq API key. Set GROQ_API_KEY in .env");
  }

  const model = engineConfig.model || "llama-3.3-70b-versatile";
  const isDetailed = engineConfig.detailed || false;

  const basePrompt = `Analyze this git diff and create a task description for Azure DevOps or similar tools.`;

  const concisePrompt = `${basePrompt}
Respond in exactly this format:

TITLE: [Brief summary of the change]
SUMMARY: [What was changed and why]
TECHNICAL: [Implementation notes and considerations]

Keep responses concise and focused.`;

  const detailedPrompt = `${basePrompt}
Create a comprehensive task description with detailed sections.

Respond in exactly this format:

TITLE: [Clear, actionable title]
SUMMARY: [Comprehensive summary including:
- What was changed and why
- Key functionality added/modified  
- Business impact or user benefits
- Requirements or acceptance criteria
- Test coverage requirements if applicable]
TECHNICAL: [Detailed technical considerations including:
- Implementation approach and architecture decisions
- Dependencies and integrations affected
- Testing strategy and recommendations
- Potential risks and mitigation strategies
- Code quality and best practices notes
- Performance and security considerations if applicable]

Provide detailed, actionable information for developers.`;

  const prompt = isDetailed ? detailedPrompt : concisePrompt;

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
    max_tokens: isDetailed
      ? engineConfig.maxTokens || 2000
      : engineConfig.maxTokens || 1000,
  };

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Groq API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  // Enhanced parsing logic to handle multi-line responses
  const result = { title: "", summary: "", tech: "" };
  const lines = content.split("\n");
  let currentSection = "";
  let currentContent = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("TITLE:")) {
      if (currentSection && currentContent.length > 0) {
        result[currentSection] = currentContent.join("\n").trim();
      }
      result.title = trimmedLine.substring(6).trim();
      currentSection = "";
      currentContent = [];
    } else if (trimmedLine.startsWith("SUMMARY:")) {
      if (currentSection && currentContent.length > 0) {
        result[currentSection] = currentContent.join("\n").trim();
      }
      const summaryContent = trimmedLine.substring(8).trim();
      currentSection = "summary";
      currentContent = summaryContent ? [summaryContent] : [];
    } else if (trimmedLine.startsWith("TECHNICAL:")) {
      if (currentSection && currentContent.length > 0) {
        result[currentSection] = currentContent.join("\n").trim();
      }
      const techContent = trimmedLine.substring(10).trim();
      currentSection = "tech";
      currentContent = techContent ? [techContent] : [];
    } else if (currentSection && trimmedLine) {
      currentContent.push(trimmedLine);
    }
  }

  // Handle the last section
  if (currentSection && currentContent.length > 0) {
    result[currentSection] = currentContent.join("\n").trim();
  }

  // Fallback: if parsing fails, try simple extraction
  if (!result.summary && !result.tech) {
    const titleMatch = content.match(/TITLE:\s*(.+)/);
    const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)(?=TECHNICAL:|$)/);
    const techMatch = content.match(/TECHNICAL:\s*([\s\S]*?)$/);

    if (titleMatch) result.title = titleMatch[1].trim();
    if (summaryMatch) result.summary = summaryMatch[1].trim();
    if (techMatch) result.tech = techMatch[1].trim();
  }

  return result;
}
