// src/engines/freeTierEngine.js
import fetch from "node-fetch";
import { getUsage, updateUsage, hasAnyApiKey } from "../config/systemConfig.js";
import { interactiveSetup } from "../utils/keyManager.js";

const FREE_TIER_LIMITS = {
  daily: 50, // Conservative limit for shared key
  monthly: 1000, // Monthly allowance
};

// Shared community API key for free tier (you'd need to set this up)
const COMMUNITY_GROQ_KEY = process.env.TASKFOUNDRY_COMMUNITY_KEY;

export async function callFreeTier(diff, engineConfig = {}) {
  const usage = getUsage();

  if (!canUseFreeTier(usage)) {
    // If user has API keys, suggest using them
    if (hasAnyApiKey()) {
      throw new Error(`Free tier limit reached! 

📊 Usage: ${usage.today}/${FREE_TIER_LIMITS.daily} requests today
📅 Monthly: ${usage.month}/${FREE_TIER_LIMITS.monthly} requests this month

💡 You have API keys configured! Use unlimited access:
   ct --engine auto --staged

🔧 Or configure more providers:
   ct setup`);
    }

    // Offer to set up API keys
    console.log(`\n📊 Free tier limit reached!`);
    console.log(`   Today: ${usage.today}/${FREE_TIER_LIMITS.daily} requests`);
    console.log(
      `   Monthly: ${usage.month}/${FREE_TIER_LIMITS.monthly} requests\n`,
    );

    console.log("🚀 Get unlimited access with your own API key:");
    console.log("   1. Groq: 1000 free requests/day (Recommended)");
    console.log("   2. OpenAI: Pay-per-use, very reliable");
    console.log("   3. Hugging Face: Generous free tier\n");

    // Prompt for setup
    const { createInterface } = await import("readline");
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question("Would you like to set up an API key now? (Y/n): ", resolve);
    });
    rl.close();

    if (!answer.toLowerCase().startsWith("n")) {
      await interactiveSetup();
      throw new Error("Setup complete! Please run your command again.");
    } else {
      throw new Error(
        'Free tier limit reached. Run "ct setup" when ready to configure API keys.',
      );
    }
  }

  try {
    console.log(
      `🆓 Using TaskFoundry free tier (${usage.today + 1}/${FREE_TIER_LIMITS.daily} today)...`,
    );

    // Use community key with Groq API (preserving your existing logic)
    const result = await callGroqWithCommunityKey(diff, engineConfig);
    updateUsage();

    // Add free tier notice to results
    if (!engineConfig.commitMode && result.tech) {
      result.tech += `\n\n---\n💡 *Generated using TaskFoundry free tier (${usage.today + 1}/${FREE_TIER_LIMITS.daily} requests today). Get your own API key for unlimited access!*`;
    }

    return result;
  } catch (error) {
    console.error("Free tier unavailable:", error.message);

    // Fallback to API key setup
    console.log("\n🔧 Free tier is temporarily unavailable.");
    console.log("   Set up your own API key for guaranteed access:\n");

    const { createInterface } = await import("readline");
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question("Set up API key now? (Y/n): ", resolve);
    });
    rl.close();

    if (!answer.toLowerCase().startsWith("n")) {
      await interactiveSetup();
      throw new Error("Setup complete! Please run your command again.");
    } else {
      throw new Error(
        'Free tier unavailable. Run "ct setup" to configure your own API key.',
      );
    }
  }
}

