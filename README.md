# TaskFoundry 🛠️

Generate task content and commit messages from your Git diffs — in Markdown or JSON — powered by OpenAI, Groq, or your own local model.

---

## ✨ Features

- 🧠 **AI-Powered Task Summaries** from your Git changes
- 📝 **Conventional Commit Messages** generated from staged changes
- 🔀 Support for **staged** or latest commit diffs
- 🧾 Output in **Markdown** (default) or **JSON**
- 🤖 Use **OpenAI**, **Groq** (recommended), or your **own local model**
- ⚡ Fast and CLI-friendly — built for dev workflows
- 🆓 **Free tier available** with Groq
- 📝 **Concise or detailed** task descriptions

---

## 🚀 Installation

```bash
npm install -g taskfoundry
```

---

## 🛠️ Usage

TaskFoundry provides two main commands:

### 📋 Task Generation

```bash
create-task [options]
```

#### Options

| Flag                | Description                                     |
|---------------------|-------------------------------------------------|
| `--staged`          | Use staged changes (`git diff --cached`)       |
| `--output`          | Format: `markdown` (default) or `json`         |
| `--engine`          | Engine: `groq` (recommended), `openai`, or `local` |
| `--model`           | AI model to use (optional)                     |
| `--temperature`     | AI temperature (0-2, default: 0.3)             |
| `--file`            | Save output to file instead of stdout          |
| `--detailed`        | Generate comprehensive task descriptions        |
| `--verbose`         | Enable verbose logging                          |

#### Examples

```bash
# Generate a task from latest commit diff (uses Groq by default)
create-task

# Use staged files instead
create-task --staged

# Generate detailed task description
create-task --detailed

# Output as JSON with detailed description
create-task --detailed --output json

# Use with a specific engine
create-task --engine groq

# Use a local model
create-task --engine local

# Output a detailed markdown tasks using groq
create-task --staged --engine groq --detailed --output markdown

# Save to file
create-task --file task.md
```

### 💬 Commit Message Generation

```bash
create-commit [options]
```

#### Options

| Flag                | Description                                     |
|---------------------|-------------------------------------------------|
| `--type`            | Commit type: `feat`, `fix`, `docs`, `style`, etc. |
| `--scope`           | Commit scope (optional)                        |
| `--breaking`        | Mark as breaking change                        |
| `--engine`          | Engine: `groq` (recommended), `openai`, or `local` |
| `--model`           | AI model to use (optional)                     |
| `--temperature`     | AI temperature (0-2, default: 0.2)             |
| `--file`            | Save commit message to file instead of stdout  |
| `--copy`            | Copy commit message to clipboard (macOS only)  |
| `--verbose`         | Enable verbose logging                          |

#### Examples

```bash
# Generate commit message from staged changes
create-commit

# Specify commit type
create-commit --type feat

# Add scope and mark as breaking change
create-commit --type feat --scope api --breaking

# Save to file for editing before commit
create-commit --file commit-message.txt

# Copy to clipboard (macOS)
create-commit --copy

# Use different engine
create-commit --engine openai --type docs
```

#### Commit Types

| Type       | Description                                                    |
|------------|----------------------------------------------------------------|
| `feat`     | A new feature                                                  |
| `fix`      | A bug fix                                                      |
| `docs`     | Documentation only changes                                     |
| `style`    | Changes that do not affect the meaning of the code            |
| `refactor` | A code change that neither fixes a bug nor adds a feature     |
| `perf`     | A code change that improves performance                        |
| `test`     | Adding missing tests or correcting existing tests             |
| `chore`    | Changes to the build process or auxiliary tools               |
| `ci`       | Changes to CI configuration files and scripts                 |
| `build`    | Changes that affect the build system or external dependencies |

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
  "detailed": false,
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

### Task Generation

#### Concise (default)
```
**Title**: Refactor auth service

**Summary**: Simplified token handling logic and added expiry validation.

**Technical considerations**: Introduced helper to decode JWT. Ensure compatibility with existing clients.
```

#### Detailed (--detailed flag)
```
**Title**: Implement End-to-End Tests for Employee Management Portal

**Summary**: Create comprehensive end-to-end tests using Playwright to validate the Employee Management functionality in the Manage Business section. The tests should verify all critical user flows for managing employees, including adding, viewing, and removing employees.

Test coverage requirements:
- Navigate to Employee management section via Manage Business
- View all employees list with proper table columns validation
- Test filtering and searching functionality
- Employee addition workflow with form validation
- Employee deletion workflow with confirmation
- Verify success messages and error states

**Technical considerations**: Use Playwright as the testing framework with proper test organization using beforeEach setup for common operations. Implement explicit waiting mechanisms for elements and include proper assertions for success messages. Consider adding data cleanup for test isolation, using unique identifiers for test data, and implementing parallel test execution for efficiency. Add appropriate error handling and confirmation dialog testing.
```

#### JSON Format
```json
{
  "title": "Refactor auth service",
  "summary": "Simplified token handling logic and added expiry validation.",
  "tech": "Introduced helper to decode JWT. Ensure compatibility with existing clients."
}
```

### Commit Message Generation

```
feat(auth): add JWT token validation

Implement comprehensive token validation including expiry checks and signature verification to improve security and prevent unauthorized access.
```

With breaking change:
```
feat(api)!: restructure user authentication endpoints

BREAKING CHANGE: Authentication endpoints now require API version in headers and return different response structure.
```

---

## 🔄 Workflow Integration

### Typical Development Workflow

```bash
# 1. Stage your changes
git add .

# 2. Generate and review commit message
create-commit --type feat --scope api --file commit-msg.txt

# 3. Edit if needed, then commit
git commit -F commit-msg.txt

# 4. Generate task description for your work item
create-task --staged --detailed --file task.md

# 5. Copy task content to your project management tool
```

### Integration with Git Hooks

You can integrate TaskFoundry into your git workflow:

```bash
# .git/hooks/prepare-commit-msg
#!/bin/sh
if [ -z "$2" ]; then
  create-commit --file "$1"
fi
```

---

## 📦 Development

```bash
# Clone the repo
npm install
npm link  # Makes 'create-task' and 'create-commit' globally available

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

TaskFoundry was built to speed up dev documentation and reduce the burden of writing DevOps tickets and commit messages manually.

---

## ✍🏽 Contribute

Have ideas or want to add a local model integration? PRs welcome! Or drop me a message.

---