import { callFreeTier } from './freeTierEngine.js';

export async function callAuto(diff, engineConfig = {}) {
    const engines = ["groq", "openai", "freetier"];
    
    for (const engine of engines) {
      try {
        switch (engine) {
          case "groq":
            if (process.env.GROQ_API_KEY) {
              console.log("Using your Groq API key...");
              const { callGroq } = await import('./groqEngine.js');
              return await callGroq(diff, { ...engineConfig, engine: "groq" });
            }
            break;
            
          case "openai":
            if (process.env.OPENAI_API_KEY) {
              console.log("Using your OpenAI API key...");
              const { callOpenAI } = await import('./openaiEngine.js');
              return await callOpenAI(diff, { ...engineConfig, engine: "openai" });
            }
            break;
            
          case "freetier":
            console.log("Using TaskFoundry free tier...");
            return await callFreeTier(diff, { ...engineConfig, engine: "freetier" });
        }
      } catch (error) {
        if (engine === "freetier") {
          // If free tier fails, throw the error (it's the last option)
          throw error;
        }
        console.log(`${engine} engine unavailable: ${error.message}`);
        continue;
      }
    }
    
    throw new Error("All engines failed. Please check your configuration.");
  }