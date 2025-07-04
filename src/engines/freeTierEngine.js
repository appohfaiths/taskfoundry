import fetch from "node-fetch";
import { getUsage, updateUsage, hasAnyApiKey } from "../config/systemConfig.js";
import { interactiveSetup } from "../utils/keyManager.js";

const FREE_TIER_LIMITS = {
  daily: 10, // Conservative limit for shared key
  monthly: 100, // Monthly allowance
};

// Shared community API key for free tier (you'd need to set this up)
const COMMUNITY_API_URL = process.env.TASKFOUNDRY_API_URL || 'https://taskfoundry-api.vercel.app/api';

export async function callFreeTier(diff, engineConfig = {}) {
  const usage = getUsage();

  if (!canUseFreeTier(usage)) {
    // If user has API keys, suggest using them
    if (hasAnyApiKey()) {
      throw new Error(`Free tier limit reached! 

📊 Usage: ${usage.today}/${FREE_TIER_LIMITS.daily} requests today
📅 Monthly: ${usage.month}/${FREE_TIER_LIMITS.monthly} requests this month

💡 You have API keys configured! Use unlimited access:
   ct --engine auto --staged

🔧 Or configure more providers:
   ct setup`);
    }

    // Offer to set up API keys
    console.log(`\n📊 Free tier limit reached!`);
    console.log(`   Today: ${usage.today}/${FREE_TIER_LIMITS.daily} requests`);
    console.log(
      `   Monthly: ${usage.month}/${FREE_TIER_LIMITS.monthly} requests\n`,
    );

    console.log("🚀 Get unlimited access with your own API key:");
    console.log("   1. Groq: 1000 free requests/day (Recommended)");
    console.log("   2. OpenAI: Pay-per-use, very reliable");
    console.log("   3. Hugging Face: Generous free tier\n");

    // Prompt for setup
    const { createInterface } = await import("readline");
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question("Would you like to set up an API key now? (Y/n): ", resolve);
    });
    rl.close();

    if (!answer.toLowerCase().startsWith("n")) {
      await interactiveSetup();
      throw new Error("Setup complete! Please run your command again.");
    } else {
      throw new Error(
        'Free tier limit reached. Run "ct setup" when ready to configure API keys.',
      );
    }
  }

  try {
    console.log(`🆓 Using TaskFoundry free tier (${usage.today + 1}/${FREE_TIER_LIMITS.daily} today)...`);

    const endpoint = engineConfig.commitMode ? 'commit' : 'task';
    console.log(`🔗 Endpoint: ${COMMUNITY_API_URL}/${endpoint}`);
    const response = await fetch(`${COMMUNITY_API_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        diff,
        engineConfig
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Free tier request failed');
    }

    const result = await response.json();
    updateUsage();

    if (engineConfig.commitMode) {
      const commitMessage = result.data?.commit || result.data?.message || result.commit || result.message || 'chore: update code';

      // Return a structured object that matches what your formatCommitMessage expects
      return {
        type: 'commit',
        message: commitMessage,
        commit: commitMessage,
        description: commitMessage
      };
    } else {
      // For task mode, ensure we return the data with proper structure
      const taskData = result.data;

      // Ensure all required fields are present
      return {
        type: taskData?.type || 'task',
        title: taskData?.title || 'Task Title',
        summary: taskData?.summary || 'Task summary not available',
        technical: taskData?.technical || 'Technical details not available',
        ...taskData // Include any additional fields
      };
    }
  } catch (error) {
    console.error("Free tier unavailable:", error.message);

    // Fallback to API key setup
    console.log("\n🔧 Free tier is temporarily unavailable.");
    console.log("   Set up your own API key for guaranteed access:\n");

    const { createInterface } = await import("readline");
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question("Set up API key now? (Y/n): ", resolve);
    });
    rl.close();

    if (!answer.toLowerCase().startsWith("n")) {
      await interactiveSetup();
      throw new Error("Setup complete! Please run your command again.");
    } else {
      throw new Error(
        'Free tier unavailable. Run "ct setup" to configure your own API key.',
      );
    }
  }
}

// Use system config for usage tracking instead of local file
function canUseFreeTier(usage) {
  return (
    usage.today < FREE_TIER_LIMITS.daily &&
    usage.month < FREE_TIER_LIMITS.monthly
  );
}
