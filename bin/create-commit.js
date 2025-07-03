#!/usr/bin/env node

import { program } from "commander";
import { generateCommitMessage } from "../src/createCommit.js";
import { loadConfig } from "../src/config.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8"),
);

program
  .name("create-commit")
  .description("Generate conventional commit message from staged changes")
  .version(packageJson.version)
  .option(
    "--type <type>",
    "Commit type: feat, fix, docs, style, refactor, perf, test, chore, ci, build",
  )
  .option("--scope <scope>", "Commit scope (optional)")
  .option("--breaking", "Mark as breaking change")
  .option("--engine <engine>", "Engine to use: openai, groq, or local")
  .option("--model <model>", "AI model to use")
  .option("--temperature <temp>", "AI temperature (0-2)", parseFloat)
  .option("--file <path>", "Save commit message to file instead of stdout")
  .option("--copy", "Copy commit message to clipboard (macOS only)")
  .option("--verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      const config = loadConfig(options);
      if (typeof config.exclude === "string") {
        config.excludePatterns = config.exclude.split(",").map((p) => p.trim());
      }

      await generateCommitMessage(config);
    } catch (error) {
      console.error("Error:", error.message);

      if (options.verbose) {
        console.error(error.stack);
      }

      process.exit(1);
    }
  });

program.addHelpText(
  "after",
  `
Examples:
  $ create-commit                         # Generate from staged changes
  $ create-commit --type feat             # Specify commit type
  $ create-commit --scope api             # Add scope
  $ create-commit --breaking              # Mark as breaking change
  $ create-commit --file commit-msg.txt   # Save to file
  $ create-commit --copy                  # Copy to clipboard (macOS)

Commit Types:
  feat      A new feature
  fix       A bug fix
  docs      Documentation only changes
  style     Changes that do not affect the meaning of the code
  refactor  A code change that neither fixes a bug nor adds a feature
  perf      A code change that improves performance
  test      Adding missing tests or correcting existing tests
  chore     Changes to the build process or auxiliary tools
  ci        Changes to CI configuration files and scripts
  build     Changes that affect the build system or external dependencies

Configuration:
  Uses the same .taskfoundry.json config file as create-task
  
Environment Variables:
  GROQ_API_KEY                            # Groq API key
  OPENAI_API_KEY                         # OpenAI API key
  LOCAL_MODEL_ENDPOINT                   # Local model endpoint
  `,
);

program.parse(process.argv);
