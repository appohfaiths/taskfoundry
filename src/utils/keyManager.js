// src/utils/keyManager.js
import { createInterface } from "readline";
import { setApiKey, getSystemConfig } from "../config/systemConfig.js";

const API_PROVIDERS = {
  groq: {
    name: "Groq",
    url: "https://console.groq.com",
    description: "Fast inference, 1000 free requests/day",
    recommended: true,
  },
  openai: {
    name: "OpenAI",
    url: "https://platform.openai.com",
    description: "GPT models, pay-per-use",
    recommended: false,
  },
  huggingface: {
    name: "Hugging Face",
    url: "https://huggingface.co/settings/tokens",
    description: "Open source models, generous free tier",
    recommended: false,
  },
};

export async function promptForApiKey(provider) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => {
      rl.question(prompt, resolve);
    });

  try {
    const providerInfo = API_PROVIDERS[provider];
    if (!providerInfo) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    console.log(`\n🔑 ${providerInfo.name} API Key Setup`);
    console.log(`   ${providerInfo.description}`);
    console.log(`   Get your free API key: ${providerInfo.url}\n`);

    const apiKey = await question(
      "Enter your API key (or press Enter to skip): ",
    );

    if (apiKey.trim()) {
      setApiKey(provider, apiKey.trim());
      return apiKey.trim();
    }

    return null;
  } finally {
    rl.close();
  }
}

export async function interactiveSetup() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => {
      rl.question(prompt, resolve);
    });

  try {
    console.log("\n🚀 TaskFoundry API Key Setup");
    console.log("   Configure API keys for unlimited access\n");

    // Show current configuration
    const config = getSystemConfig();
    const hasKeys = Object.keys(config.apiKeys).length > 0;

    if (hasKeys) {
      console.log("📋 Current API keys:");
      Object.keys(config.apiKeys).forEach((provider) => {
        const key = config.apiKeys[provider];
        const masked =
          key.substring(0, 8) + "***" + key.substring(key.length - 4);
        console.log(`   ✅ ${provider}: ${masked}`);
      });
      console.log("");
    }

    // Ask which provider to configure
    console.log("🔧 Available providers:");
    Object.entries(API_PROVIDERS).forEach(([key, info], index) => {
      const status = config.apiKeys[key] ? "✅" : "⭕";
      const recommended = info.recommended ? " (Recommended)" : "";
      console.log(
        `   ${index + 1}. ${status} ${info.name}${recommended} - ${info.description}`,
      );
    });

    console.log("   0. Skip setup\n");

    const choice = await question("Choose a provider to configure (0-3): ");
    const providerKeys = Object.keys(API_PROVIDERS);
    const selectedProvider = providerKeys[parseInt(choice) - 1];

    if (selectedProvider) {
      await promptForApiKey(selectedProvider);

      // Ask if they want to configure another
      const more = await question("\nConfigure another provider? (y/N): ");
      if (more.toLowerCase().startsWith("y")) {
        await interactiveSetup();
      }
    }

    console.log(
      "\n✅ Setup complete! You can now use TaskFoundry with unlimited access.",
    );
    console.log("   Try: ct --staged --detailed\n");
  } finally {
    rl.close();
  }
}

export function validateApiKey(provider, apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    return false;
  }

  const patterns = {
    groq: /^gsk_[a-zA-Z0-9]{48,}$/,
    openai: /^sk-[a-zA-Z0-9]{48,}$/,
    huggingface: /^hf_[a-zA-Z0-9]{34,}$/,
  };

  const pattern = patterns[provider];
  return pattern ? pattern.test(apiKey) : apiKey.length > 10;
}
