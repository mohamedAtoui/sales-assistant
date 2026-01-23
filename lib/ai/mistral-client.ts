import { createMistral } from '@ai-sdk/mistral';

export const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

export const MISTRAL_MODEL = 'mistral-small-latest';
