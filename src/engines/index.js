import { callOpenAI } from "./openaiEngine.js";
import { callGroq } from "./groqEngine.js";
import { callLocalModel } from "./localModelEngine.js";

export async function generateTaskFromDiff(diff, config) {
  const engine = config.engine || "groq";

  switch (engine) {
    case "openai":
      return await callOpenAI(diff, config);
    case "groq":
      return await callGroq(diff, config);
    case "local":
      return await callLocalModel(diff, config);
    default:
      throw new Error(`Unknown engine: ${engine}`);
  }
}
