import { AIProvider } from './AIProvider.js';
import { parseAIResponse } from './parse.js';

export class OpenAIProvider extends AIProvider {
  constructor(apiKey, config = {}) {
    super('openai', apiKey, 12000);
    this.model = config.openaiModel || 'gpt-4o-mini';
    this.timeout = config.timeout || 30000;
  }

  async generateCommitMessages(prompt, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
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
      if (status === 401) throw new Error('Invalid API key for OpenAI');
      if (status === 429) throw new Error('Rate limited. Please try again later');
      throw new Error(`OpenAI API error (${status}). Please try again`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (choice?.finish_reason === 'content_filter') {
      throw new Error('OpenAI blocked this request (content filter)');
    }

    // content_filter나 도구 호출 응답에서는 content가 null일 수 있다.
    const text = choice?.message?.content;
    if (!text) {
      throw new Error('OpenAI returned an empty response. Please try again');
    }

    return parseAIResponse(text, options.maxSuggestions);
  }
}
