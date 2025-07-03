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
  .command("setup")
  .description("Configure API keys for unlimited access")
  .action(async () => {
    const { interactiveSetup } = await import("../src/utils/keyManager.js");
    await interactiveSetup();
  });

program
  .name("create-task")
  .description("Generate task content from Git diff using AI")
  .version(packageJson.version)
  .option("--staged", "Use staged changes (git diff --cached)")
  .option("--output <format>", "Output format: markdown or json")
  .option(
    "--engine <engine>",
    "Engine to use: auto, groq, openai, freetier, or local",
  )
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
  .option("--retry", "Enable automatic retry with fallback engines")
  .action(async (options) => {
    try {
      // Load configuration with CLI options override
      const config = loadConfig(options);

      // Convert exclude patterns from string to array if needed
      if (typeof config.exclude === "string") {
        config.excludePatterns = config.exclude.split(",").map((p) => p.trim());
      }

      // If user specified a specific engine but it fails, offer auto fallback
      if (options.retry && config.engine !== "auto") {
        try {
          await generateTaskFromDiff(config);
        } catch (error) {
          if (isRetryableError(error)) {
            console.log(
              `\n🔄 ${config.engine} failed, trying auto fallback...`,
            );
            config.engine = "auto";
            await generateTaskFromDiff(config);
          } else {
            throw error;
          }
        }
      } else {
        await generateTaskFromDiff(config);
      }
    } catch (error) {
      console.error("Error:", error.message);

      if (options.verbose) {
        console.error(error.stack);
      }

      // Provide helpful suggestions based on error type
      if (error.message.includes("429")) {
        console.log("\n💡 Rate limit hit. Try one of these:");
        console.log("   • Wait a few minutes and try again");
        console.log("   • Use auto engine: create-task --engine auto");
        console.log("   • Set up additional API keys: create-task setup");
      } else if (error.message.includes("401")) {
        console.log("\n💡 Authentication failed. Try:");
        console.log("   • Check your API key: create-task config --list");
        console.log("   • Set up new keys: create-task setup");
      }

      process.exit(1);
    }
  });

program.addHelpText(
  "after",
  `
    Examples:
      $ create-task                           # Auto-detects best engine with fallback
      $ create-task --staged                  # Generate from staged changes  
      $ create-task --retry                   # Enable automatic fallback on failure
      $ create-task --engine auto             # Explicit auto mode (default)
      $ create-task --engine groq             # Force Groq (no fallback)
      $ create-task --output json             # Output as JSON
      $ create-task --detailed                # Generate detailed task description
      $ create-task --file task.md            # Save to file
      $ create-task --commit abc123           # Compare against specific commit
    
    Setup:
      $ create-task setup                     # Interactive API key setup (system-wide)
      $ create-task config --list             # View current configuration
      $ create-task config --reset            # Reset system-wide config
    
    Engines (with automatic fallback in auto mode):
      auto        Tries engines in order: groq → openai → huggingface → freetier
      groq        Use Groq API only (configure with: create-task setup)
      openai      Use OpenAI API only (configure with: create-task setup)
      huggingface Use Hugging Face API only (configure with: create-task setup)
      freetier    Use free tier only (no setup required, 50 requests/day)
      local       Use local model endpoint
    
    Fallback Behavior:
      • Auto mode automatically tries available engines if one fails
      • Specific engines don't fallback (use --retry for fallback)
      • Rate limits (429) and service errors trigger automatic fallback
      • Authentication errors (401) don't trigger fallback
    
    Configuration Priority (highest to lowest):
      1. CLI arguments                        # --engine groq --detailed
      2. Project config                       # .taskfoundry.json in current directory
      3. System-wide config                   # ~/.taskfoundry/config.json
      4. Default values
    
    API Key Management:
      System-wide:     create-task setup      # Saves to ~/.taskfoundry/config.json
      Legacy support:  .env files still work # Backward compatible
      
    Migration:
      Existing .env files and .taskfoundry.json configs continue to work.
      Run 'create-task setup' to migrate to the new system-wide configuration.
    `,
);

