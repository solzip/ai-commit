export class AIProvider {
  constructor(name, apiKey, maxDiffLength) {
    if (new.target === AIProvider) {
      throw new Error('AIProvider is abstract and cannot be instantiated directly');
    }
    this.name = name;
    this.apiKey = apiKey;
    this.maxDiffLength = maxDiffLength;
  }

  async generateCommitMessages(prompt, options) {
    throw new Error('generateCommitMessages() must be implemented');
  }
}
