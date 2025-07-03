import { callOpenAI } from "./openaiEngine.js";
import { callGroq } from "./groqEngine.js";
import { callLocalModel } from "./localModelEngine.js";
import { callFreeTier } from "./freeTierEngine.js";
import { callAuto } from "./autoEngine.js";

export async function generateTaskFromDiff(diff, config) {
  const engine = config.engine || "auto";

  try {
    switch (engine) {
      case "openai":
        return await callOpenAI(diff, config);
      case "groq":
        return await callGroq(diff, config);
      case "freetier":
        return await callFreeTier(diff, config);
      case "local":
        return await callLocalModel(diff, config);
      case "auto":
      default:
        return await callAuto(diff, config);
    }
  } catch (error) {
    if (engine !== "auto" && isTemporaryError(error)) {
      console.log(
        `\n💡 ${engine} is temporarily unavailable. Try auto mode for automatic failover:`,
      );
      console.log(`   create-task --engine auto`);
    }
    throw error;
  }
}

function isTemporaryError(error) {
  const temporaryPatterns = [
    /429/i, // Rate limit
    /503/i, // Service unavailable
    /502/i, // Bad gateway
    /timeout/i, // Timeout
    /network/i, // Network error
    /temporarily/i, // Temporary errors
  ];

  return temporaryPatterns.some(
    (pattern) => pattern.test(error.message) || pattern.test(error.code),
  );
}
