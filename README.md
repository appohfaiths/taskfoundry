# TaskFoundry 🛠️

Generate task content from your Git diffs — in Markdown or JSON — powered by OpenAI, Groq, or your own local model.

---

## ✨ Features

- 🧠 **AI-Powered Task Summaries** from your Git changes
- 🔀 Support for **staged** or latest commit diffs
- 🧾 Output in **Markdown** (default) or **JSON**
- 🤖 Use **OpenAI**, **Groq** (recommended), or your **own local model**
- ⚡ Fast and CLI-friendly — built for dev workflows
- 🆓 **Free tier available** with Groq

---

## 🚀 Installation

```bash
npm install -g taskfoundry
```

---

## 🛠️ Usage

```bash
create-task [options]
```

### Options

| Flag                | Description                                     |
|---------------------|-------------------------------------------------|
| `--staged`          | Use staged changes (`git diff --cached`)       |
| `--output`          | Format: `markdown` (default) or `json`         |
| `--engine`          | Engine: `groq` (recommended), `openai`, or `local` |
| `--model`           | AI model to use (optional)                     |
| `--temperature`     | AI temperature (0-2, default: 0.3)             |
| `--file`            | Save output to file instead of stdout          |
| `--verbose`         | Enable verbose logging                          |

### Examples

```bash
# Generate a task from latest commit diff (uses Groq by default)
create-task

# Use staged files instead
create-task --staged

# Output as JSON
create-task --output json

# Use OpenAI engine
create-task --engine openai

# Use a local model
create-task --engine local

# Save to file
create-task --file task.md
```

---

## 🔐 API Setup

### Groq (Recommended) 🌟

Groq offers a generous free tier and fast inference. Create a `.env` file:

```
GROQ_API_KEY=your-groq-api-key-here
```

Get your free API key at [console.groq.com](https://console.groq.com)

### OpenAI

To use the `openai` engine, create a `.env` file:

```
OPENAI_API_KEY=your-openai-api-key-here
```

### Local Model

For local inference, set up your endpoint:

```
LOCAL_MODEL_ENDPOINT=http://localhost:11434
```

---

## 🤖 Local Model Support

This project supports local inference via a stub. You can connect it to:

- [ollama](https://ollama.com/) with models like `mistral` or `codellama`
- Custom wrappers around [llama.cpp](https://github.com/ggerganov/llama.cpp)

Update `src/engines/localModelEngine.js` to hook in your preferred model.

---

## ⚙️ Configuration

Create a `.taskfoundry.json` file in your project or home directory:

```json
{
  "engine": "groq",
  "output": "markdown",
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.3,
  "includeFileNames": true,
  "excludePatterns": ["*.lock", "node_modules/**"]
}
```

Generate a default config file:

```bash
create-task init
```

---

## 🧪 Sample Output

### Markdown (default)
```
**Title**: Refactor auth service

**Summary**: Simplified token handling logic and added expiry validation.

**Technical considerations**: Introduced helper to decode JWT. Ensure compatibility with existing clients.
```

### JSON
```json
{
  "title": "Refactor auth service",
  "summary": "Simplified token handling logic and added expiry validation.",
  "tech": "Introduced helper to decode JWT. Ensure compatibility with existing clients."
}
```

---

## 📦 Development

```bash
# Clone the repo
npm install
npm link  # Makes 'create-task' globally available

# Run tests
npm test

# Format code
npm run format
```

---

## 📄 License

Apache-2.0 — happy tasking!

---

## 💡 Inspiration

TaskFoundry was built to speed up dev documentation and reduce the burden of writing Azure DevOps tickets manually.

---

## ✍🏽 Contribute

Have ideas or want to add a local model integration? PRs welcome!

---
