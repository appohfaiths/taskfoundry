import { callOpenAI } from "./openaiEngine.js";
import { callGroq } from "./groqEngine.js";
import { callLocalModel } from "./localModelEngine.js";
import { callFreeTier } from "./freeTierEngine.js";
import { callAuto } from "./autoEngine.js";

export async function generateTaskFromDiff(diff, config) {
  const engine = config.engine || "auto";

  switch (engine) {
    case "auto":
      return await callAuto(diff, config);
    case "openai":
      return await callOpenAI(diff, config);
    case "groq":
      return await callGroq(diff, config);
    case "freetier":
      return await callFreeTier(diff, config);
    case "local":
      return await callLocalModel(diff, config);
    default:
      throw new Error(`Unknown engine: ${engine}`);
  }
}
