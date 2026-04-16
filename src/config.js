// src/config.js
import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

config();

// Import system config functions
import { getSystemConfig, getApiKey } from "./config/systemConfig.js";

const DEFAULT_CONFIG = {
  engine: "auto",
  output: "markdown",
  staged: false,
  model: "llama-3.3-70b-versatile",
  temperature: 0.3,
  maxTokens: 1000,
  detailed: false,
  customPrompt: null,
  outputFile: null,
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

export function loadConfig(cliOptions = {}) {
  // 1. Start with default config
  let config = { ...DEFAULT_CONFIG };

  // 2. Merge system-wide configuration
  try {
    const systemConfig = getSystemConfig();
    if (systemConfig.preferences) {
      // Map system preferences to config format
      const systemPrefs = {
        engine: systemConfig.preferences.defaultEngine,
        output: systemConfig.preferences.defaultOutput,
        model: systemConfig.preferences.defaultModel,
        temperature: systemConfig.preferences.defaultTemperature,
        maxTokens: systemConfig.preferences.defaultMaxTokens,
        detailed: systemConfig.preferences.detailed,
        includeFileNames: systemConfig.preferences.includeFileNames,
        includeDiffStats: systemConfig.preferences.includeDiffStats,
        excludePatterns: systemConfig.preferences.excludePatterns,
      };

      // Only merge defined values
      Object.entries(systemPrefs).forEach(([key, value]) => {
        if (value !== undefined) {
          config[key] = value;
        }
      });
    }
  } catch (error) {
    if (
      process.env.TASKFOUNDRY_VERBOSE ||
      process.env.NODE_ENV === "development"
    ) {
      console.warn(`Warning: Could not load system config: ${error.message}`);
    }
  }

  // 3. Merge project-specific config (.taskfoundry.json)
  const projectConfigPaths = [
    join(process.cwd(), ".taskfoundry.json"),
    join(homedir(), ".taskfoundry.json"),
  ];

  for (const configPath of projectConfigPaths) {
    if (existsSync(configPath)) {
      try {
        const fileConfig = JSON.parse(readFileSync(configPath, "utf-8"));
        config = { ...config, ...fileConfig };
        break; // Use first found config file
      } catch (error) {
        console.warn(`Warning: Invalid JSON in ${configPath}`);
        if (
          process.env.TASKFOUNDRY_VERBOSE ||
          process.env.NODE_ENV === "development"
        ) {
          console.warn(
            `Warning: Could not load system config: ${error.message}`,
          );
        }
      }
    }
  }

  // 4. Merge CLI options (highest priority)
  config = { ...config, ...cliOptions };

  // 5. Add API keys from system config
  config.apiKeys = {
    groq: getApiKey("groq"),
    openai: getApiKey("openai"),
    huggingface: getApiKey("huggingface"),
  };

  // 6. Set environment variables for backward compatibility
  if (!process.env.GROQ_API_KEY && config.apiKeys.groq) {
    process.env.GROQ_API_KEY = config.apiKeys.groq;
  }
  if (!process.env.OPENAI_API_KEY && config.apiKeys.openai) {
    process.env.OPENAI_API_KEY = config.apiKeys.openai;
  }
  if (!process.env.HUGGINGFACE_API_KEY && config.apiKeys.huggingface) {
    process.env.HUGGINGFACE_API_KEY = config.apiKeys.huggingface;
  }

  return config;
}

export function getConfigSchema() {
  return {
    type: "object",
    properties: {
      engine: {
        type: "string",
        enum: ["auto", "groq", "openai", "freetier", "local"],
        default: "auto",
        description: "AI engine to use for generation",
      },
      output: {
        type: "string",
        enum: ["markdown", "json"],
        default: "markdown",
        description: "Output format",
      },
      staged: {
        type: "boolean",
        default: false,
        description: "Use staged changes instead of last commit",
      },
      model: {
        type: "string",
        default: "llama-3.3-70b-versatile",
        description: "AI model to use",
      },
      temperature: {
        type: "number",
        minimum: 0,
        maximum: 2,
        default: 0.3,
        description: "AI temperature for creativity",
      },
      maxTokens: {
        type: "integer",
        minimum: 100,
        maximum: 4000,
        default: 1000,
        description: "Maximum tokens for AI response",
      },
      detailed: {
        type: "boolean",
        default: false,
        description: "Generate detailed task descriptions",
      },
      customPrompt: {
        type: ["string", "null"],
        default: null,
        description: "Path to custom prompt template",
      },
      outputFile: {
        type: ["string", "null"],
        default: null,
        description: "Save output to file instead of stdout",
      },
      includeFileNames: {
        type: "boolean",
        default: true,
        description: "Include file names in analysis",
      },
      includeDiffStats: {
        type: "boolean",
        default: true,
        description: "Include diff statistics in analysis",
      },
      excludePatterns: {
        type: "array",
        items: {
          type: "string",
        },
        default: [
          "*.lock",
          "*.log",
          "node_modules/**",
          ".git/**",
          "dist/**",
          "build/**",
        ],
        description: "Patterns to exclude from diff analysis",
      },
    },
    required: ["engine", "output"],
  };
}

// Utility function to validate configuration
export function validateConfig(config) {
  const errors = [];

  // Basic type checking
  if (
    !["auto", "groq", "openai", "freetier", "local"].includes(config.engine)
  ) {
    errors.push(`Invalid engine: ${config.engine}`);
  }

  if (!["markdown", "json"].includes(config.output)) {
    errors.push(`Invalid output format: ${config.output}`);
  }

  if (
    typeof config.temperature !== "number" ||
    config.temperature < 0 ||
    config.temperature > 2
  ) {
    errors.push(
      `Invalid temperature: ${config.temperature}. Must be between 0 and 2`,
    );
  }

  if (
    typeof config.maxTokens !== "number" ||
    config.maxTokens < 100 ||
    config.maxTokens > 4000
  ) {
    errors.push(
      `Invalid maxTokens: ${config.maxTokens}. Must be between 100 and 4000`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Migration helper for existing users
export function migrateToSystemConfig() {
  console.log("🔄 Migrating to system-wide configuration...");

  // Check for existing .env file with API keys
  if (existsSync(".env")) {
    const envContent = readFileSync(".env", "utf-8");
    const apiKeys = {};

    if (envContent.includes("GROQ_API_KEY=")) {
      const match = envContent.match(/GROQ_API_KEY=(.+)/);
      if (match) apiKeys.groq = match[1].trim();
    }

    if (envContent.includes("OPENAI_API_KEY=")) {
      const match = envContent.match(/OPENAI_API_KEY=(.+)/);
      if (match) apiKeys.openai = match[1].trim();
    }

    if (envContent.includes("HUGGINGFACE_API_KEY=")) {
      const match = envContent.match(/HUGGINGFACE_API_KEY=(.+)/);
      if (match) apiKeys.huggingface = match[1].trim();
    }

    if (Object.keys(apiKeys).length > 0) {
      console.log(
        "📋 Found API keys in .env file. Would you like to migrate them to system-wide config?",
      );
      // This would trigger an interactive migration
      return apiKeys;
    }
  }

  return null;
}
