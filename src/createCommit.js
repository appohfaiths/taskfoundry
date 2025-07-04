import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { loadConfig } from "./config.js";

const COMMIT_TYPES = {
  feat: "A new feature",
  fix: "A bug fix",
  docs: "Documentation only changes",
  style:
    "Changes that do not affect the meaning of the code (white-space, formatting, etc)",
  refactor: "A code change that neither fixes a bug nor adds a feature",
  perf: "A code change that improves performance",
  test: "Adding missing tests or correcting existing tests",
  chore: "Changes to the build process or auxiliary tools and libraries",
  ci: "Changes to CI configuration files and scripts",
  build: "Changes that affect the build system or external dependencies",
};

export async function generateCommitMessage(options) {
  try {
    // Check if we're in a git repository
    try {
      execSync("git rev-parse --git-dir", { stdio: "ignore" });
    } catch {
      throw new Error("Not a git repository");
    }

    // Check for staged changes
    const stagedFiles = execSync("git diff --cached --name-only", {
      encoding: "utf-8",
    }).trim();
    if (!stagedFiles) {
      throw new Error(
        'No staged changes found. Use "git add" to stage files first.',
      );
    }

    // Get staged diff
    const diff = execSync("git diff --cached", { encoding: "utf-8" }).trim();
    if (!diff) {
      throw new Error("No staged changes found.");
    }

    // Load configuration
    const config = loadConfig(options);

    // Generate commit message using AI
    const commitData = await generateCommitMessageFromDiff(diff, {
      type: options.type,
      scope: options.scope,
      breaking: options.breaking || false,
      engine: options.engine || config.engine || "auto", // Default to auto
      model: options.model || config.model,
      temperature: options.temperature || config.temperature,
    });

    // Format commit message
    const commitMessage = formatCommitMessage(commitData);

    // Output or save the commit message
    if (options.file) {
      writeFileSync(options.file, commitMessage);
      console.log(`✅ Commit message saved to ${options.file}`);
    } else if (options.copy) {
      // Copy to clipboard on macOS
      try {
        execSync(`echo "${commitMessage.replace(/"/g, '\\"')}" | pbcopy`);
        console.log("✅ Commit message copied to clipboard!");
      } catch {
        console.log(
          "❌ Failed to copy to clipboard. Here's your commit message:",
        );
        console.log("─".repeat(50));
        console.log(commitMessage);
        console.log("─".repeat(50));
      }
    } else {
      // Just output to console
      console.log("Generated commit message:");
      console.log("─".repeat(50));
      console.log(commitMessage);
      console.log("─".repeat(50));
    }

    // Show helpful instructions
    console.log("\n💡 To use this commit message:");
    if (options.file) {
      console.log(`   git commit -F ${options.file}`);
    } else {
      console.log(`   git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
    }
  } catch (error) {
    throw new Error(`Failed to generate commit message: ${error.message}`);
  }
}

async function generateCommitMessageFromDiff(diff, options) {
  // Load the appropriate engine
  let engineModule;
  let result;

  switch (options.engine) {
    case "auto":
      engineModule = await import("./engines/autoEngine.js");
      result = await engineModule.callAuto(diff, {
        ...options,
        commitMode: true,
      });
      break;
    case "openai":
      engineModule = await import("./engines/openaiEngine.js");
      result = await engineModule.callOpenAI(diff, {
        ...options,
        commitMode: true,
      });
      break;
    case "groq":
      engineModule = await import("./engines/groqEngine.js");
      result = await engineModule.callGroq(diff, {
        ...options,
        commitMode: true,
      });
      break;
    case "freetier":
      engineModule = await import("./engines/freeTierEngine.js");
      result = await engineModule.callFreeTier(diff, {
        ...options,
        commitMode: true,
      });
      break;
    case "local":
      engineModule = await import("./engines/localModelEngine.js");
      result = await engineModule.callLocalModel(diff, {
        ...options,
        commitMode: true,
      });
      break;
    default:
      throw new Error(`Unknown engine: ${options.engine}`);
  }

  return result;
}

function formatCommitMessage(commitData) {
  // Handle case where commitData is just a string (simple commit message)
  if (typeof commitData === 'string') {
    return commitData;
  }

  // Handle case where commitData has a commit or message field
  if (commitData && (commitData.commit || commitData.message)) {
    return commitData.commit || commitData.message;
  }

  // Handle structured commit data
  if (commitData && typeof commitData === 'object') {
    const { type, scope, description, body, breaking, breakingDescription } = commitData;

    // If we have a pre-formatted message, use it
    if (commitData.description && !type) {
      return commitData.description;
    }

    if (!type && !description) {
      // If we don't have structured data, try to extract from any available field
      const possibleMessage = commitData.description || commitData.commit || commitData.message || 'chore: update code';
      return possibleMessage;
    }

    let message = type || 'chore';

    if (scope) {
      message += `(${scope})`;
    }

    if (breaking) {
      message += "!";
    }

    message += `: ${description || 'update code'}`;

    if (body && body.trim()) {
      message += `\n\n${body}`;
    }

    if (breaking && breakingDescription && breakingDescription.trim()) {
      message += `\n\nBREAKING CHANGE: ${breakingDescription}`;
    }

    return message;
  }

  // Fallback
  return 'chore: update code';
}

export function getCommitTypes() {
  return COMMIT_TYPES;
}

export function validateCommitType(type) {
  return Object.keys(COMMIT_TYPES).includes(type);
}
