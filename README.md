# TaskFoundry 🛠️

Generate task content from your Git diffs — in Markdown or JSON — powered by OpenAI or your own local model.

---

## ✨ Features

- 🧠 **AI-Powered Task Summaries** from your Git changes
- 🔀 Support for **staged** or latest commit diffs
- 🧾 Output in **Markdown** (default) or **JSON**
- 🤖 Use either **OpenAI** or your **own local model**
- ⚡ Fast and CLI-friendly — built for dev workflows

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
| `--engine`          | Engine to use: `openai` or `local`             |

### Examples

```bash
# Generate a task from latest commit diff
create-task

# Use staged files instead
create-task --staged

# Output as JSON
create-task --output json

# Use a local model
create-task --engine local
```

---

## 🔐 OpenAI Setup

To use the `openai` engine, create a `.env` file:

```
OPENAI_API_KEY=your-api-key-here
```

> You'll need access to GPT-4 or a capable model.

---

## 🤖 Local Model Support

This project supports local inference via a stub. You can connect it to:

- [ollama](https://ollama.com/) with models like `mistral` or `codellama`
- Custom wrappers around [llama.cpp](https://github.com/ggerganov/llama.cpp)

Update `src/engines/localEngine.js` to hook in your preferred model.

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
  "technical_considerations": "Introduced helper to decode JWT. Ensure compatibility with existing clients."
}
```

---

## 📦 Development

```bash
# Clone the repo
npm install
npm link  # Makes 'create-task' globally available
```

---

## 📄 License

MIT — happy tasking!

---

## 💡 Inspiration

TaskFoundry was built to speed up dev documentation and reduce the burden of writing Azure DevOps tickets manually.

---

## ✍🏽 Contribute

Have ideas or want to add a local model integration? PRs welcome!

---
