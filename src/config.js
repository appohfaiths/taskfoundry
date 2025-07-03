import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_FILE_NAMES = [
  ".taskfoundry.json",
  ".taskfoundry.config.json",
  "taskfoundry.config.json",
];

const DEFAULT_CONFIG = {
  engine: "groq",
  output: "markdown",
  staged: false,
  model: "llama-3.3-70b-versatile",
  temperature: 0.3,
  maxTokens: 1000,
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

/**
 * Load configuration from various sources in order of priority:
 * 1. Command line arguments
 * 2. Project config file (.taskfoundry.json)
 * 3. Global config file (~/.taskfoundry.json)
 * 4. Default configuration
 */
export function loadConfig(cliOptions = {}) {
  let config = { ...DEFAULT_CONFIG };

  // Try to load global config
  const globalConfigPath = join(homedir(), ".taskfoundry.json");
  if (existsSync(globalConfigPath)) {
    try {
      const globalConfig = JSON.parse(readFileSync(globalConfigPath, "utf-8"));
      config = { ...config, ...globalConfig };
    } catch (error) {
      console.warn(
        `Warning: Could not parse global config file: ${error.message}`,
      );
    }
  }

  // Try to load project config
  const projectConfigPath = findProjectConfig();
  if (projectConfigPath) {
    try {
      const projectConfig = JSON.parse(
        readFileSync(projectConfigPath, "utf-8"),
      );
      config = { ...config, ...projectConfig };
    } catch (error) {
      console.warn(
        `Warning: Could not parse project config file: ${error.message}`,
      );
    }
  }

  // Override with CLI options
  config = { ...config, ...cliOptions };

  // Validate configuration
  validateConfig(config);

  return config;
}

/**
 * Find project configuration file
 */
function findProjectConfig() {
  const cwd = process.cwd();

  for (const fileName of CONFIG_FILE_NAMES) {
    const configPath = join(cwd, fileName);
    if (existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

/**
 * Validate configuration options
 */
function validateConfig(config) {
  const validOutputFormats = ["markdown", "json"];
  const validEngines = ["openai", "groq", "local"];

  if (!validOutputFormats.includes(config.output)) {
    throw new Error(
      `Invalid output format: ${config.output}. Must be one of: ${validOutputFormats.join(", ")}`,
    );
  }

  if (!validEngines.includes(config.engine)) {
    throw new Error(
      `Invalid engine: ${config.engine}. Must be one of: ${validEngines.join(", ")}`,
    );
  }

  if (config.temperature < 0 || config.temperature > 2) {
    throw new Error("Temperature must be between 0 and 2");
  }

  if (config.maxTokens < 1 || config.maxTokens > 4000) {
    throw new Error("Max tokens must be between 1 and 4000");
  }
}

/**
 * Get configuration schema for help/documentation
 */
export function getConfigSchema() {
  return {
    engine: {
      type: "string",
      default: "openai",
      description: "AI engine to use (openai or local)",
      enum: ["openai", "local"],
    },
    output: {
      type: "string",
      default: "markdown",
      description: "Output format",
      enum: ["markdown", "json"],
    },
    staged: {
      type: "boolean",
      default: false,
      description: "Use staged changes instead of last commit",
    },
    model: {
      type: "string",
      default: "llama-3.3-70b-versatile",
      description: "AI model to use (Upstream model name or local model name)",
    },
    temperature: {
      type: "number",
      default: 0.3,
      description: "AI model temperature (0-2)",
      minimum: 0,
      maximum: 2,
    },
    maxTokens: {
      type: "number",
      default: 1000,
      description: "Maximum tokens for AI response",
      minimum: 1,
      maximum: 4000,
    },
    customPrompt: {
      type: "string",
      default: null,
      description: "Path to custom prompt template file",
    },
    outputFile: {
      type: "string",
      default: null,
      description: "File to save output to (instead of stdout)",
    },
    includeFileNames: {
      type: "boolean",
      default: true,
      description: "Include file names in the analysis",
    },
    includeDiffStats: {
      type: "boolean",
      default: true,
      description: "Include diff statistics in the analysis",
    },
    excludePatterns: {
      type: "array",
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
  };
}
