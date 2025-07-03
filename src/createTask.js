import { execSync } from "child_process";
import { generateTaskFromDiff as callAIEngine } from "./engines/index.js";
import { formatMarkdown, formatJSON } from "./formatters.js";

export async function generateTaskFromDiff(options) {
  if (!["markdown", "json"].includes(options.output)) {
    throw new Error('Output format must be "markdown" or "json"');
  }

  try {
    let diffCmd = "git diff HEAD~1";
    if (options.staged) {
      diffCmd = "git diff --cached";
    }

    // Check if we're in a git repository
    try {
      execSync("git rev-parse --git-dir", { stdio: "ignore" });
    } catch {
      throw new Error("Not in a git repository");
    }

    const diff = execSync(diffCmd, { encoding: "utf-8" }).trim();

    if (!diff) {
      console.log("No changes found.");
      return;
    }

    const result = await callAIEngine(diff, options);

    const formatted =
      options.output === "json" ? formatJSON(result) : formatMarkdown(result);

    console.log(formatted);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error("Git is not installed or not in PATH");
    } else {
      console.error("Error generating task:", error.message);
    }
    process.exit(1);
  }
}
