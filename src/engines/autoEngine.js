import { getApiKey, hasAnyApiKey } from "../config/systemConfig.js";
import { callFreeTier } from "./freeTierEngine.js";
import { callGroq } from "./groqEngine.js";
import { callOpenAI } from "./openaiEngine.js";

export async function callAuto(diff, engineConfig = {}) {
  // Get API keys from system config first, then fall back to environment
  const apiKeys = {
    groq: getApiKey("groq"),
    openai: getApiKey("openai"),
    huggingface: getApiKey("huggingface"),
  };

  // Try engines in order of preference, based on available keys
  const engines = [];

  if (apiKeys.groq) engines.push("groq");
  if (apiKeys.openai) engines.push("openai");
  if (apiKeys.huggingface) engines.push("huggingface");

  // Always add freetier as fallback
  engines.push("freetier");

  if (engines.length === 1 && engines[0] === "freetier") {
    console.log("🆓 No API keys configured, using free tier...");
  }

  const errors = [];

  for (const engine of engines) {
    try {
      // Map models to appropriate engines
      const configWithMappedModel = mapModelToEngine(engineConfig, engine);
      const configWithKeys = { ...configWithMappedModel, apiKeys };

      switch (engine) {
        case "groq":
          console.log("🚀 Trying Groq API...");
          return await callGroq(diff, configWithKeys);

        case "openai":
          console.log("🤖 Trying OpenAI API...");
          return await callOpenAI(diff, configWithKeys);

        case "freetier":
          console.log("🆓 Trying free tier...");
          return await callFreeTier(diff, configWithKeys);
      }
    } catch (error) {
      errors.push(`${engine}: ${error.message}`);

      // Log the failure and continue to next engine
      if (isRetryableError(error)) {
        console.log(
          `⚠️  ${engine} temporarily unavailable (${getErrorType(error)}), trying next option...`,
        );
      } else {
        console.log(`❌ ${engine} failed: ${error.message}`);
      }

      // Don't continue if free tier fails and it's the last option
      if (
        engine === "freetier" &&
        engines.indexOf(engine) === engines.length - 1
      ) {
        break;
      }

      continue;
    }
  }

  // If we get here, all engines failed
  console.error("\n❌ All engines failed:");
  errors.forEach((error) => console.error(`   • ${error}`));

  // Provide helpful suggestions
  if (!hasAnyApiKey()) {
    throw new Error(`All engines failed. Consider setting up API keys for more reliable access:
    
🔧 Quick setup: create-task setup
💡 Free options: Groq (1000 requests/day) or OpenAI trial credits`);
  } else {
    throw new Error(`All configured engines failed. This might be temporary - try again in a few minutes.
    
💡 Suggestions:
• Check your API key quotas/limits
• Try a specific engine: create-task --engine openai
• Use free tier: create-task --engine freetier`);
  }
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

function getErrorType(error) {
  if (/429/i.test(error.message)) return "rate limited";
  if (/503/i.test(error.message)) return "service unavailable";
  if (/502/i.test(error.message)) return "server error";
  if (/timeout/i.test(error.message)) return "timeout";
  if (/network/i.test(error.message)) return "network error";
  return "error";
}

function mapModelToEngine(engineConfig, targetEngine) {
  const { model } = engineConfig;

  // Model mappings between engines
  const modelMappings = {
    // Groq models
    "llama-3.3-70b-versatile": {
      groq: "llama-3.3-70b-versatile",
      openai: "gpt-4o-mini",
      huggingface: "meta-llama/Llama-3.1-70B-Instruct",
      freetier: "llama-3.3-70b-versatile"
    },
    "llama-3.1-70b-versatile": {
      groq: "llama-3.1-70b-versatile",
      openai: "gpt-4o-mini",
      huggingface: "meta-llama/Llama-3.1-70B-Instruct",
      freetier: "llama-3.3-70b-versatile"
    },
    "mixtral-8x7b-32768": {
      groq: "mixtral-8x7b-32768",
      openai: "gpt-4o-mini",
      huggingface: "mistralai/Mixtral-8x7B-Instruct-v0.1",
      freetier: "llama-3.3-70b-versatile"
    },

    // OpenAI models
    "gpt-4o": {
      groq: "llama-3.3-70b-versatile",
      openai: "gpt-4o",
      huggingface: "meta-llama/Llama-3.1-70B-Instruct",
      freetier: "llama-3.3-70b-versatile"
    },
    "gpt-4o-mini": {
      groq: "llama-3.3-70b-versatile",
      openai: "gpt-4o-mini",
      huggingface: "meta-llama/Llama-3.1-70B-Instruct",
      freetier: "llama-3.3-70b-versatile"
    },
    "gpt-4": {
      groq: "llama-3.3-70b-versatile",
      openai: "gpt-4",
      huggingface: "meta-llama/Llama-3.1-70B-Instruct",
      freetier: "llama-3.3-70b-versatile"
    },
    "gpt-3.5-turbo": {
      groq: "llama-3.1-8b-instant",
      openai: "gpt-3.5-turbo",
      huggingface: "meta-llama/Llama-3.1-8B-Instruct",
      freetier: "llama-3.3-70b-versatile"
    },
  };

  // If no model specified, use engine defaults
  if (!model) {
    const defaultModels = {
      groq: "llama-3.3-70b-versatile",
      openai: "gpt-4o-mini",
      huggingface: "meta-llama/Llama-3.1-70B-Instruct",
      freetier: "llama-3.3-70b-versatile"
    };

    return {
      ...engineConfig,
      model: defaultModels[targetEngine] || "gpt-4o-mini",
    };
  }

  // Map the model to the target engine using optional chaining
  const mappedModel = modelMappings[model]?.[targetEngine];
  if (mappedModel) {
    return {
      ...engineConfig,
      model: mappedModel,
    };
  }

  // If no mapping found, use engine-specific defaults
  const engineDefaults = {
    groq: "llama-3.3-70b-versatile",
    openai: "gpt-4o-mini",
    huggingface: "meta-llama/Llama-3.1-70B-Instruct",
    freetier: "llama-3.3-70b-versatile"
  };

  if (model && engineDefaults[targetEngine] !== model) {
    console.log(
      `ℹ️  Model "${model}" not available for ${targetEngine}, using ${engineDefaults[targetEngine]}`,
    );
  }

  return {
    ...engineConfig,
    model: engineDefaults[targetEngine] || model,
  };
}
