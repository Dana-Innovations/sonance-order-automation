/**
 * Anthropic Claude API Client
 *
 * This module provides a configured Anthropic client for generating
 * AI prompts in the Prompt Builder feature.
 *
 * Model: Claude 3.5 Sonnet - Optimized for prompt engineering tasks
 *
 * Usage:
 * ```typescript
 * import { anthropic, CLAUDE_MODEL, MAX_TOKENS } from '@/lib/ai/anthropic';
 *
 * const response = await anthropic.messages.create({
 *   model: CLAUDE_MODEL,
 *   max_tokens: MAX_TOKENS,
 *   messages: [{ role: 'user', content: 'Generate prompts...' }]
 * });
 * ```
 */

import Anthropic from '@anthropic-ai/sdk';

// Validate API key is present
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error(
    'ANTHROPIC_API_KEY environment variable is not set. ' +
    'Please add it to your .env.local file.'
  );
}

/**
 * Anthropic client instance
 * Configured with API key from environment variables
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Claude model to use for prompt generation
 * Claude 3.5 Sonnet excels at prompt engineering and structured output
 */
export const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

/**
 * Maximum tokens for prompt generation responses
 * 4096 tokens allows for detailed, comprehensive prompts
 */
export const MAX_TOKENS = 4096;

/**
 * Token costs for Claude 3.5 Sonnet (as of 2024)
 * Used for cost estimation in the UI
 */
export const COST_PER_INPUT_TOKEN = 0.000003; // $0.003 per 1K tokens
export const COST_PER_OUTPUT_TOKEN = 0.000015; // $0.015 per 1K tokens

/**
 * Calculate estimated cost for a Claude API call
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Estimated cost in USD
 */
export function estimateClaudeCost(
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = inputTokens * COST_PER_INPUT_TOKEN;
  const outputCost = outputTokens * COST_PER_OUTPUT_TOKEN;
  return inputCost + outputCost;
}
