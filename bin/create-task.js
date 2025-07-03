#!/usr/bin/env node

import { program } from "commander";
import { generateTaskFromDiff } from "../src/createTask.js";
import { loadConfig, getConfigSchema } from "../src/config.js";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8"),
);

program
  .name("create-task")
  .description("Generate task content from Git diff using AI")
  .version(packageJson.version)
  .option("--staged", "Use staged changes (git diff --cached)")
  .option("--output <format>", "Output format: markdown or json")
  .option("--engine <engine>", "Engine to use: openai, groq, or local")
  .option("--model <model>", "AI model to use")
  .option("--temperature <temp>", "AI temperature (0-2)", parseFloat)
  .option("--max-tokens <tokens>", "Maximum tokens for AI response", parseInt)
  .option("--commit <hash>", "Compare against specific commit")
  .option("--file <path>", "Save output to file instead of stdout")
  .option("--config <path>", "Path to custom config file")
  .option("--no-file-names", "Exclude file names from analysis")
  .option("--no-diff-stats", "Exclude diff statistics from analysis")
  .option("--exclude <patterns>", "Comma-separated exclude patterns")
  .option("--template <path>", "Custom prompt template file")
  .option("--verbose", "Enable verbose logging")
  .option("--detailed", "Show detailed summary and task descriptions")
  .action(async (options) => {
    try {
      // Load configuration with CLI options override
      const config = loadConfig(options);

      // Convert exclude patterns from string to array if needed
      if (typeof config.exclude === "string") {
        config.excludePatterns = config.exclude.split(",").map((p) => p.trim());
      }

      await generateTaskFromDiff(config);
    } catch (error) {
      console.error("Error:", error.message);

      if (options.verbose) {
        console.error(error.stack);
      }

      process.exit(1);
    }
  });

program
  .addHelpText('after', `
Examples:
  $ create-task                           # Generate from last commit
  $ create-task --staged                  # Generate from staged changes
  $ create-task --output json             # Output as JSON
  $ create-task --detailed                # Generate detailed task description
  $ create-task --engine local            # Use local model
  $ create-task --staged --engine groq --detailed --output markdown           # Generate detailed task from staged changes
  $ create-task --file task.md            # Save to file
  $ create-task --commit abc123           # Compare against specific commit
  $ create-task --exclude "*.test.js"     # Exclude test files

Configuration:
  Create a .taskfoundry.json file in your project or home directory
  to set default options. CLI arguments override config file settings.

Environment Variables:
  Set these in a .env file or your shell:
  GROQ_API_KEY                            # Groq API key
  OPENAI_API_KEY                         # OpenAI API key
  LOCAL_MODEL_ENDPOINT                   # Local model endpoint
  `);

program
  .command("config")
  .description("Show configuration schema and current settings")
  .action(() => {
    console.log("Configuration Schema:");
    console.log(JSON.stringify(getConfigSchema(), null, 2));
    console.log("\nCurrent Configuration:");
    console.log(JSON.stringify(loadConfig(), null, 2));
  });

program
  .command("init")
  .description("Create a default .taskfoundry.json config file")
  .action(() => {
    const defaultConfig = {
      engine: "groq",
      output: "markdown",
      staged: false,
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      maxTokens: 1000,
      detailed: false,
      includeFileNames: true,
      includeDiffStats: true,
      excludePatterns: [
        "*.lock",
        "*.log",
        "node_modules/**",
        ".git/**",
        "dist/**",
        "build/**",
      ],
    };

    writeFileSync(".taskfoundry.json", JSON.stringify(defaultConfig, null, 2));
    console.log("Created .taskfoundry.json config file");
  });

program.parse(process.argv);