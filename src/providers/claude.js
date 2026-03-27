import { AIProvider } from './AIProvider.js';
import { parseAIResponse } from './parse.js';

export class ClaudeProvider extends AIProvider {
  constructor(apiKey, config = {}) {
    super('claude', apiKey, 15000);
    this.model = config.claudeModel || 'claude-sonnet-4-20250514';
    this.timeout = config.timeout || 30000;
  }

  async generateCommitMessages(prompt, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection');
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const status = response.status;
      if (status === 401) throw new Error('Invalid API key for Claude');
      if (status === 429) throw new Error('Rate limited. Please try again later');
      throw new Error(`Claude API error (${status}). Please try again`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    return parseAIResponse(text, options.maxSuggestions);
  }
}
