import { beforeEach, afterEach } from 'node:test';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

// Test utilities
export class TestHelper {
  static tempFiles = [];
  
  static createTempFile(name, content) {
    const filePath = join(process.cwd(), name);
    writeFileSync(filePath, content);
    this.tempFiles.push(filePath);
    return filePath;
  }
  
  static createTestRepo() {
    try {
      execSync('git init --quiet', { stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { stdio: 'ignore' });
      execSync('git config user.name "Test User"', { stdio: 'ignore' });
      
      // Create initial commit
      this.createTempFile('README.md', '# Test Project');
      execSync('git add README.md', { stdio: 'ignore' });
      execSync('git commit -m "Initial commit" --quiet', { stdio: 'ignore' });
      
      return true;
    } catch (error) {
      console.warn('Could not create test git repo:', error.message);
      return false;
    }
  }
  
  static createTestDiff() {
    // Create a meaningful diff for testing
    const testFile = this.createTempFile('test-file.js', `
function hello() {
  console.log('Hello World');
}

export default hello;
`);
    
    execSync('git add test-file.js', { stdio: 'ignore' });
    execSync('git commit -m "Add hello function" --quiet', { stdio: 'ignore' });
    
    // Modify the file to create a diff
    writeFileSync(testFile, `
function hello(name = 'World') {
  console.log(\`Hello \${name}!\`);
}

function goodbye(name = 'World') {
  console.log(\`Goodbye \${name}!\`);
}

export { hello, goodbye };
`);
    
    execSync('git add test-file.js', { stdio: 'ignore' });
  }
  
  static cleanup() {
    // Clean up temp files
    for (const file of this.tempFiles) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    }
    this.tempFiles = [];
    
    // Clean up git repo
    try {
      execSync('rm -rf .git', { stdio: 'ignore' });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Mock OpenAI responses
export const mockOpenAIResponse = {
  choices: [{
    message: {
      content: `**Title**: Add hello function and improve greeting
**Summary**: Added a new hello function with parameter support and created a goodbye function for better user interaction
**Technical considerations**: Used template literals for string interpolation and default parameters for backward compatibility`
    }
  }]
};

// Environment setup
beforeEach(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.OPENAI_API_KEY = 'test-key';
});

afterEach(() => {
  TestHelper.cleanup();
});