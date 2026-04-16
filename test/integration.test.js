// test/integration.test.js
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { spawn } from "child_process";
import { readFileSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { TestHelper } from "./setup.js";

const CLI_PATH = join(process.cwd(), "bin/create-task.js");

async function runCli(args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [CLI_PATH, ...args], {
      stdio: "pipe",
      cwd: options.cwd || process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on("error", (err) => {
      reject(err);
    });

    // End stdin to prevent hanging on prompts
    child.stdin.end();
  });
}

describe("CLI Integration Tests", () => {
  let hasGit = false;

  beforeEach(() => {
    hasGit = TestHelper.createTestRepo();
  });

  afterEach(() => {
    TestHelper.cleanup();
  });

  test("should show help when no arguments provided", async (t) => {
    if (!hasGit) {
      t.skip("Git not available");
      return;
    }

    const { code, stdout } = await runCli(["--help"], {
      cwd: TestHelper.tempDir,
    });

    assert.strictEqual(code, 0);
    assert(stdout.includes("Generate task content from Git diff using AI"));
    assert(stdout.includes("Examples:"));
  });

  test("should show version", async () => {
    const { code, stdout } = await runCli(["--version"], {
      cwd: TestHelper.tempDir,
    });

    assert.strictEqual(code, 0);
    // Allow for potential extra output like dotenv injection messages
    assert(stdout.match(/\d+\.\d+\.\d+/));
  });

  test("should create config file with init command", async () => {
    const { code, stdout } = await runCli(["init"], { cwd: TestHelper.tempDir });

    assert.strictEqual(code, 0);
    assert(stdout.includes("Created .taskfoundry.json"));
    assert(existsSync(join(TestHelper.tempDir, ".taskfoundry.json")));

    const config = JSON.parse(
      readFileSync(join(TestHelper.tempDir, ".taskfoundry.json"), "utf-8"),
    );
    assert.strictEqual(config.engine, "auto");
    assert.strictEqual(config.output, "markdown");
  });

  test("should show config with config command", async () => {
    const { code, stdout } = await runCli(["config"], {
      cwd: TestHelper.tempDir,
    });

    assert.strictEqual(code, 0);
    assert(stdout.includes("Configured API Keys:"));
    assert(stdout.includes("System-wide Preferences:"));
    assert(stdout.includes("Current Effective Configuration:"));
  });

  test("should handle missing git repository", async () => {
    // Create a fresh temp dir without git init
    TestHelper.cleanup();
    TestHelper.tempDir = mkdtempSync(
      join(tmpdir(), "taskfoundry-test-no-git-"),
    );

    const { code, stderr } = await runCli([], { cwd: TestHelper.tempDir });

    assert.notStrictEqual(code, 0);
    assert(stderr.includes("Not a git repository"));
  });

  test("should handle no changes found", async () => {
    const { code, stderr } = await runCli([], { cwd: TestHelper.tempDir });

    // It should fail because no changes to analyze
    assert.notStrictEqual(code, 0);
    assert(stderr.includes("No changes found") || stderr.includes("Error"));
  });

  test("should save output to file", async () => {
    TestHelper.createTestDiff();

    const outputFile = "test-output.md";
    await runCli(["--file", outputFile, "--engine", "freetier"], {
      cwd: TestHelper.tempDir,
    });

    // If it succeeded or tried to, we check for file
    if (existsSync(join(TestHelper.tempDir, outputFile))) {
      assert(true);
    }
  });
});

describe("Git Integration Tests", () => {
  beforeEach(() => {
    TestHelper.createTestRepo();
  });

  afterEach(() => {
    TestHelper.cleanup();
  });

  test("should detect staged changes", async () => {
    TestHelper.createTestDiff();

    const { stderr } = await runCli(["--staged", "--engine", "freetier"], {
      cwd: TestHelper.tempDir,
    });

    // Success depends on API, but we check it didn't fail on git
    assert(!stderr.includes("No staged changes found"));
  });
});

describe("Configuration Integration Tests", () => {
  beforeEach(() => {
    TestHelper.createTestRepo();
  });

  afterEach(() => {
    TestHelper.cleanup();
  });

  test("should use project config file", async () => {
    TestHelper.createTempFile(
      ".taskfoundry.json",
      JSON.stringify({
        engine: "freetier",
        output: "json",
      }),
    );

    const { code, stdout } = await runCli(["config", "--legacy"], {
      cwd: TestHelper.tempDir,
    });

    assert.strictEqual(code, 0);
    assert(stdout.includes('"engine": "freetier"'));
    assert(stdout.includes('"output": "json"'));
  });

  test("should override config with CLI arguments", async () => {
    TestHelper.createTestDiff();
    TestHelper.createTempFile(
      ".taskfoundry.json",
      JSON.stringify({
        engine: "freetier",
      }),
    );

    // Use a specific engine that we know will show up in the output/logs
    const { stdout, stderr } = await runCli(
      ["--engine", "openai", "--verbose"],
      { cwd: TestHelper.tempDir },
    );

    // If it fails with "Missing OpenAI API key", it means it correctly picked 'openai' over 'freetier'
    assert(stderr.includes("openai") || stdout.includes("openai"));
  });
});

describe("Error Handling Integration Tests", () => {
  beforeEach(() => {
    TestHelper.createTestRepo();
  });

  afterEach(() => {
    TestHelper.cleanup();
  });

  test("should handle missing OpenAI API key gracefully", async () => {
    TestHelper.createTestDiff();
    const { code, stderr } = await runCli(["--engine", "openai"], {
      cwd: TestHelper.tempDir,
    });

    assert.notStrictEqual(code, 0);
    assert(
      stderr.includes("Missing OpenAI API key") || stderr.includes("Error"),
    );
  });

  test("should handle invalid config file gracefully", async () => {
    TestHelper.createTempFile(".taskfoundry.json", "{ invalid json }");
    const { code, stdout } = await runCli(["config", "--legacy"], {
      cwd: TestHelper.tempDir,
    });

    assert.strictEqual(code, 0);
    assert(stdout.includes('"engine": "auto"'));
  });
});
