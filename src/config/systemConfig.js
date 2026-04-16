// src/config/systemConfig.js
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const TASKFOUNDRY_DIR = join(homedir(), ".taskfoundry");
const CONFIG_FILE = join(TASKFOUNDRY_DIR, "config.json");
const USAGE_FILE = join(TASKFOUNDRY_DIR, "usage.json");

// Ensure config directory exists
function ensureConfigDir() {
  if (!existsSync(TASKFOUNDRY_DIR)) {
    mkdirSync(TASKFOUNDRY_DIR, { recursive: true });
  }
}

export function getSystemConfig() {
  ensureConfigDir();

  if (!existsSync(CONFIG_FILE)) {
    const defaultConfig = {
      apiKeys: {},
      preferences: {
        defaultEngine: "auto",
        defaultModel: "llama-3.3-70b-versatile",
        defaultOutput: "markdown",
      },
      version: "1.0.0",
    };
    saveSystemConfig(defaultConfig);
    return defaultConfig;
  }

  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch (error) {
    console.error("❌ Failed to read config file:", error.message);
    console.warn("⚠️  Corrupted config file, creating new one...");
    const defaultConfig = {
      apiKeys: {},
      preferences: {
        defaultEngine: "auto",
        defaultModel: "llama-3.3-70b-versatile",
        defaultOutput: "markdown",
      },
      version: "1.0.0",
    };
    saveSystemConfig(defaultConfig);
    return defaultConfig;
  }
}

export function saveSystemConfig(config) {
  ensureConfigDir();
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("❌ Failed to save config:", error.message);
  }
}

export function setApiKey(provider, apiKey) {
  const config = getSystemConfig();
  config.apiKeys[provider] = apiKey;
  saveSystemConfig(config);
  console.log(`✅ ${provider.toUpperCase()} API key saved system-wide`);
}

export function getApiKey(provider) {
  const config = getSystemConfig();
  return (
    config.apiKeys[provider] || process.env[`${provider.toUpperCase()}_API_KEY`]
  );
}

export function hasAnyApiKey() {
  const config = getSystemConfig();
  return (
    Object.keys(config.apiKeys).length > 0 ||
    process.env.GROQ_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.HUGGINGFACE_API_KEY
  );
}

export function listApiKeys() {
  const config = getSystemConfig();
  const keys = Object.keys(config.apiKeys);

  console.log("\n🔑 Configured API Keys:");
  if (keys.length === 0) {
    console.log("   None configured");
  } else {
    keys.forEach((provider) => {
      const key = config.apiKeys[provider];
      const masked =
        key.substring(0, 8) + "***" + key.substring(key.length - 4);
      console.log(`   ${provider}: ${masked}`);
    });
  }

  // Also check environment variables
  const envKeys = [];
  if (process.env.GROQ_API_KEY) envKeys.push("groq (env)");
  if (process.env.OPENAI_API_KEY) envKeys.push("openai (env)");
  if (process.env.HUGGINGFACE_API_KEY) envKeys.push("huggingface (env)");

  if (envKeys.length > 0) {
    console.log("\n🌍 Environment Variables:");
    envKeys.forEach((key) => console.log(`   ${key}`));
  }
}

export function getUsage() {
  ensureConfigDir();

  if (!existsSync(USAGE_FILE)) {
    const today = new Date().toDateString();
    const month = new Date().toISOString().slice(0, 7);
    return {
      today: 0,
      month: 0,
      lastUsed: today,
      currentMonth: month,
    };
  }

  try {
    const usage = JSON.parse(readFileSync(USAGE_FILE, "utf-8"));
    const today = new Date().toDateString();
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Reset daily counter if it's a new day
    if (usage.lastUsed !== today) {
      usage.today = 0;
      usage.lastUsed = today;
    }

    // Reset monthly counter if it's a new month
    if (usage.currentMonth !== currentMonth) {
      usage.month = 0;
      usage.currentMonth = currentMonth;
    }

    return usage;
  } catch {
    const today = new Date().toDateString();
    const month = new Date().toISOString().slice(0, 7);
    return {
      today: 0,
      month: 0,
      lastUsed: today,
      currentMonth: month,
    };
  }
}

export function updateUsage() {
  ensureConfigDir();
  const usage = getUsage();
  usage.today += 1;
  usage.month += 1;

  try {
    writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
  } catch {
    // Ignore write errors
  }
}
