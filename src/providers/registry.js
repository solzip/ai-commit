import { ClaudeProvider } from './claude.js';
import { OpenAIProvider } from './openai.js';

const providers = new Map();

export function registerProvider(name, ProviderClass) {
  providers.set(name, ProviderClass);
}

export function getProvider(name, apiKey) {
  const ProviderClass = providers.get(name);
  if (!ProviderClass) {
    const available = getAvailableProviders().join(', ');
    throw new Error(`Unknown provider: ${name}. Available: ${available}`);
  }
  return new ProviderClass(apiKey);
}

export function getAvailableProviders() {
  return [...providers.keys()];
}

export function registerBuiltInProviders() {
  registerProvider('claude', ClaudeProvider);
  registerProvider('openai', OpenAIProvider);
}
