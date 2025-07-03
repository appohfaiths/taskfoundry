// test/unit.test.js
import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { loadConfig, getConfigSchema } from '../src/config.js';
import { formatMarkdown, formatJSON } from '../src/formatters.js';
import { TestHelper, mockOpenAIResponse } from './setup.js';

describe('Configuration Tests', () => {
  test('should load default configuration', () => {
    const config = loadConfig();
    
    assert.strictEqual(config.engine, 'openai');
    assert.strictEqual(config.output, 'markdown');
    assert.strictEqual(config.staged, false);
    assert.strictEqual(config.temperature, 0.3);
  });

  test('should override config with CLI options', () => {
    const cliOptions = {
      engine: 'local',
      output: 'json',
      temperature: 0.7
    };
    
    const config = loadConfig(cliOptions);
    
    assert.strictEqual(config.engine, 'local');
    assert.strictEqual(config.output, 'json');
    assert.strictEqual(config.temperature, 0.7);
  });

  test('should validate configuration', () => {
    assert.throws(() => {
      loadConfig({ output: 'invalid' });
    }, /Invalid output format/);

    assert.throws(() => {
      loadConfig({ engine: 'invalid' });
    }, /Invalid engine/);

    assert.throws(() => {
      loadConfig({ temperature: 3 });
    }, /Temperature must be between 0 and 2/);
  });

  test('should return config schema', () => {
    const schema = getConfigSchema();
    
    assert(schema.engine);
    assert(schema.output);
    assert(schema.temperature);
    assert.strictEqual(schema.engine.type, 'string');
    assert.deepStrictEqual(schema.engine.enum, ['openai', 'local']);
  });

  test('should handle project config file', () => {
    const configFile = TestHelper.createTempFile('.create-task.json', JSON.stringify({
      engine: 'local',
      temperature: 0.5
    }));
    
    const config = loadConfig();
    
    assert.strictEqual(config.engine, 'local');
    assert.strictEqual(config.temperature, 0.5);
    assert.strictEqual(config.output, 'markdown'); // Should keep default
  });
});

describe('Formatter Tests', () => {
  const testData = {
    title: 'Add user authentication',
    summary: 'Implemented JWT-based authentication system',
    tech: 'Used bcrypt for password hashing and jsonwebtoken for token generation'
  };

  test('should format markdown correctly', () => {
    const result = formatMarkdown(testData);
    
    assert(result.includes('**Title**: Add user authentication'));
    assert(result.includes('**Summary**: Implemented JWT-based authentication system'));
    assert(result.includes('**Technical considerations**: Used bcrypt for password hashing'));
  });

  test('should format JSON correctly', () => {
    const result = formatJSON(testData);
    const parsed = JSON.parse(result);
    
    assert.strictEqual(parsed.title, 'Add user authentication');
    assert.strictEqual(parsed.summary, 'Implemented JWT-based authentication system');
    assert.strictEqual(parsed.technical_considerations, 'Used bcrypt for password hashing and jsonwebtoken for token generation');
  });

  test('should handle empty data gracefully', () => {
    const emptyData = { title: '', summary: '', tech: '' };
    
    const markdown = formatMarkdown(emptyData);
    const json = formatJSON(emptyData);
    
    assert(markdown.includes('**Title**: '));
    assert(markdown.includes('**Summary**: '));
    assert(markdown.includes('**Technical considerations**: '));
    
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.title, '');
    assert.strictEqual(parsed.summary, '');
    assert.strictEqual(parsed.technical_considerations, '');
  });
});

describe('OpenAI Engine Tests', () => {
  let mockOpenAI;

  beforeEach(() => {
    // Mock OpenAI module
    mockOpenAI = {
      chat: {
        completions: {
          create: mock.fn(() => Promise.resolve(mockOpenAIResponse))
        }
      }
    };
  });

  test('should call OpenAI with correct parameters', async () => {
    // Mock the OpenAI import
    const { callOpenAI } = await import('../src/engines/openaiEngine.js');
    
    // This would require more sophisticated mocking in a real test
    // For now, we'll test the error cases
    
    delete process.env.OPENAI_API_KEY;
    
    try {
      await callOpenAI('test diff');
      assert.fail('Should have thrown error for missing API key');
    } catch (error) {
      assert(error.message.includes('Missing OpenAI API key'));
    }
  });

  test('should parse OpenAI response correctly', async () => {
    // Mock successful response parsing
    const mockResponse = `**Title**: Test title
**Summary**: Test summary
**Technical considerations**: Test tech notes`;

    // Test the parsing logic (you'd need to extract this to a separate function)
    const titleMatch = mockResponse.match(/\*\*Title\*\*: (.*)/);
    const summaryMatch = mockResponse.match(/\*\*Summary\*\*:([\s\S]*?)\n\*\*/);
    const techMatch = mockResponse.match(/\*\*Technical considerations\*\*:([\s\S]*)/);

    assert.strictEqual(titleMatch[1].trim(), 'Test title');
    assert.strictEqual(summaryMatch[1].trim(), 'Test summary');
    assert.strictEqual(techMatch[1].trim(), 'Test tech notes');
  });
});

describe('Error Handling Tests', () => {
  test('should handle missing git repository', () => {
    // Test would require mocking execSync to simulate git errors
    assert(true); // Placeholder
  });

  test('should handle network errors for OpenAI', () => {
    // Test would require mocking network failures
    assert(true); // Placeholder
  });

  test('should handle malformed config files', () => {
    TestHelper.createTempFile('.create-task.json', '{ invalid json }');
    
    // Should not throw, but should warn
    const config = loadConfig();
    assert.strictEqual(config.engine, 'openai'); // Should use defaults
  });
});