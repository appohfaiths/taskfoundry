import { config } from "dotenv";
import OpenAI from "openai";

config();

export async function callOpenAI(diff, engineConfig = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OpenAI API key. Set OPENAI_API_KEY in .env");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const isVerbose = engineConfig.verbose || false;

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

  const prompt = isVerbose ? verbosePrompt : concisePrompt;

  const chat = await openai.chat.completions.create({
    model: engineConfig.model || "gpt-3.5-turbo",
    messages: [{ role: "user", content: `${prompt}

Git diff:
\`\`\`
${diff}
\`\`\`` }],
    temperature: engineConfig.temperature || 0.3,
    max_tokens: isVerbose ? (engineConfig.maxTokens || 2000) : (engineConfig.maxTokens || 1000),
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