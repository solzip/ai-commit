import { AIProvider } from './AIProvider.js';
import { parseAIResponse } from './parse.js';

export class OpenAIProvider extends AIProvider {
  constructor(apiKey) {
    super('openai', apiKey, 12000);
  }

  async generateCommitMessages(prompt, options) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 401) throw new Error('Invalid API key for OpenAI');
      if (status === 429) throw new Error('Rate limited. Please try again later');
      throw new Error(`OpenAI API error (${status}). Please try again`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    return parseAIResponse(text, options.maxSuggestions);
  }
}
