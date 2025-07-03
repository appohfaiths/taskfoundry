import { execSync } from "child_process";
import { generateTaskFromDiff as callAIEngine } from "./engines/index.js";
import { formatMarkdown, formatJSON } from "./formatters.js";
import { writeFileSync } from "fs";

export async function generateTaskFromDiff(options) {
  if (!["markdown", "json"].includes(options.output)) {
    throw new Error('Output format must be "markdown" or "json"');
  }

  try {
    // Check if we're in a git repository
    try {
      execSync("git rev-parse --git-dir", { stdio: "ignore" });
    } catch {
      throw new Error(
        "Not a git repository. Initialize with 'git init' first.",
      );
    }

    let diff;

    if (options.staged) {
      // Use staged changes
      const stagedFiles = execSync("git diff --cached --name-only", {
        encoding: "utf-8",
      }).trim();

      if (!stagedFiles) {
        throw new Error(
          'No staged changes found. Use "git add <files>" to stage changes first.',
        );
      }

      diff = execSync("git diff --cached", { encoding: "utf-8" }).trim();
    } else if (options.commit) {
      // Compare against specific commit
      try {
        diff = execSync(`git diff ${options.commit}`, {
          encoding: "utf-8",
        }).trim();
      } catch (error) {
        throw new Error(
          `Invalid commit hash: ${options.commit}. Details: ${error.message}`,
        );
      }
    } else {
      // Try to get diff from last commit with better error handling
      try {
        // First check if we have any commits
        const commitCount = execSync("git rev-list --count HEAD", {
          encoding: "utf-8",
          stdio: "pipe",
        }).trim();

        if (commitCount === "0") {
          throw new Error(`No commits found in repository. Try one of these options:

📝 Option 1 - Use staged changes:
   git add .
   ct --staged --detailed

📝 Option 2 - Make your first commit:
   git add .
   git commit -m "Initial commit"
   ct --detailed

📝 Option 3 - Compare against specific commit:
   ct --commit <commit-hash> --detailed`);
        }

        if (parseInt(commitCount) < 2) {
          // Only one commit, compare against empty tree
          diff = execSync("git diff --root HEAD", { encoding: "utf-8" }).trim();
        } else {
          // Normal case: compare against previous commit
          diff = execSync("git diff HEAD~1", { encoding: "utf-8" }).trim();
        }
      } catch (error) {
        if (error.message.includes("No commits found")) {
          throw error; // Re-throw our custom error
        }

        // Fallback to working directory changes
        try {
          diff = execSync("git diff", { encoding: "utf-8" }).trim();

          if (!diff) {
            throw new Error(`No changes found. Try one of these options:

📝 Option 1 - Use staged changes:
   git add .
   ct --staged --detailed

📝 Option 2 - View uncommitted changes:
   # Make some changes first, then:
   ct --detailed

📝 Option 3 - Compare against specific commit:
   ct --commit <commit-hash> --detailed`);
          }
        } catch (fallbackError) {
          throw new Error(
            `Unable to generate diff. Original error: ${error.message}. Fallback error: ${fallbackError.message}`,
          );
        }
      }
    }

    if (!diff) {
      throw new Error("No changes found to analyze.");
    }

    // Generate task using AI engine
    const result = await callAIEngine(diff, options);

    // Format and output result
    const formatted =
      options.output === "json" ? formatJSON(result) : formatMarkdown(result);

    if (options.file) {
      writeFileSync(options.file, formatted);
      console.log(`✅ Task saved to ${options.file}`);
    } else {
      console.log(formatted);
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Git is not installed or not in PATH");
    } else {
      throw new Error(`Error generating task: ${error.message}`);
    }
  }
}
