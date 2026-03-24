import { AIProvider } from './AIProvider.js';
import { parseAIResponse } from './parse.js';

export class ClaudeProvider extends AIProvider {
  constructor(apiKey) {
    super('claude', apiKey, 15000);
  }

  async generateCommitMessages(prompt, options) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

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
