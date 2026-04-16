import { loadConfig } from "./src/config.js";
console.log(JSON.stringify(loadConfig({ engine: "openai" }), null, 2));
