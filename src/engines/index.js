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
    // If a specific engine fails with a temporary error, automatically fallback to auto
    if (engine !== "auto" && isTemporaryError(error)) {
      console.log(
        `\n⚠️  ${engine} is temporarily unavailable (${getErrorType(error)}), falling back to auto mode...`,
      );

      try {
        // Automatically fallback to auto mode
        return await callAuto(diff, { ...config, engine: "auto" });
      } catch (error) {
        // If a specific engine fails with a temporary error, automatically fallback to auto
        if (engine !== "auto" && isTemporaryError(error)) {
          console.log(
            `\n⚠️  ${engine} is temporarily unavailable (${getErrorType(error)}), falling back to auto mode...`,
          );

          try {
            // Automatically fallback to auto mode
            return await callAuto(diff, { ...config, engine: "auto" });
          } catch (autoError) {
            console.log(`\n❌ Auto fallback also failed: ${autoError.message}`);
            console.log(`\n💡 Suggestions:`);
            console.log(`   • Wait a few minutes and try again`);
            console.log(`   • Check your API key quotas/limits`);
            console.log(`   • Set up additional API keys: create-task setup`);
            throw error; // Throw original error, not auto error
          }
        }

        // For non-temporary errors or auto engine failures, just throw
        throw error;
      }
    }

    // For non-temporary errors or auto engine failures, just throw
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
    /rate limit/i, // Rate limit variations
    /quota/i, // Quota exceeded
  ];

  return temporaryPatterns.some(
    (pattern) => pattern.test(error.message) || pattern.test(error.code),
  );
}

function getErrorType(error) {
  if (/429/i.test(error.message) || /rate limit/i.test(error.message))
    return "rate limited";
  if (/503/i.test(error.message)) return "service unavailable";
  if (/502/i.test(error.message)) return "server error";
  if (/timeout/i.test(error.message)) return "timeout";
  if (/network/i.test(error.message)) return "network error";
  if (/quota/i.test(error.message)) return "quota exceeded";
  return "error";
}
