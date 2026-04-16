import { beforeEach, afterEach } from "node:test";
import { execSync } from "child_process";
import { writeFileSync, existsSync, mkdtempSync, rmSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Test utilities
export class TestHelper {
  static tempFiles = [];
  static tempDir = null;

  static createTempFile(name, content) {
    const basePath = this.tempDir || process.cwd();
    const filePath = join(basePath, name);
    writeFileSync(filePath, content);
    this.tempFiles.push(filePath);
    return filePath;
  }

  static createTestRepo() {
    try {
      if (!this.tempDir) {
        this.tempDir = mkdtempSync(join(tmpdir(), "taskfoundry-test-"));
      }

      execSync("git init --quiet", { cwd: this.tempDir, stdio: "ignore" });
      execSync('git config user.email "test@example.com"', {
        cwd: this.tempDir,
        stdio: "ignore",
      });
      execSync('git config user.name "Test User"', {
        cwd: this.tempDir,
        stdio: "ignore",
      });

      // Create initial commit
      this.createTempFile("README.md", "# Test Project");
      execSync("git add README.md", { cwd: this.tempDir, stdio: "ignore" });
      execSync('git commit -m "Initial commit" --quiet', {
        cwd: this.tempDir,
        stdio: "ignore",
      });

      return true;
    } catch (error) {
      console.warn("Could not create test git repo:", error.message);
      return false;
    }
  }

  static createTestDiff() {
    if (!this.tempDir) {
      this.createTestRepo();
    }
    // Create a meaningful diff for testing
    const testFile = this.createTempFile(
      "test-file.js",
      `
function hello() {
  console.log('Hello World');
}

export default hello;
`,
    );

    execSync("git add test-file.js", { cwd: this.tempDir, stdio: "ignore" });
    execSync('git commit -m "Add hello function" --quiet', {
      cwd: this.tempDir,
      stdio: "ignore",
    });

    // Modify the file to create a diff
    writeFileSync(
      testFile,
      `
function hello(name = 'World') {
  console.log(\`Hello \${name}!\`);
}

function goodbye(name = 'World') {
  console.log(\`Goodbye \${name}!\`);
}

export { hello, goodbye };
`,
    );

    execSync("git add test-file.js", { cwd: this.tempDir, stdio: "ignore" });
  }

  static cleanup() {
    // Clean up individual temp files
    for (const file of this.tempFiles) {
      if (existsSync(file)) {
        try {
          unlinkSync(file);
        } catch (e) {
          // Ignore errors
        }
      }
    }

    // Clean up temp dir if it exists
    if (this.tempDir && existsSync(this.tempDir)) {
      try {
        rmSync(this.tempDir, { recursive: true, force: true });
      } catch (error) {
        console.log("Cleanup failed:", error.message);
      }
    }
    this.tempDir = null;
    this.tempFiles = [];
  }
}

// Mock OpenAI responses
export const mockOpenAIResponse = {
  choices: [
    {
      message: {
        content: `**Title**: Add hello function and improve greeting
**Summary**: Added a new hello function with parameter support and created a goodbye function for better user interaction
**Technical considerations**: Used template literals for string interpolation and default parameters for backward compatibility`,
      },
    },
  ],
};

// Environment setup
beforeEach(() => {
  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.OPENAI_API_KEY = "test-key";
});

afterEach(() => {
  TestHelper.cleanup();
});
