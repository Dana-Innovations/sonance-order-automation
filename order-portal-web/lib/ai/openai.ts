/**
 * OpenAI Whisper API Client
 *
 * This module provides functions for audio transcription using OpenAI's
 * Whisper model in the Prompt Builder feature.
 *
 * Model: Whisper-1 - Industry-leading speech-to-text accuracy
 * Cost: $0.006 per minute of audio
 *
 * Usage:
 * ```typescript
 * import { transcribeAudio } from '@/lib/ai/openai';
 *
 * const audioBlob = new Blob([audioData], { type: 'audio/webm' });
 * const result = await transcribeAudio(audioBlob);
 * console.log(result.transcript);
 * ```
 */

// Validate API key is present
if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    'OPENAI_API_KEY environment variable is not set. ' +
    'Please add it to your .env.local file.'
  );
}

/**
 * OpenAI API base URL for transcription
 */
const OPENAI_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

/**
 * Whisper model to use for transcription
 */
const WHISPER_MODEL = 'whisper-1';

/**
 * Cost per minute of audio transcription
 * Used for cost estimation in the UI
 */
export const WHISPER_COST_PER_MINUTE = 0.006; // $0.006 per minute

/**
 * Result from audio transcription
 */
export interface TranscriptionResult {
  /** Transcribed text */
  transcript: string;
  /** Detected language code (e.g., 'en', 'es', 'fr') */
  language: string;
  /** Duration of audio in seconds */
  duration: number;
}

/**
 * Transcribe audio blob using OpenAI Whisper API
 *
 * @param audioBlob - Audio file as Blob (webm, wav, mp3 supported)
 * @param language - Optional language code to improve accuracy (e.g., 'en')
 * @returns Transcription result with text, language, and duration
 * @throws Error if transcription fails
 *
 * @example
 * ```typescript
 * const audioBlob = new Blob([recording], { type: 'audio/webm' });
 * const result = await transcribeAudio(audioBlob, 'en');
 * console.log('Transcript:', result.transcript);
 * ```
 */
export async function transcribeAudio(
  audioBlob: Blob,
  language?: string
): Promise<TranscriptionResult> {
  try {
    // Prepare form data with audio file
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', WHISPER_MODEL);

    // Add language hint if provided (improves accuracy)
    if (language) {
      formData.append('language', language);
    }

    // Call OpenAI Whisper API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Whisper API error (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();

    return {
      transcript: data.text || '',
      language: data.language || 'en',
      duration: data.duration || 0,
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error(
      `Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate estimated cost for audio transcription
 * @param durationSeconds - Duration of audio in seconds
 * @returns Estimated cost in USD
 */
export function estimateWhisperCost(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  return durationMinutes * WHISPER_COST_PER_MINUTE;
}

/**
 * Validate audio blob meets requirements
 * @param audioBlob - Audio file to validate
 * @throws Error if validation fails
 */
export function validateAudioBlob(audioBlob: Blob): void {
  const MAX_SIZE = 25 * 1024 * 1024; // 25MB
  const SUPPORTED_TYPES = ['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp3'];

  if (audioBlob.size > MAX_SIZE) {
    throw new Error(`Audio file too large. Maximum size is 25MB.`);
  }

  if (!SUPPORTED_TYPES.includes(audioBlob.type)) {
    throw new Error(
      `Unsupported audio format: ${audioBlob.type}. ` +
      `Supported formats: ${SUPPORTED_TYPES.join(', ')}`
    );
  }
}
