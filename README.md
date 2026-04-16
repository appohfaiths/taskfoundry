# TaskFoundry 🛠️

TaskFoundry is a powerful CLI tool designed to streamline your development workflow by generating high-quality **task descriptions** and **conventional commit messages** directly from your Git diffs. Powered by AI engines like Groq, OpenAI, or even your local models, TaskFoundry turns raw code changes into meaningful documentation in seconds.

## ✨ Features

- 🤖 **AI-Powered Analysis**: Automatically understands your code changes and summarizes them.
- 📝 **Task Generation**: Create detailed task descriptions in Markdown or JSON format.
- 💬 **Commit Messages**: Generate conventional commit messages from staged changes.
- 🚀 **Multiple Engines**: Support for Groq, OpenAI, Hugging Face, Free Tier, and Local models.
- 🔄 **Automatic Fallback**: Smart engine selection that tries available services if one fails or hits a rate limit.
- ⚙️ **Flexible Configuration**: System-wide preferences, project-level settings, and environment variable support.
- 📋 **Clipboard Support**: Quick-copy commit messages to your clipboard (macOS).

## 🚀 Installation

```bash
npm install -g taskfoundry
# or
pnpm add -g taskfoundry
```

## 🛠️ Quick Start

### 1. Setup API Keys (Optional)
TaskFoundry comes with a free tier, but for unlimited access, it's recommended to set up your own API keys:

```bash
create-task setup
```

### 2. Generate a Task
Create a task description from your last commit:

```bash
create-task
```

Generate from staged changes in JSON format:

```bash
create-task --staged --output json
```

### 3. Generate a Commit Message
Stage your changes first, then run:

```bash
create-commit
```

Or specify a type and scope:

```bash
create-commit --type feat --scope core --copy
```

## 📖 Commands & Aliases

| Command | Alias | Description |
| :--- | :--- | :--- |
| `create-task` | `ct` | Generate task content from Git diff |
| `create-commit` | `cm` | Generate conventional commit message |

### `create-task` Options

- `--staged`: Use staged changes (`git diff --cached`).
- `--commit <hash>`: Compare against a specific commit hash.
- `--output <format>`: Output as `markdown` (default) or `json`.
- `--detailed`: Generate more exhaustive task descriptions.
- `--engine <engine>`: Choose from `auto`, `groq`, `openai`, `freetier`, or `local`.
- `--file <path>`: Save output directly to a file.
- `--retry`: Enable automatic engine fallback on failure.

### `create-commit` Options

- `--type <type>`: Specify commit type (feat, fix, docs, etc.).
- `--scope <scope>`: Add an optional scope to the commit message.
- `--breaking`: Mark as a breaking change.
- `--copy`: Copy the result to clipboard (macOS only).

## ⚙️ Configuration

TaskFoundry looks for configuration in the following order (highest priority first):

1. **CLI Arguments**: `--engine groq --detailed`
2. **Project Config**: `.taskfoundry.json` in your project root.
3. **System Config**: `~/.taskfoundry/config.json` (Managed via `create-task setup`).
4. **Environment Variables**: `GROQ_API_KEY`, `OPENAI_API_KEY`, etc.

### Initialize Project Config

```bash
create-task init
```

### Supported Engines

- **`auto` (Default)**: Tries engines in order: Groq → OpenAI → Hugging Face → Free Tier.
- **`groq`**: Blazing fast inference using Groq LPU.
- **`openai`**: Industry-standard models like GPT-4o.
- **`freetier`**: No setup required! (Limited to 50 requests/day).
- **`local`**: Connect to your own local LLM endpoint (e.g., Ollama).

## 📄 License

Apache-2.0 © [Faith S. Appoh](https://github.com/appohfaiths)