// Preserve your existing Groq implementation
async function callGroqWithCommunityKey(diff, engineConfig) {
  if (!COMMUNITY_GROQ_KEY) {
    throw new Error(
      "Free tier temporarily unavailable. Please set up your own API key.",
    );
  }

  const model = engineConfig.model || "llama-3.3-70b-versatile";
  const isDetailed = engineConfig.detailed || false;
  const isCommitMode = engineConfig.commitMode || false;

  // Handle commit message generation
  if (isCommitMode) {
    return generateCommitMessage(diff, engineConfig, COMMUNITY_GROQ_KEY);
  }

  // Task generation logic (same as your current implementation)
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
        Authorization: `Bearer ${COMMUNITY_GROQ_KEY}`,
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) {
      throw new Error(
        "Free tier rate limit exceeded. Please try again in a moment or set up your own API key.",
      );
    }
    throw new Error(
      `Free tier API request failed: ${response.status} ${response.statusText}\nDetails: ${errorText}`,
    );
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  // Enhanced parsing logic (same as your current implementation)
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

  // Fallback parsing (preserve your existing logic)
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

// Commit message generation (preserve your existing implementation)
async function generateCommitMessage(diff, engineConfig, apiKey) {
  const { type, scope, breaking } = engineConfig;

  const typePrompt = type
    ? `Use the commit type "${type}".`
    : "Determine the most appropriate commit type from: feat, fix, docs, style, refactor, perf, test, chore, ci, build.";

  const scopePrompt = scope
    ? `Use the scope "${scope}".`
    : "Determine an appropriate scope if relevant (e.g., api, ui, auth, db). Leave empty if not applicable.";

  const breakingPrompt = breaking
    ? "This is a BREAKING CHANGE that affects existing functionality."
    : "Determine if this is a breaking change based on the diff.";

  const prompt = `Generate a conventional commit message for this git diff.

${typePrompt}
${scopePrompt}
${breakingPrompt}

Guidelines:
- Description should be in imperative mood (e.g., "add" not "added" or "adds")
- Keep description under 50 characters if possible
- Description should be lowercase
- Body should explain what and why, not how
- Follow conventional commit format: type(scope): description

Respond in exactly this format:
TYPE: [commit type]
SCOPE: [scope or leave empty if none]
DESCRIPTION: [clear, concise description in imperative mood]
BODY: [optional longer explanation - leave empty if not needed]
BREAKING: [breaking change description if applicable, otherwise leave empty]

Git diff:
\`\`\`
${diff}
\`\`\``;

  const requestBody = {
    model: engineConfig.model || "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: engineConfig.temperature || 0.2,
    max_tokens: engineConfig.maxTokens || 300,
  };

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "Free tier rate limit exceeded. Please try again in a moment.",
      );
    }
    throw new Error(
      `Free tier commit generation failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  // Parse commit message response (preserve your existing logic)
  const result = {
    type: type || "feat",
    scope: scope || "",
    description: "",
    body: "",
    breaking: breaking || false,
    breakingDescription: "",
  };

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("TYPE:")) {
      const extractedType = trimmedLine.substring(5).trim().toLowerCase();
      result.type = extractedType || result.type;
    } else if (trimmedLine.startsWith("SCOPE:")) {
      const extractedScope = trimmedLine.substring(6).trim();
      result.scope =
        extractedScope === "empty" || extractedScope === "none"
          ? ""
          : extractedScope;
    } else if (trimmedLine.startsWith("DESCRIPTION:")) {
      result.description = trimmedLine.substring(12).trim();
    } else if (trimmedLine.startsWith("BODY:")) {
      const bodyContent = trimmedLine.substring(5).trim();
      result.body =
        bodyContent === "empty" || bodyContent === "none" ? "" : bodyContent;
    } else if (trimmedLine.startsWith("BREAKING:")) {
      const breakingContent = trimmedLine.substring(9).trim();
      if (
        breakingContent &&
        breakingContent !== "empty" &&
        breakingContent !== "none"
      ) {
        result.breakingDescription = breakingContent;
        result.breaking = true;
      }
    }
  }

  if (!result.description) {
    throw new Error("Failed to generate commit description");
  }

  return result;
}

// Use system config for usage tracking instead of local file
function canUseFreeTier(usage) {
  return (
    usage.today < FREE_TIER_LIMITS.daily &&
    usage.month < FREE_TIER_LIMITS.monthly
  );
}
