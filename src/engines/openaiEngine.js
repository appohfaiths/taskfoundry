import { config } from "dotenv";
import OpenAI from "openai";

config();

export async function callOpenAI(diff, engineConfig = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OpenAI API key. Set OPENAI_API_KEY in .env");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const isDetailed = engineConfig.detailed || false; // Changed from isVerbose

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
- Performance considerations
- Security considerations if applicable
- Testing strategy and recommendations
- Deployment considerations
- Potential risks and mitigation strategies
- Code quality and best practices notes]

Provide detailed, actionable information that would help a developer understand the full scope and context.`;

  const prompt = isDetailed ? detailedPrompt : concisePrompt; // Changed from isVerbose

  const chat = await openai.chat.completions.create({
    model: engineConfig.model || "gpt-3.5-turbo",
    messages: [{ role: "user", content: `${prompt}

Git diff:
\`\`\`
${diff}
\`\`\`` }],
    temperature: engineConfig.temperature || 0.3,
    max_tokens: isDetailed ? (engineConfig.maxTokens || 2000) : (engineConfig.maxTokens || 1000), // Changed from isVerbose
  });

  const content = chat.choices[0].message.content.trim();

  // Enhanced parsing logic to match groqEngine
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