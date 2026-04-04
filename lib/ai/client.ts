import { google } from '@ai-sdk/google'

/**
 * Returns the default model for Hourglass audits.
 * Change the model ID here to swap models across the entire app.
 * Reads GOOGLE_GENERATIVE_AI_API_KEY from the environment automatically.
 */
export const auditModel = google('gemini-2.0-flash')
