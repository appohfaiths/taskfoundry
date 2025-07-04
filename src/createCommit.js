import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { loadConfig } from "./config.js";
import { generateTaskFromDiff } from "./engines/index.js";

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

function escapeShellString(str) {
  // Replace single quotes with '\'' and wrap in single quotes
  return `'${str.replace(/'/g, "'\\''")}'`;
}

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

    // Generate commit message using the main dispatcher with automatic fallback
    const commitData = await generateTaskFromDiff(diff, {
      type: options.type,
      scope: options.scope,
      breaking: options.breaking || false,
      engine: options.engine || config.engine || "auto", // Default to auto
      model: options.model || config.model,
      temperature: options.temperature || config.temperature,
      commitMode: true, // This tells engines to generate commit messages
    });

    // Format commit message
    const commitMessage = formatCommitMessage(commitData);

    // Handle different output options
    if (options.file) {
      writeFileSync(options.file, commitMessage);
      console.log(`✅ Commit message saved to ${options.file}`);
    } else if (options.copy) {
      // Copy to clipboard - use spawn to avoid shell escaping issues
      try {
        const { spawn } = await import("child_process");
        const pbcopy = spawn("pbcopy");
        pbcopy.stdin.write(commitMessage);
        pbcopy.stdin.end();
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

    // Show helpful instructions with properly escaped command
    console.log("\n💡 Copy and paste this command:");
    if (options.file) {
      console.log(`git commit -F ${options.file}`);
    } else {
      // Use single quotes to avoid shell interpretation - ready to copy/paste
      const escapedForDisplay = escapeShellString(commitMessage);
      console.log(`git commit -m ${escapedForDisplay}`);
    }
  } catch (error) {
    throw new Error(`Failed to generate commit message: ${error.message}`);
  }
}

function formatCommitMessage(commitData) {
  // Handle null/undefined input
  if (!commitData) {
    return "chore: update code";
  }

  // Handle case where commitData is just a string (simple commit message)
  if (typeof commitData === "string") {
    return commitData.trim() || "chore: update code";
  }

  // Handle case where commitData has a commit or message field
  if (commitData && (commitData.commit || commitData.message)) {
    const message = commitData.commit || commitData.message;
    return typeof message === "string" ? message.trim() : "chore: update code";
  }

  // Handle structured commit data
  if (commitData && typeof commitData === "object") {
    const { type, scope, description, body, breaking, breakingDescription } =
      commitData;

    // If we have a pre-formatted message, use it
    if (commitData.description && !type) {
      return typeof commitData.description === "string"
        ? commitData.description.trim()
        : "chore: update code";
    }

    if (!type && !description) {
      // If we don't have structured data, try to extract from any available field
      const possibleMessage =
        commitData.description ||
        commitData.commit ||
        commitData.message ||
        "chore: update code";
      return typeof possibleMessage === "string"
        ? possibleMessage.trim()
        : "chore: update code";
    }

    // Validate and sanitize type
    const validTypes = [
      "feat",
      "fix",
      "docs",
      "style",
      "refactor",
      "perf",
      "test",
      "chore",
      "ci",
      "build",
    ];
    const commitType = validTypes.includes(type) ? type : "chore";

    let message = commitType;

    // Add scope if provided and valid
    if (scope && typeof scope === "string" && scope.trim()) {
      const cleanScope = scope.trim().replace(/[()]/g, ""); // Remove existing parentheses
      message += `(${cleanScope})`;
    }

    // Add breaking change indicator
    if (breaking) {
      message += "!";
    }

    // Add description
    const desc =
      description && typeof description === "string"
        ? description.trim()
        : "update code";
    message += `: ${desc}`;

    // Add body if provided
    if (body && typeof body === "string" && body.trim()) {
      message += `\n\n${body.trim()}`;
    }

    // Add breaking change description
    if (
      breaking &&
      breakingDescription &&
      typeof breakingDescription === "string" &&
      breakingDescription.trim()
    ) {
      message += `\n\nBREAKING CHANGE: ${breakingDescription.trim()}`;
    }

    return message;
  }

  // Fallback for any other case
  return "chore: update code";
}

export function getCommitTypes() {
  return COMMIT_TYPES;
}

export function validateCommitType(type) {
  return Object.keys(COMMIT_TYPES).includes(type);
}