program
  .command("config")
  .description("Manage TaskFoundry configuration")
  .option("--list", "List current configuration and API keys")
  .option("--reset", "Reset system-wide configuration to defaults")
  .option("--schema", "Show configuration schema")
  .option("--legacy", "Show legacy project-based configuration")
  .action(async (options) => {
    try {
      if (options.schema) {
        console.log("Configuration Schema:");
        console.log(JSON.stringify(getConfigSchema(), null, 2));
        return;
      }

      if (options.legacy) {
        console.log("Legacy Project Configuration:");
        console.log(JSON.stringify(loadConfig(), null, 2));
        return;
      }

      if (options.reset) {
        const { saveSystemConfig } = await import(
          "../src/config/systemConfig.js"
        );
        const defaultConfig = {
          apiKeys: {},
          preferences: {
            defaultEngine: "auto",
            defaultModel: "llama-3.3-70b-versatile",
            defaultOutput: "markdown",
            defaultTemperature: 0.3,
            defaultMaxTokens: 1000,
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
          },
          version: "1.0.0",
        };
        saveSystemConfig(defaultConfig);
        console.log("✅ System-wide configuration reset to defaults");
        return;
      }
      await showMergedConfiguration();
    } catch (error) {
      console.error("Error managing configuration:", error.message);
      process.exit(1);
    }
  });

program
  .command("migrate")
  .description("Migrate existing configuration to system-wide config")
  .action(async () => {
    try {
      const { migrateToSystemConfig } = await import("../src/config.js");
      const { setApiKey } = await import("../src/config/systemConfig.js");

      const foundKeys = migrateToSystemConfig();

      if (foundKeys) {
        console.log("🔑 Found API keys to migrate:");
        Object.entries(foundKeys).forEach(([provider, key]) => {
          const masked =
            key.substring(0, 8) + "***" + key.substring(key.length - 4);
          console.log(`   ${provider}: ${masked}`);
        });

        const { createInterface } = await import("readline");
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise((resolve) => {
          rl.question(
            "\nMigrate these keys to system-wide config? (Y/n): ",
            resolve,
          );
        });
        rl.close();

        if (!answer.toLowerCase().startsWith("n")) {
          Object.entries(foundKeys).forEach(([provider, key]) => {
            setApiKey(provider, key);
          });
          console.log("✅ API keys migrated to system-wide configuration");
          console.log("💡 You can now delete your .env file if you want");
        }
      } else {
        console.log("📋 No API keys found to migrate");
        console.log('💡 Run "create-task setup" to configure API keys');
      }
    } catch (error) {
      console.error("Error during migration:", error.message);
      process.exit(1);
    }
  });

program
  .command("init")
  .description("Create a default .taskfoundry.json config file")
  .action(() => {
    const defaultConfig = {
      engine: "auto",
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

async function showMergedConfiguration() {
  const { getSystemConfig, listApiKeys } = await import(
    "../src/config/systemConfig.js"
  );

  // Show API keys
  listApiKeys();

  // Show system-wide preferences
  const systemConfig = getSystemConfig();
  console.log("\n⚙️  System-wide Preferences:");
  Object.entries(systemConfig.preferences).forEach(([key, value]) => {
    console.log(`   ${key}: ${JSON.stringify(value)}`);
  });

  // Show current effective configuration (merged)
  console.log("\n📋 Current Effective Configuration:");
  const currentConfig = loadConfig();
  console.log(JSON.stringify(currentConfig, null, 2));

  // Show configuration sources
  console.log("\n📂 Configuration Sources:");
  console.log("   1. System-wide: ~/.taskfoundry/config.json");
  console.log("   2. Project: .taskfoundry.json (if exists)");
  console.log("   3. CLI arguments (highest priority)");
}

function isRetryableError(error) {
  const retryablePatterns = [
    /429/i, // Rate limit
    /503/i, // Service unavailable
    /502/i, // Bad gateway
    /timeout/i, // Timeout
    /network/i, // Network error
    /temporarily/i, // Temporary errors
  ];

  return retryablePatterns.some(
    (pattern) => pattern.test(error.message) || pattern.test(error.code),
  );
}
