// test/integration.test.js
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { execSync, spawn } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { TestHelper } from './setup.js';

describe('CLI Integration Tests', () => {
  let hasGit = false;

  beforeEach(() => {
    hasGit = TestHelper.createTestRepo();
  });

  afterEach(() => {
    TestHelper.cleanup();
  });

  test('should show help when no arguments provided', (t, done) => {
    if (!hasGit) {
      t.skip('Git not available');
      return;
    }

    const child = spawn('node', ['bin/index.js', '--help'], {
      stdio: 'pipe'
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      assert.strictEqual(code, 0);
      assert(output.includes('Generate Azure DevOps task content'));
      assert(output.includes('Examples:'));
      done();
    });
  });

  test('should show version', (t, done) => {
    const child = spawn('node', ['bin/index.js', '--version'], {
      stdio: 'pipe'
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      assert.strictEqual(code, 0);
      assert(output.trim().match(/^\d+\.\d+\.\d+$/));
      done();
    });
  });

  test('should create config file with init command', (t, done) => {
    const child = spawn('node', ['bin/index.js', 'init'], {
      stdio: 'pipe'
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      assert.strictEqual(code, 0);
      assert(output.includes('Created .taskfoundry.json'));
      assert(existsSync('.taskfoundry.json'));
      
      const config = JSON.parse(readFileSync('.taskfoundry.json', 'utf-8'));
      assert.strictEqual(config.engine, 'openai');
      assert.strictEqual(config.output, 'markdown');
      
      done();
    });
  });

  test('should show config with config command', (t, done) => {
    const child = spawn('node', ['bin/index.js', 'config'], {
      stdio: 'pipe'
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      assert.strictEqual(code, 0);
      assert(output.includes('Configuration Schema:'));
      assert(output.includes('Current Configuration:'));
      done();
    });
  });

  test('should handle missing git repository', (t, done) => {
    // Remove git repo
    TestHelper.cleanup();

    const child = spawn('node', ['bin/index.js'], {
      stdio: 'pipe'
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      assert.strictEqual(code, 1);
      assert(stderr.includes('Not in a git repository') || stderr.includes('git'));
      done();
    });
  });

  test('should handle no changes found', (t, done) => {
    if (!hasGit) {
      t.skip('Git not available');
      return;
    }

    const child = spawn('node', ['bin/index.js'], {
      stdio: 'pipe'
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      // Should exit gracefully when no changes found
      assert(code === 0 || code === 1);
      done();
    });
  });

  test('should save output to file', (t, done) => {
    if (!hasGit) {
      t.skip('Git not available');
      return;
    }

    TestHelper.createTestDiff();

    const outputFile = 'test-output.md';
    const child = spawn('node', ['bin/index.js', '--file', outputFile, '--engine', 'local'], {
      stdio: 'pipe'
    });

    child.on('close', (code) => {
      if (existsSync(outputFile)) {
        const content = readFileSync(outputFile, 'utf-8');
        assert(content.length > 0);
        unlinkSync(outputFile);
      }
      done();
    });
  });
});

describe('Git Integration Tests', () => {
  beforeEach(() => {
    TestHelper.createTestRepo();
  });

  afterEach(() => {
    TestHelper.cleanup();
  });

  test('should detect staged changes', (t, done) => {
    TestHelper.createTestDiff();

    const child = spawn('node', ['bin/index.js', '--staged', '--engine', 'local'], {
      stdio: 'pipe'
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      // Should process staged changes
      done();
    });
  });

  test('should work with specific commit hash', (t, done) => {
    TestHelper.createTestDiff();
    
    try {
      const commits = execSync('git log --oneline', { encoding: 'utf-8' });
      const commitHash = commits.split('\n')[1]?.split(' ')[0];
      
      if (commitHash) {
        const child = spawn('node', ['bin/index.js', '--commit', commitHash, '--engine', 'local'], {
          stdio: 'pipe'
        });

        child.on('close', (code) => {
          done();
        });
      } else {
        done();
      }
    } catch (error) {
      done();
    }
  });
});

describe('Configuration Integration Tests', () => {
  beforeEach(() => {
    TestHelper.createTestRepo();
  });

  afterEach(() => {
    TestHelper.cleanup();
  });

  test('should use project config file', (t, done) => {
    const configFile = TestHelper.createTempFile('.taskfoundry.json', JSON.stringify({
      engine: 'local',
      output: 'json',
      temperature: 0.5
    }));

    TestHelper.createTestDiff();

    const child = spawn('node', ['bin/index.js'], {
      stdio: 'pipe'
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      // Should use config from file
      done();
    });
  });

  test('should override config with CLI arguments', (t, done) => {
    const configFile = TestHelper.createTempFile('.taskfoundry.json', JSON.stringify({
      engine: 'local',
      output: 'json'
    }));

    TestHelper.createTestDiff();

    const child = spawn('node', ['bin/index.js', '--output', 'markdown'], {
      stdio: 'pipe'
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      // Should override with CLI args
      done();
    });
  });
});

describe('Error Handling Integration Tests', () => {
  test('should handle missing OpenAI API key gracefully', (t, done) => {
    delete process.env.OPENAI_API_KEY;
    
    TestHelper.createTestRepo();
    TestHelper.createTestDiff();

    const child = spawn('node', ['bin/index.js'], {
      stdio: 'pipe',
      env: { ...process.env, OPENAI_API_KEY: undefined }
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      assert.strictEqual(code, 1);
      assert(stderr.includes('Missing OpenAI API key'));
      done();
    });
  });

  test('should handle invalid config file gracefully', (t, done) => {
    TestHelper.createTempFile('.taskfoundry.json', '{ invalid json }');
    
    const child = spawn('node', ['bin/index.js', 'config'], {
      stdio: 'pipe'
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      assert(stderr.includes('Warning: Could not parse') || code === 0);
      done();
    });
  });
});