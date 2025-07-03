import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { loadConfig } from './config.js';

const COMMIT_TYPES = {
  feat: 'A new feature',
  fix: 'A bug fix',
  docs: 'Documentation only changes',
  style: 'Changes that do not affect the meaning of the code (white-space, formatting, etc)',
  refactor: 'A code change that neither fixes a bug nor adds a feature',
  perf: 'A code change that improves performance',
  test: 'Adding missing tests or correcting existing tests',
  chore: 'Changes to the build process or auxiliary tools and libraries',
  ci: 'Changes to CI configuration files and scripts',
  build: 'Changes that affect the build system or external dependencies'
};

export async function generateCommitMessage(options) {
  try {
    // Check if we're in a git repository
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    } catch {
      throw new Error('Not a git repository');
    }

    // Check for staged changes
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' }).trim();
    if (!stagedFiles) {
      throw new Error('No staged changes found. Use "git add" to stage files first.');
    }

    // Get staged diff
    const diff = execSync('git diff --cached', { encoding: 'utf-8' }).trim();
    if (!diff) {
      throw new Error('No staged changes found.');
    }

    // Load configuration
    const config = loadConfig(options);
    
    // Generate commit message using AI
    const commitData = await generateCommitMessageFromDiff(diff, {
      type: options.type,
      scope: options.scope,
      breaking: options.breaking || false,
      engine: options.engine || config.engine,
      model: options.model || config.model,
      temperature: options.temperature || config.temperature
    });

    // Format commit message
    const commitMessage = formatCommitMessage(commitData);

    // Output or save the commit message
    if (options.file) {
      writeFileSync(options.file, commitMessage);
      console.log(`✅ Commit message saved to ${options.file}`);
    } else if (options.copy) {
      // Copy to clipboard on macOS
      try {
        execSync(`echo "${commitMessage.replace(/"/g, '\\"')}" | pbcopy`);
        console.log('✅ Commit message copied to clipboard!');
      } catch {
        console.log('❌ Failed to copy to clipboard. Here\'s your commit message:');
        console.log('─'.repeat(50));
        console.log(commitMessage);
        console.log('─'.repeat(50));
      }
    } else {
      // Just output to console
      console.log('Generated commit message:');
      console.log('─'.repeat(50));
      console.log(commitMessage);
      console.log('─'.repeat(50));
    }

    // Show helpful instructions
    console.log('\n💡 To use this commit message:');
    if (options.file) {
      console.log(`   git commit -F ${options.file}`);
    } else {
      console.log(`   git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
    }

  } catch (error) {
    throw new Error(`Failed to generate commit message: ${error.message}`);
  }
}

async function generateCommitMessageFromDiff(diff, options) {
  // Load the appropriate engine
  let engineModule;
  switch (options.engine) {
    case 'openai':
      engineModule = await import('./engines/openaiEngine.js');
      break;
    case 'groq':
      engineModule = await import('./engines/groqEngine.js');
      break;
    case 'local':
      engineModule = await import('./engines/localModelEngine.js');
      break;
    default:
      throw new Error(`Unknown engine: ${options.engine}`);
  }

  // Create engine config for commit message generation
  const engineConfig = {
    model: options.model,
    temperature: options.temperature || 0.3,
    maxTokens: 500,
    commitMode: true,
    type: options.type,
    scope: options.scope,
    breaking: options.breaking
  };

  // Call the appropriate engine
  let result;
  if (options.engine === 'openai') {
    result = await engineModule.callOpenAI(diff, engineConfig);
  } else if (options.engine === 'groq') {
    result = await engineModule.callGroq(diff, engineConfig);
  } else if (options.engine === 'local') {
    result = await engineModule.callLocalModel(diff, engineConfig);
  }

  return result;
}

function formatCommitMessage(commitData) {
  const { type, scope, description, body, breaking, breakingDescription } = commitData;
  
  let message = type;
  
  if (scope) {
    message += `(${scope})`;
  }
  
  if (breaking) {
    message += '!';
  }
  
  message += `: ${description}`;
  
  if (body && body.trim()) {
    message += `\n\n${body}`;
  }
  
  if (breaking && breakingDescription && breakingDescription.trim()) {
    message += `\n\nBREAKING CHANGE: ${breakingDescription}`;
  }
  
  return message;
}

export function getCommitTypes() {
  return COMMIT_TYPES;
}

export function validateCommitType(type) {
  return Object.keys(COMMIT_TYPES).includes(type);
}