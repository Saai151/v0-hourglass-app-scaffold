import { groq } from '@ai-sdk/groq'

/**
 * Returns the default model for Hourglass audits.
 * Change the model ID here to swap models across the entire app.
 * Reads GROQ_API_KEY from the environment automatically.
 */
export const auditModel = groq('llama-3.3-70b-versatile')

/** Model used by the meeting chat assistant. */
export const chatModel = groq('llama-3.3-70b-versatile')
